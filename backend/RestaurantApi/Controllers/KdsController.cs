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
public class KdsController : ControllerBase
{
    private readonly RestaurantDbContext _context;
    private readonly IHubContext<RestaurantHub> _hubContext;

    public KdsController(RestaurantDbContext context, IHubContext<RestaurantHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    [HttpGet("tickets")]
    public async Task<IActionResult> GetActiveTickets([FromQuery] string? station)
    {
        var activeStatuses = new[] { OrderStatus.Pending, OrderStatus.Preparing, OrderStatus.Ready };

        var orders = await _context.Orders
            .Include(o => o.Table)
            .Include(o => o.Items)
            .Where(o => activeStatuses.Contains(o.Status))
            .OrderBy(o => o.CreatedAt)
            .ToListAsync();

        var now = DateTime.UtcNow;

        var ticketList = orders.Select(o =>
        {
            var elapsedSeconds = (int)(now - o.CreatedAt).TotalSeconds;
            var elapsedMinutes = elapsedSeconds / 60;

            // Urgency: Normal (<10m), Warning (10-20m), Urgent (>20m)
            var urgency = elapsedMinutes switch
            {
                < 10 => "Normal",
                < 20 => "Warning",
                _ => "Urgent"
            };

            var items = o.Items.AsEnumerable();
            if (!string.IsNullOrEmpty(station) && Enum.TryParse<KitchenStation>(station, true, out var kitchenStation) && kitchenStation != KitchenStation.Expo)
            {
                items = items.Where(i => i.Station == kitchenStation);
            }

            return new
            {
                o.Id,
                o.OrderNumber,
                o.TableId,
                TableNumber = o.Table != null ? o.Table.TableNumber : (o.Type == OrderType.Takeaway ? "Takeaway" : (o.DeliveryProvider == DeliveryProvider.Swiggy ? "Swiggy" : "Direct Delivery")),
                TableSection = o.Table != null ? o.Table.Section : (o.Type == OrderType.Takeaway ? "Counter Pickup" : "Delivery"),
                Type = o.Type.ToString(),
                DeliveryProvider = o.DeliveryProvider.ToString(),
                o.DeliveryAddress,
                o.DeliveryFee,
                o.ChannelOrderId,
                o.CustomerName,
                o.CustomerPhone,
                o.RiderName,
                o.RiderPhone,
                Status = o.Status.ToString(),
                o.CreatedAt,
                ElapsedSeconds = elapsedSeconds,
                ElapsedMinutes = elapsedMinutes,
                Urgency = urgency,
                o.IsPriority,
                o.Notes,
                Items = items.Select(i => new
                {
                    i.Id,
                    i.MenuItemId,
                    i.ItemName,
                    i.Quantity,
                    i.UnitPrice,
                    i.ModifiersJson,
                    Station = i.Station.ToString(),
                    Status = i.Status.ToString(),
                    i.Notes
                }).ToList()
            };
        }).Where(t => t.Items.Any()).ToList();

        return Ok(ticketList);
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetKitchenSummary([FromQuery] string? station)
    {
        var activeStatuses = new[] { OrderStatus.Pending, OrderStatus.Preparing };

        var itemsQuery = _context.OrderItems
            .Include(i => i.Order)
            .Where(i => activeStatuses.Contains(i.Order!.Status) && i.Status != OrderItemStatus.Ready && i.Status != OrderItemStatus.Cancelled);

        if (!string.IsNullOrEmpty(station) && Enum.TryParse<KitchenStation>(station, true, out var kitchenStation) && kitchenStation != KitchenStation.Expo)
        {
            itemsQuery = itemsQuery.Where(i => i.Station == kitchenStation);
        }

        var summary = await itemsQuery
            .GroupBy(i => new { i.ItemName, i.Station })
            .Select(g => new
            {
                ItemName = g.Key.ItemName,
                Station = g.Key.Station.ToString(),
                TotalQuantity = g.Sum(i => i.Quantity),
                PendingCount = g.Count(i => i.Status == OrderItemStatus.Pending),
                CookingCount = g.Count(i => i.Status == OrderItemStatus.Cooking)
            })
            .OrderByDescending(s => s.TotalQuantity)
            .ToListAsync();

        return Ok(summary);
    }

    [HttpPut("items/{itemId}/bump")]
    public async Task<IActionResult> BumpItem(int itemId, [FromBody] BumpItemDto dto)
    {
        var item = await _context.OrderItems
            .Include(i => i.Order)
                .ThenInclude(o => o!.Items)
            .FirstOrDefaultAsync(i => i.Id == itemId);

        if (item == null) return NotFound("Order item not found");

        item.Status = dto.Status;
        var order = item.Order;

        // Auto transition order status based on item statuses
        if (order != null)
        {
            if (order.Items.All(i => i.Status == OrderItemStatus.Ready))
            {
                order.Status = OrderStatus.Ready;
            }
            else if (order.Items.Any(i => i.Status == OrderItemStatus.Cooking || i.Status == OrderItemStatus.Ready))
            {
                if (order.Status == OrderStatus.Pending)
                {
                    order.Status = OrderStatus.Preparing;
                }
            }
            order.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        await _hubContext.Clients.All.SendAsync("ItemStatusChanged", new
        {
            itemId = item.Id,
            status = item.Status.ToString(),
            orderId = order?.Id,
            orderStatus = order?.Status.ToString()
        });

        return Ok(new { itemId = item.Id, itemStatus = item.Status.ToString(), orderStatus = order?.Status.ToString() });
    }

    [HttpPut("tickets/{orderId}/bump")]
    public async Task<IActionResult> BumpTicket(int orderId, [FromBody] BumpTicketDto dto)
    {
        var order = await _context.Orders
            .Include(o => o.Table)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null) return NotFound("Order not found");

        order.Status = dto.Status;
        order.UpdatedAt = DateTime.UtcNow;

        // If bumping to Ready or Served, set all items to Ready
        if (dto.Status == OrderStatus.Ready || dto.Status == OrderStatus.Served)
        {
            foreach (var item in order.Items)
            {
                if (item.Status != OrderItemStatus.Cancelled)
                {
                    item.Status = OrderItemStatus.Ready;
                }
            }
        }

        await _context.SaveChangesAsync();

        await _hubContext.Clients.All.SendAsync("TicketBumped", new
        {
            orderId = order.Id,
            status = order.Status.ToString()
        });

        return Ok(order);
    }

    [HttpGet("recalled")]
    public async Task<IActionResult> GetRecalledTickets()
    {
        var cutOff = DateTime.UtcNow.AddMinutes(-45);
        var completedStatuses = new[] { OrderStatus.Ready, OrderStatus.Served };

        var recalled = await _context.Orders
            .Include(o => o.Table)
            .Include(o => o.Items)
            .Where(o => completedStatuses.Contains(o.Status) && o.UpdatedAt >= cutOff)
            .OrderByDescending(o => o.UpdatedAt)
            .Take(10)
            .ToListAsync();

        return Ok(recalled);
    }

    [HttpPut("tickets/{orderId}/recall")]
    public async Task<IActionResult> RecallTicket(int orderId)
    {
        var order = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null) return NotFound("Order not found");

        order.Status = OrderStatus.Preparing;
        order.UpdatedAt = DateTime.UtcNow;

        foreach (var item in order.Items)
        {
            item.Status = OrderItemStatus.Cooking;
        }

        await _context.SaveChangesAsync();

        await _hubContext.Clients.All.SendAsync("TicketRecalled", new
        {
            orderId = order.Id,
            status = order.Status.ToString()
        });

        return Ok(order);
    }
}
