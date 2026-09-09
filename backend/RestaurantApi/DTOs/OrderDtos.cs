using RestaurantApi.Models;

namespace RestaurantApi.DTOs;

public class CreateOrderItemDto
{
    public int MenuItemId { get; set; }
    public int Quantity { get; set; } = 1;
    public List<string> Modifiers { get; set; } = new();
    public string Notes { get; set; } = string.Empty;
}

public class CreateOrderDto
{
    public int? TableId { get; set; }
    public OrderType Type { get; set; } = OrderType.DineIn;
    public string CustomerName { get; set; } = "Guest";
    public string CustomerPhone { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public bool IsPriority { get; set; } = false;

    public DeliveryProvider DeliveryProvider { get; set; } = DeliveryProvider.None;
    public string? DeliveryAddress { get; set; }
    public decimal DeliveryFee { get; set; } = 0m;
    public string? ChannelOrderId { get; set; }
    public string? RiderName { get; set; }
    public string? RiderPhone { get; set; }

    public List<CreateOrderItemDto> Items { get; set; } = new();
}

public class BumpItemDto
{
    public OrderItemStatus Status { get; set; }
}

public class BumpTicketDto
{
    public OrderStatus Status { get; set; }
}

public class WastageDto
{
    public int IngredientId { get; set; }
    public decimal Quantity { get; set; }
    public string Reason { get; set; } = "Kitchen Waste"; // Burnt, Expired, Dropped, Quality
}

public class RestockDto
{
    public int IngredientId { get; set; }
    public decimal Quantity { get; set; }
    public decimal? UnitCost { get; set; }
    public string Reason { get; set; } = "Supplier Delivery";
}

public class SettleBillDto
{
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;
    public decimal TenderedAmount { get; set; }
    public decimal DiscountPercent { get; set; } = 0;
    public decimal TipAmount { get; set; } = 0;
}

public class SplitBillRequestDto
{
    public int SplitCount { get; set; } = 2;
}

public class RecipeItemDto
{
    public int IngredientId { get; set; }
    public decimal QuantityRequired { get; set; }
}

public class UpdateRecipeDto
{
    public int MenuItemId { get; set; }
    public List<RecipeItemDto> Ingredients { get; set; } = new();
}
