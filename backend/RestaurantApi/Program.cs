using Microsoft.EntityFrameworkCore;
using RestaurantApi.Data;
using RestaurantApi.Hubs;

var builder = WebApplication.CreateBuilder(args);

// 1. Add Services
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

builder.Services.AddDbContext<RestaurantDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddSignalR();

// 2. Configure CORS for React frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// 3. Database Initialization & Seeding
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<RestaurantDbContext>();
    await DbInitializer.InitializeAsync(dbContext);
}

// 4. HTTP Request Pipeline
app.UseCors("AllowFrontend");

app.UseRouting();

app.MapControllers();
app.MapHub<RestaurantHub>("/hubs/restaurant");

app.MapGet("/", () => Results.Ok(new
{
    service = "RestoPulse Enterprise API",
    status = "Online",
    version = "1.0.0",
    time = DateTime.UtcNow
}));

app.Run();
