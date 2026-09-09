using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using RestaurantApi.Data;
using RestaurantApi.DTOs;
using RestaurantApi.Hubs;
using RestaurantApi.Models;

namespace RestaurantApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly RestaurantDbContext _context;
    private readonly IHubContext<RestaurantHub> _hubContext;

    public OrdersController(RestaurantDbContext context, IHubContext<RestaurantHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetOrders([FromQuery] string? status)
    {
        var query = _context.Orders
            .Include(o => o.Table)
            .Include(o => o.Items)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<OrderStatus>(status, true, out var orderStatus))
        {
            query = query.Where(o => o.Status == orderStatus);
        }

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Take(50)
            .ToListAsync();

        return Ok(orders);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetOrder(int id)
    {
        var order = await _context.Orders
            .Include(o => o.Table)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null) return NotFound();
        return Ok(order);
    }

    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto dto)
    {
        if (dto.Items == null || !dto.Items.Any())
        {
            return BadRequest("An order must contain at least one item.");
        }

        // Get count for order number generator
        var orderCount = await _context.Orders.CountAsync() + 101;
        var orderNumber = $"ORD-{orderCount}";

        var order = new Order
        {
            OrderNumber = orderNumber,
            TableId = dto.TableId,
            Type = dto.Type,
            CustomerName = string.IsNullOrWhiteSpace(dto.CustomerName) ? "Guest" : dto.CustomerName,
            CustomerPhone = dto.CustomerPhone ?? string.Empty,
            Notes = dto.Notes ?? string.Empty,
            IsPriority = dto.IsPriority,
            Status = OrderStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        decimal subtotal = 0;
        var updatedIngredients = new List<Ingredient>();

        // Process each ordered item and execute Bill of Materials (BOM) stock deduction
        foreach (var itemDto in dto.Items)
        {
            var menuItem = await _context.MenuItems
                .Include(m => m.Recipes)
                    .ThenInclude(r => r.Ingredient)
                .FirstOrDefaultAsync(m => m.Id == itemDto.MenuItemId);

            if (menuItem == null)
            {
                return BadRequest($"Menu item with ID {itemDto.MenuItemId} not found.");
            }

            var lineTotal = menuItem.Price * itemDto.Quantity;
            subtotal += lineTotal;

            var orderItem = new OrderItem
            {
                MenuItemId = menuItem.Id,
                ItemName = menuItem.Name,
                Quantity = itemDto.Quantity,
                UnitPrice = menuItem.Price,
                ModifiersJson = JsonSerializer.Serialize(itemDto.Modifiers ?? new List<string>()),
                Station = menuItem.Station,
                Status = OrderItemStatus.Pending,
                Notes = itemDto.Notes ?? string.Empty
            };
            order.Items.Add(orderItem);

            // BOM Auto-Depletion logic
            if (menuItem.Recipes != null && menuItem.Recipes.Any())
            {
                foreach (var recipe in menuItem.Recipes)
                {
                    var ingredient = recipe.Ingredient;
                    if (ingredient != null)
                    {
                        var totalRequired = recipe.QuantityRequired * itemDto.Quantity;
                        ingredient.CurrentStock = Math.Max(0, ingredient.CurrentStock - totalRequired);

                        // Log Usage Transaction
                        var transaction = new InventoryTransaction
                        {
                            IngredientId = ingredient.Id,
                            Type = TransactionType.Usage,
                            Quantity = totalRequired,
                            UnitCost = ingredient.CostPerUnit,
                            Reason = $"Usage for {orderNumber}: {menuItem.Name} x{itemDto.Quantity}",
                            Timestamp = DateTime.UtcNow
                        };
                        await _context.InventoryTransactions.AddAsync(transaction);

                        if (!updatedIngredients.Any(i => i.Id == ingredient.Id))
                        {
                            updatedIngredients.Add(ingredient);
                        }
                    }
                }
            }
        }

        order.SubTotal = subtotal;
        order.TaxAmount = Math.Round(subtotal * 0.05m, 2); // 5% GST (2.5% CGST + 2.5% SGST)
        order.DiscountAmount = 0m;
        order.TotalAmount = order.SubTotal + order.TaxAmount;

        // If DineIn with a table, mark table occupied
        if (order.TableId.HasValue)
        {
            var table = await _context.Tables.FindAsync(order.TableId.Value);
            if (table != null)
            {
                table.Status = TableStatus.Occupied;
                table.CurrentOrderId = null; // will be set once order saved
            }
        }

        await _context.Orders.AddAsync(order);
        await _context.SaveChangesAsync();

        if (order.TableId.HasValue)
        {
            var table = await _context.Tables.FindAsync(order.TableId.Value);
            if (table != null)
            {
                table.CurrentOrderId = order.Id;
                await _context.SaveChangesAsync();
                await _hubContext.Clients.All.SendAsync("TableUpdated", table);
            }
        }

        // Broadcast real-time SignalR notifications
        var completeOrder = await _context.Orders
            .Include(o => o.Table)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == order.Id);

        await _hubContext.Clients.All.SendAsync("ReceiveNewOrder", completeOrder);

        // Broadcast updated stock for affected ingredients
        foreach (var ing in updatedIngredients)
        {
            await _hubContext.Clients.All.SendAsync("StockUpdated", new
            {
                ing.Id,
                ing.Name,
                ing.CurrentStock,
                ing.Unit,
                isLowStock = ing.CurrentStock <= ing.ReorderLevel
            });
        }

        return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, completeOrder);
    }

    [HttpPut("{id}/cancel")]
    public async Task<IActionResult> CancelOrder(int id)
    {
        var order = await _context.Orders
            .Include(o => o.Table)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null) return NotFound();

        order.Status = OrderStatus.Cancelled;
        order.UpdatedAt = DateTime.UtcNow;

        if (order.TableId.HasValue && order.Table != null)
        {
            order.Table.Status = TableStatus.Available;
            order.Table.CurrentOrderId = null;
        }

        await _context.SaveChangesAsync();

        await _hubContext.Clients.All.SendAsync("OrderStatusChanged", new { orderId = order.Id, status = order.Status.ToString() });
        if (order.Table != null)
        {
            await _hubContext.Clients.All.SendAsync("TableUpdated", order.Table);
        }

        return Ok(order);
    }
}
