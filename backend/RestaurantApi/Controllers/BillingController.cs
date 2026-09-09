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
public class BillingController : ControllerBase
{
    private readonly RestaurantDbContext _context;
    private readonly IHubContext<RestaurantHub> _hubContext;

    public BillingController(RestaurantDbContext context, IHubContext<RestaurantHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    [HttpGet("active")]
    public async Task<IActionResult> GetActiveBills()
    {
        var unpaidStatuses = new[] { OrderStatus.Pending, OrderStatus.Preparing, OrderStatus.Ready, OrderStatus.Served };

        var bills = await _context.Orders
            .Include(o => o.Table)
            .Include(o => o.Items)
            .Where(o => unpaidStatuses.Contains(o.Status))
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        return Ok(bills);
    }

    [HttpPost("{orderId}/split")]
    public async Task<IActionResult> CalculateSplit(int orderId, [FromBody] SplitBillRequestDto dto)
    {
        var order = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null) return NotFound("Order not found");

        var splitCount = Math.Max(1, dto.SplitCount);
        var perPersonAmount = Math.Round(order.TotalAmount / splitCount, 2);
        var remainder = order.TotalAmount - (perPersonAmount * splitCount);

        var splits = Enumerable.Range(1, splitCount).Select(i => new
        {
            GuestNumber = i,
            Amount = i == 1 ? perPersonAmount + remainder : perPersonAmount
        }).ToList();

        return Ok(new
        {
            orderId = order.Id,
            orderNumber = order.OrderNumber,
            totalAmount = order.TotalAmount,
            splitCount,
            splits
        });
    }

    [HttpPost("{orderId}/settle")]
    public async Task<IActionResult> SettleBill(int orderId, [FromBody] SettleBillDto dto)
    {
        var order = await _context.Orders
            .Include(o => o.Table)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null) return NotFound("Order not found");

        // Apply discount if any
        if (dto.DiscountPercent > 0)
        {
            var discount = Math.Round(order.SubTotal * (dto.DiscountPercent / 100m), 2);
            order.DiscountAmount = discount;
            var discountedSub = order.SubTotal - discount;
            order.TaxAmount = Math.Round(discountedSub * 0.05m, 2); // 5% GST (2.5% CGST + 2.5% SGST)
            order.TotalAmount = discountedSub + order.TaxAmount + dto.TipAmount;
        }
        else if (dto.TipAmount > 0)
        {
            order.TotalAmount += dto.TipAmount;
        }

        order.Status = OrderStatus.Paid;
        order.PaymentMethod = dto.PaymentMethod;
        order.UpdatedAt = DateTime.UtcNow;

        decimal changeGiven = 0;
        if (dto.PaymentMethod == PaymentMethod.Cash && dto.TenderedAmount > order.TotalAmount)
        {
            changeGiven = dto.TenderedAmount - order.TotalAmount;
        }

        // Release Table to Cleaning status
        Table? updatedTable = null;
        if (order.TableId.HasValue)
        {
            var table = await _context.Tables.FindAsync(order.TableId.Value);
            if (table != null)
            {
                table.Status = TableStatus.Cleaning;
                table.CurrentOrderId = null;
                updatedTable = table;
            }
        }

        await _context.SaveChangesAsync();

        // Broadcast table and billing updates
        await _hubContext.Clients.All.SendAsync("OrderSettled", new
        {
            orderId = order.Id,
            orderNumber = order.OrderNumber,
            total = order.TotalAmount,
            paymentMethod = order.PaymentMethod.ToString(),
            changeGiven
        });

        if (updatedTable != null)
        {
            await _hubContext.Clients.All.SendAsync("TableUpdated", updatedTable);
        }

        return Ok(new
        {
            success = true,
            orderId = order.Id,
            orderNumber = order.OrderNumber,
            total = order.TotalAmount,
            tendered = dto.TenderedAmount,
            change = changeGiven,
            paymentMethod = order.PaymentMethod.ToString()
        });
    }

    [HttpGet("{orderId}/receipt")]
    public async Task<IActionResult> GetReceiptData(int orderId)
    {
        var order = await _context.Orders
            .Include(o => o.Table)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null) return NotFound("Order not found");

        var cgst = Math.Round(order.TaxAmount / 2m, 2);
        var sgst = order.TaxAmount - cgst;

        var receipt = new
        {
            Restaurant = new
            {
                Name = "ROYAL SPICE RESTAURANT",
                Tagline = "Authentic Multi-Cuisine & Grill",
                Address = "No. 45, Anna Salai, Chennai - 600002",
                Phone = "+91 98765 43210",
                Gstin = "33AAAAA0000A1Z5",
                Fssai = "12423001000123",
                Website = "www.royalspice.in"
            },
            Invoice = new
            {
                InvoiceNumber = $"INV-{order.OrderNumber}",
                OrderNumber = order.OrderNumber,
                Date = order.CreatedAt.ToString("dd/MM/yyyy"),
                Time = order.CreatedAt.ToString("hh:mm tt"),
                Table = order.Table != null ? $"Table {order.Table.TableNumber}" : (order.Type == OrderType.Takeaway ? "Takeaway / Counter" : (order.DeliveryProvider == DeliveryProvider.Swiggy ? "Swiggy Delivery" : "Direct Delivery")),
                Section = order.Table != null ? order.Table.Section : (order.Type == OrderType.Takeaway ? "Parcel" : "Home Delivery"),
                OrderType = order.Type == OrderType.DineIn ? "Dine-In" : (order.Type == OrderType.Takeaway ? "Takeaway" : (order.DeliveryProvider == DeliveryProvider.Swiggy ? "Swiggy Delivery" : "Restaurant Direct Delivery")),
                DeliveryProvider = order.DeliveryProvider.ToString(),
                DeliveryAddress = order.DeliveryAddress,
                DeliveryFee = order.DeliveryFee,
                ChannelOrderId = order.ChannelOrderId,
                CustomerPhone = order.CustomerPhone,
                RiderName = order.RiderName,
                Server = "Shift Captain",
                Cashier = "Counter 01",
                GuestName = order.CustomerName,
                PaymentMethod = order.PaymentMethod?.ToString() ?? (order.DeliveryProvider == DeliveryProvider.Swiggy ? "Swiggy Online" : "Cash"),
                Status = order.Status.ToString()
            },
            Items = order.Items.Select(i => new
            {
                i.ItemName,
                i.Quantity,
                UnitPrice = i.UnitPrice,
                Total = i.Quantity * i.UnitPrice,
                Modifiers = i.ModifiersJson
            }),
            Summary = new
            {
                SubTotal = order.SubTotal,
                Discount = order.DiscountAmount,
                DeliveryFee = order.DeliveryFee,
                Cgst = cgst,
                Sgst = sgst,
                Tax = order.TaxAmount,
                Total = order.TotalAmount,
                Currency = "₹"
            }
        };

        return Ok(receipt);
    }
}
