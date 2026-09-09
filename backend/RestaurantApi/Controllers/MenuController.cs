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
public class MenuController : ControllerBase
{
    private readonly RestaurantDbContext _context;
    private readonly IHubContext<RestaurantHub> _hubContext;

    public MenuController(RestaurantDbContext context, IHubContext<RestaurantHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await _context.Categories
            .OrderBy(c => c.DisplayOrder)
            .ToListAsync();
        return Ok(categories);
    }

    [HttpGet("items")]
    public async Task<IActionResult> GetMenuItems()
    {
        var items = await _context.MenuItems
            .Include(m => m.Category)
            .Include(m => m.Recipes)
                .ThenInclude(r => r.Ingredient)
            .ToListAsync();

        return Ok(items);
    }

    [HttpPut("items/{id}/toggle-availability")]
    public async Task<IActionResult> ToggleAvailability(int id)
    {
        var item = await _context.MenuItems.FindAsync(id);
        if (item == null) return NotFound();

        item.IsAvailable = !item.IsAvailable;
        await _context.SaveChangesAsync();

        await _hubContext.Clients.All.SendAsync("MenuItemUpdated", item);
        return Ok(item);
    }

    [HttpPost("recipes")]
    public async Task<IActionResult> UpdateRecipe([FromBody] UpdateRecipeDto dto)
    {
        var menuItem = await _context.MenuItems
            .Include(m => m.Recipes)
            .FirstOrDefaultAsync(m => m.Id == dto.MenuItemId);

        if (menuItem == null) return NotFound("Menu item not found");

        _context.DishRecipes.RemoveRange(menuItem.Recipes);

        foreach (var ingredientDto in dto.Ingredients)
        {
            var recipe = new DishRecipe
            {
                MenuItemId = dto.MenuItemId,
                IngredientId = ingredientDto.IngredientId,
                QuantityRequired = ingredientDto.QuantityRequired
            };
            await _context.DishRecipes.AddAsync(recipe);
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Recipe BOM updated successfully" });
    }
}
