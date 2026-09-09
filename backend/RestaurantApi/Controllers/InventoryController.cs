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
public class InventoryController : ControllerBase
{
    private readonly RestaurantDbContext _context;
    private readonly IHubContext<RestaurantHub> _hubContext;

    public InventoryController(RestaurantDbContext context, IHubContext<RestaurantHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    [HttpGet("ingredients")]
    public async Task<IActionResult> GetIngredients()
    {
        var ingredients = await _context.Ingredients
            .Include(i => i.DishRecipes)
            .OrderBy(i => i.Name)
            .ToListAsync();

        var result = ingredients.Select(i => new
        {
            i.Id,
            i.Name,
            i.Sku,
            i.Unit,
            i.CurrentStock,
            i.ReorderLevel,
            i.CostPerUnit,
            i.SupplierName,
            TotalValue = i.CurrentStock * i.CostPerUnit,
            HealthStatus = i.CurrentStock <= 0 ? "Depleted" : (i.CurrentStock <= i.ReorderLevel ? "Low" : "Healthy"),
            UsedInRecipesCount = i.DishRecipes.Count
        });

        return Ok(result);
    }

    [HttpPost("wastage")]
    public async Task<IActionResult> LogWastage([FromBody] WastageDto dto)
    {
        var ingredient = await _context.Ingredients.FindAsync(dto.IngredientId);
        if (ingredient == null) return NotFound("Ingredient not found");

        if (dto.Quantity <= 0) return BadRequest("Wastage quantity must be greater than zero.");

        ingredient.CurrentStock = Math.Max(0, ingredient.CurrentStock - dto.Quantity);

        var transaction = new InventoryTransaction
        {
            IngredientId = ingredient.Id,
            Type = TransactionType.Wastage,
            Quantity = dto.Quantity,
            UnitCost = ingredient.CostPerUnit,
            Reason = string.IsNullOrWhiteSpace(dto.Reason) ? "Kitchen Spoilage / Prep Waste" : dto.Reason,
            Timestamp = DateTime.UtcNow
        };

        await _context.InventoryTransactions.AddAsync(transaction);
        await _context.SaveChangesAsync();

        await _hubContext.Clients.All.SendAsync("StockUpdated", new
        {
            ingredient.Id,
            ingredient.Name,
            ingredient.CurrentStock,
            ingredient.Unit,
            isLowStock = ingredient.CurrentStock <= ingredient.ReorderLevel
        });

        return Ok(new
        {
            transaction.Id,
            IngredientName = ingredient.Name,
            WastedQuantity = dto.Quantity,
            FinancialLoss = dto.Quantity * ingredient.CostPerUnit,
            RemainingStock = ingredient.CurrentStock,
            transaction.Reason
        });
    }

    [HttpPost("restock")]
    public async Task<IActionResult> Restock([FromBody] RestockDto dto)
    {
        var ingredient = await _context.Ingredients.FindAsync(dto.IngredientId);
        if (ingredient == null) return NotFound("Ingredient not found");

        if (dto.Quantity <= 0) return BadRequest("Restock quantity must be greater than zero.");

        ingredient.CurrentStock += dto.Quantity;
        if (dto.UnitCost.HasValue && dto.UnitCost.Value > 0)
        {
            ingredient.CostPerUnit = dto.UnitCost.Value;
        }

        var transaction = new InventoryTransaction
        {
            IngredientId = ingredient.Id,
            Type = TransactionType.Restock,
            Quantity = dto.Quantity,
            UnitCost = ingredient.CostPerUnit,
            Reason = string.IsNullOrWhiteSpace(dto.Reason) ? "Supplier Restock Delivery" : dto.Reason,
            Timestamp = DateTime.UtcNow
        };

        await _context.InventoryTransactions.AddAsync(transaction);
        await _context.SaveChangesAsync();

        await _hubContext.Clients.All.SendAsync("StockUpdated", new
        {
            ingredient.Id,
            ingredient.Name,
            ingredient.CurrentStock,
            ingredient.Unit,
            isLowStock = ingredient.CurrentStock <= ingredient.ReorderLevel
        });

        return Ok(new
        {
            transaction.Id,
            IngredientName = ingredient.Name,
            RestockedQuantity = dto.Quantity,
            NewStock = ingredient.CurrentStock
        });
    }

    [HttpGet("transactions")]
    public async Task<IActionResult> GetTransactions([FromQuery] int take = 30)
    {
        var transactions = await _context.InventoryTransactions
            .Include(t => t.Ingredient)
            .OrderByDescending(t => t.Timestamp)
            .Take(take)
            .Select(t => new
            {
                t.Id,
                t.IngredientId,
                IngredientName = t.Ingredient != null ? t.Ingredient.Name : "Unknown",
                Unit = t.Ingredient != null ? t.Ingredient.Unit : "",
                Type = t.Type.ToString(),
                t.Quantity,
                t.UnitCost,
                t.TotalCost,
                t.Reason,
                t.Timestamp
            })
            .ToListAsync();

        return Ok(transactions);
    }

    [HttpGet("purchase-order-suggestions")]
    public async Task<IActionResult> GetPurchaseOrderSuggestions()
    {
        var lowStockItems = await _context.Ingredients
            .Where(i => i.CurrentStock <= i.ReorderLevel)
            .ToListAsync();

        var suggestions = lowStockItems.Select(i =>
        {
            // Suggest ordering enough to reach double the reorder level
            var suggestedOrderQty = (i.ReorderLevel * 2) - i.CurrentStock;
            if (suggestedOrderQty <= 0) suggestedOrderQty = i.ReorderLevel;

            return new
            {
                i.Id,
                i.Name,
                i.Sku,
                i.Unit,
                i.CurrentStock,
                i.ReorderLevel,
                i.CostPerUnit,
                i.SupplierName,
                SuggestedQuantity = suggestedOrderQty,
                EstimatedCost = suggestedOrderQty * i.CostPerUnit
            };
        });

        return Ok(suggestions);
    }
}
