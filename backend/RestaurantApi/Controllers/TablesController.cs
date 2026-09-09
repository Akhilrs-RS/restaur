using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using RestaurantApi.Data;
using RestaurantApi.Hubs;
using RestaurantApi.Models;

namespace RestaurantApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TablesController : ControllerBase
{
    private readonly RestaurantDbContext _context;
    private readonly IHubContext<RestaurantHub> _hubContext;

    public TablesController(RestaurantDbContext context, IHubContext<RestaurantHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetTables()
    {
        var tables = await _context.Tables
            .OrderBy(t => t.Section)
            .ThenBy(t => t.TableNumber)
            .ToListAsync();

        return Ok(tables);
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] TableStatus status)
    {
        var table = await _context.Tables.FindAsync(id);
        if (table == null) return NotFound();

        table.Status = status;
        if (status == TableStatus.Available)
        {
            table.CurrentOrderId = null;
        }

        await _context.SaveChangesAsync();
        await _hubContext.Clients.All.SendAsync("TableUpdated", table);

        return Ok(table);
    }
}
