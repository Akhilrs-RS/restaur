using System.Text.Json.Serialization;

namespace RestaurantApi.Models;

public class Table
{
    public int Id { get; set; }
    public string TableNumber { get; set; } = string.Empty;
    public int Capacity { get; set; } = 4;
    public string Section { get; set; } = "Main Dining"; // Main Dining, Patio, Bar
    public TableStatus Status { get; set; } = TableStatus.Available;
    public int? CurrentOrderId { get; set; }
}

public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Icon { get; set; } = "Utensils";
    public int DisplayOrder { get; set; } = 0;
    
    [JsonIgnore]
    public List<MenuItem> MenuItems { get; set; } = new();
}

public class MenuItem
{
    public int Id { get; set; }
    public int CategoryId { get; set; }
    public Category? Category { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int PrepTimeMinutes { get; set; } = 15;
    public KitchenStation Station { get; set; } = KitchenStation.Expo;
    public string ImageUrl { get; set; } = string.Empty;
    public bool IsAvailable { get; set; } = true;
    
    public List<DishRecipe> Recipes { get; set; } = new();
}

public class Ingredient
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string Unit { get; set; } = "g"; // g, kg, ml, L, pcs
    public decimal CurrentStock { get; set; }
    public decimal ReorderLevel { get; set; }
    public decimal CostPerUnit { get; set; }
    public string SupplierName { get; set; } = "General Wholesale";
    
    [JsonIgnore]
    public List<DishRecipe> DishRecipes { get; set; } = new();
}

public class DishRecipe
{
    public int Id { get; set; }
    public int MenuItemId { get; set; }
    [JsonIgnore]
    public MenuItem? MenuItem { get; set; }
    
    public int IngredientId { get; set; }
    public Ingredient? Ingredient { get; set; }
    
    public decimal QuantityRequired { get; set; } // Quantity in Ingredient's Unit
}

public class Order
{
    public int Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public int? TableId { get; set; }
    public Table? Table { get; set; }
    public OrderType Type { get; set; } = OrderType.DineIn;
    public string CustomerName { get; set; } = "Guest";
    public string CustomerPhone { get; set; } = string.Empty;
    public OrderStatus Status { get; set; } = OrderStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public decimal SubTotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public PaymentMethod? PaymentMethod { get; set; }
    public string Notes { get; set; } = string.Empty;
    public bool IsPriority { get; set; } = false;

    public List<OrderItem> Items { get; set; } = new();
}

public class OrderItem
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    [JsonIgnore]
    public Order? Order { get; set; }
    
    public int MenuItemId { get; set; }
    public MenuItem? MenuItem { get; set; }
    
    public string ItemName { get; set; } = string.Empty;
    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public string ModifiersJson { get; set; } = "[]"; // Serialized JSON string array
    public KitchenStation Station { get; set; } = KitchenStation.Expo;
    public OrderItemStatus Status { get; set; } = OrderItemStatus.Pending;
    public string Notes { get; set; } = string.Empty;
}

public class InventoryTransaction
{
    public int Id { get; set; }
    public int IngredientId { get; set; }
    public Ingredient? Ingredient { get; set; }
    public TransactionType Type { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public decimal TotalCost => Quantity * UnitCost;
    public string Reason { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
