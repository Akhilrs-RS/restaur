using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RestaurantApi.Data;
using RestaurantApi.Models;

namespace RestaurantApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AnalyticsController : ControllerBase
{
    private readonly RestaurantDbContext _context;

    public AnalyticsController(RestaurantDbContext context)
    {
        _context = context;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboardStats()
    {
        var today = DateTime.UtcNow.Date;

        var orders = await _context.Orders
            .Include(o => o.Items)
            .ToListAsync();

        var todayOrders = orders.Where(o => o.CreatedAt >= today).ToList();
        var paidOrders = orders.Where(o => o.Status == OrderStatus.Paid).ToList();

        var totalRevenue = paidOrders.Sum(o => o.TotalAmount);
        var activeKitchenOrders = orders.Count(o => o.Status == OrderStatus.Pending || o.Status == OrderStatus.Preparing);

        // Prep time statistics
        var completedOrders = orders.Where(o => (o.Status == OrderStatus.Ready || o.Status == OrderStatus.Served || o.Status == OrderStatus.Paid) && o.UpdatedAt.HasValue).ToList();
        var avgPrepMinutes = completedOrders.Any()
            ? (int)completedOrders.Average(o => (o.UpdatedAt!.Value - o.CreatedAt).TotalMinutes)
            : 12;

        // Station active items (LINQ to Objects for SQLite compatibility)
        var allOrderItems = await _context.OrderItems
            .Include(i => i.Order)
            .ToListAsync();

        var stationCounts = allOrderItems
            .Where(i => i.Order != null && (i.Order.Status == OrderStatus.Pending || i.Order.Status == OrderStatus.Preparing))
            .GroupBy(i => i.Station)
            .Select(g => new { Station = g.Key.ToString(), ActiveItems = g.Sum(x => x.Quantity) })
            .ToList();

        // Top 5 dishes (LINQ to Objects for SQLite compatibility)
        var topDishes = allOrderItems
            .GroupBy(i => i.ItemName)
            .Select(g => new { Name = g.Key, TotalSold = g.Sum(i => i.Quantity), Revenue = g.Sum(i => i.Quantity * i.UnitPrice) })
            .OrderByDescending(d => d.TotalSold)
            .Take(5)
            .ToList();

        // Wastage loss (LINQ to Objects for SQLite compatibility)
        var wastageTransactions = await _context.InventoryTransactions
            .Where(t => t.Type == TransactionType.Wastage)
            .ToListAsync();
        var wastageLoss = wastageTransactions.Sum(t => t.Quantity * t.UnitCost);

        // Low stock count
        var lowStockCount = await _context.Ingredients
            .CountAsync(i => i.CurrentStock <= i.ReorderLevel);

        return Ok(new
        {
            TotalRevenue = totalRevenue,
            TotalOrdersCount = orders.Count,
            TodayOrdersCount = todayOrders.Count,
            ActiveKitchenTickets = activeKitchenOrders,
            AvgPrepMinutes = Math.Max(4, avgPrepMinutes),
            LowStockIngredientsCount = lowStockCount,
            TotalWastageCost = wastageLoss,
            StationLoad = stationCounts,
            TopSellingDishes = topDishes
        });
    }

    [HttpGet("reports")]
    public async Task<IActionResult> GetReportsData()
    {
        var today = DateTime.UtcNow.Date;
        var firstDayOfMonth = new DateTime(today.Year, today.Month, 1);
        var firstDayOfYear = new DateTime(today.Year, 1, 1);

        var orders = await _context.Orders.ToListAsync();
        var paidOrders = orders.Where(o => o.Status == OrderStatus.Paid).ToList();

        var dailySales = paidOrders.Where(o => o.CreatedAt >= today).Sum(o => o.TotalAmount);
        var monthlySales = paidOrders.Where(o => o.CreatedAt >= firstDayOfMonth).Sum(o => o.TotalAmount);
        var yearlySales = paidOrders.Where(o => o.CreatedAt >= firstDayOfYear).Sum(o => o.TotalAmount);

        // Sales and count by order channel
        var channelStats = new
        {
            DineInRevenue = paidOrders.Where(o => o.Type == OrderType.DineIn).Sum(o => o.TotalAmount),
            DineInCount = orders.Count(o => o.Type == OrderType.DineIn),
            TakeawayRevenue = paidOrders.Where(o => o.Type == OrderType.Takeaway).Sum(o => o.TotalAmount),
            TakeawayCount = orders.Count(o => o.Type == OrderType.Takeaway),
            SwiggyRevenue = paidOrders.Where(o => o.Type == OrderType.Delivery && o.DeliveryProvider == DeliveryProvider.Swiggy).Sum(o => o.TotalAmount),
            SwiggyCount = orders.Count(o => o.Type == OrderType.Delivery && o.DeliveryProvider == DeliveryProvider.Swiggy),
            DirectDeliveryRevenue = paidOrders.Where(o => o.Type == OrderType.Delivery && o.DeliveryProvider == DeliveryProvider.Direct).Sum(o => o.TotalAmount),
            DirectDeliveryCount = orders.Count(o => o.Type == OrderType.Delivery && o.DeliveryProvider == DeliveryProvider.Direct)
        };

        return Ok(new
        {
            DailySales = dailySales,
            MonthlySales = monthlySales,
            YearlySales = yearlySales,
            ChannelStats = channelStats
        });
    }
}
