using Microsoft.AspNetCore.SignalR;
using RestaurantApi.Models;

namespace RestaurantApi.Hubs;

public class RestaurantHub : Hub
{
    public async Task JoinStationGroup(string stationName)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"Station_{stationName}");
    }

    public async Task LeaveStationGroup(string stationName)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Station_{stationName}");
    }
}
