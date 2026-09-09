namespace RestaurantApi.Models;

public enum TableStatus
{
    Available = 0,
    Occupied = 1,
    Billing = 2,
    Cleaning = 3
}

public enum OrderType
{
    DineIn = 0,
    Takeaway = 1,
    Delivery = 2
}

public enum DeliveryProvider
{
    None = 0,
    Direct = 1,
    Swiggy = 2
}

public enum OrderStatus
{
    Pending = 0,
    Preparing = 1,
    Ready = 2,
    Served = 3,
    Paid = 4,
    Cancelled = 5
}

public enum OrderItemStatus
{
    Pending = 0,
    Cooking = 1,
    Ready = 2,
    Cancelled = 3
}

public enum KitchenStation
{
    Expo = 0,
    Grill = 1,
    Fryer = 2,
    Salad = 3,
    Bar = 4
}

public enum TransactionType
{
    Usage = 0,
    Restock = 1,
    Wastage = 2,
    Adjustment = 3
}

public enum PaymentMethod
{
    Cash = 0,
    Card = 1,
    UPI = 2,
    Split = 3
}
