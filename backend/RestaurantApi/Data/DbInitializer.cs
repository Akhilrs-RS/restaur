using Microsoft.EntityFrameworkCore;
using RestaurantApi.Models;

namespace RestaurantApi.Data;

public static class DbInitializer
{
    public static async Task InitializeAsync(RestaurantDbContext context)
    {
        await context.Database.EnsureCreatedAsync();

        // Ensure columns exist on Orders table for existing databases
        try
        {
            await context.Database.ExecuteSqlRawAsync(@"
                ALTER TABLE ""Orders"" ADD COLUMN IF NOT EXISTS ""DeliveryProvider"" integer NOT NULL DEFAULT 0;
                ALTER TABLE ""Orders"" ADD COLUMN IF NOT EXISTS ""DeliveryAddress"" text NOT NULL DEFAULT '';
                ALTER TABLE ""Orders"" ADD COLUMN IF NOT EXISTS ""DeliveryFee"" numeric NOT NULL DEFAULT 0;
                ALTER TABLE ""Orders"" ADD COLUMN IF NOT EXISTS ""ChannelOrderId"" text NOT NULL DEFAULT '';
                ALTER TABLE ""Orders"" ADD COLUMN IF NOT EXISTS ""RiderName"" text NOT NULL DEFAULT '';
                ALTER TABLE ""Orders"" ADD COLUMN IF NOT EXISTS ""RiderPhone"" text NOT NULL DEFAULT '';
            ");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"DB column migration notice: {ex.Message}");
        }

        if (await context.Categories.AnyAsync())
        {
            return; // DB has already been seeded
        }

        // 1. Seed Categories
        var categories = new List<Category>
        {
            new() { Name = "Burgers & Sandwiches", Icon = "HamBurger", DisplayOrder = 1 },
            new() { Name = "Steaks & Grills", Icon = "Flame", DisplayOrder = 2 },
            new() { Name = "Wood-Fired Pizza", Icon = "Pizza", DisplayOrder = 3 },
            new() { Name = "Salads & Bowls", Icon = "Salad", DisplayOrder = 4 },
            new() { Name = "Beverages & Cocktails", Icon = "Wine", DisplayOrder = 5 },
            new() { Name = "Desserts", Icon = "Cake", DisplayOrder = 6 }
        };
        await context.Categories.AddRangeAsync(categories);
        await context.SaveChangesAsync();

        // 2. Seed Tables
        var tables = new List<Table>
        {
            new() { TableNumber = "T-01", Capacity = 4, Section = "Main Dining", Status = TableStatus.Occupied },
            new() { TableNumber = "T-02", Capacity = 2, Section = "Main Dining", Status = TableStatus.Available },
            new() { TableNumber = "T-03", Capacity = 6, Section = "Main Dining", Status = TableStatus.Occupied },
            new() { TableNumber = "T-04", Capacity = 4, Section = "Main Dining", Status = TableStatus.Available },
            new() { TableNumber = "T-05", Capacity = 8, Section = "Main Dining", Status = TableStatus.Available },
            new() { TableNumber = "P-01", Capacity = 4, Section = "Patio", Status = TableStatus.Available },
            new() { TableNumber = "P-02", Capacity = 2, Section = "Patio", Status = TableStatus.Available },
            new() { TableNumber = "P-03", Capacity = 4, Section = "Patio", Status = TableStatus.Cleaning },
            new() { TableNumber = "B-01", Capacity = 2, Section = "Bar", Status = TableStatus.Available },
            new() { TableNumber = "B-02", Capacity = 2, Section = "Bar", Status = TableStatus.Available },
            new() { TableNumber = "B-03", Capacity = 2, Section = "Bar", Status = TableStatus.Available }
        };
        await context.Tables.AddRangeAsync(tables);
        await context.SaveChangesAsync();

        // 3. Seed Ingredients
        var ingredients = new List<Ingredient>
        {
            new() { Name = "Artisan Brioche Bun", Sku = "ING-BUN-01", Unit = "pcs", CurrentStock = 85, ReorderLevel = 25, CostPerUnit = 0.85m, SupplierName = "Boulangerie Co." },
            new() { Name = "Prime Angus Beef Patty", Sku = "ING-MEAT-01", Unit = "g", CurrentStock = 12500, ReorderLevel = 4000, CostPerUnit = 0.028m, SupplierName = "Valley Meats" },
            new() { Name = "Aged White Cheddar", Sku = "ING-DAIRY-01", Unit = "g", CurrentStock = 4200, ReorderLevel = 1500, CostPerUnit = 0.022m, SupplierName = "Dairy Gold" },
            new() { Name = "Black Truffle Aioli", Sku = "ING-SAUCE-01", Unit = "ml", CurrentStock = 2800, ReorderLevel = 800, CostPerUnit = 0.035m, SupplierName = "Gourmet Flavors" },
            new() { Name = "Prime Ribeye Cut (A5)", Sku = "ING-MEAT-02", Unit = "g", CurrentStock = 7200, ReorderLevel = 2500, CostPerUnit = 0.065m, SupplierName = "Valley Meats" },
            new() { Name = "Rosemary Herb Butter", Sku = "ING-DAIRY-02", Unit = "g", CurrentStock = 1600, ReorderLevel = 500, CostPerUnit = 0.030m, SupplierName = "Dairy Gold" },
            new() { Name = "Hand-stretched Pizza Dough", Sku = "ING-DOUGH-01", Unit = "pcs", CurrentStock = 45, ReorderLevel = 15, CostPerUnit = 1.20m, SupplierName = "Boulangerie Co." },
            new() { Name = "Fresh Buffalo Mozzarella", Sku = "ING-DAIRY-03", Unit = "g", CurrentStock = 5800, ReorderLevel = 1800, CostPerUnit = 0.026m, SupplierName = "Napoli Imports" },
            new() { Name = "San Marzano Tomato Sauce", Sku = "ING-SAUCE-02", Unit = "ml", CurrentStock = 9500, ReorderLevel = 3000, CostPerUnit = 0.015m, SupplierName = "Napoli Imports" },
            new() { Name = "Fresh Genovese Basil", Sku = "ING-PROD-01", Unit = "g", CurrentStock = 850, ReorderLevel = 300, CostPerUnit = 0.040m, SupplierName = "Farm Fresh Green" },
            new() { Name = "Crisp Romaine Hearts", Sku = "ING-PROD-02", Unit = "g", CurrentStock = 6200, ReorderLevel = 2000, CostPerUnit = 0.012m, SupplierName = "Farm Fresh Green" },
            new() { Name = "Parmigiano-Reggiano Shavings", Sku = "ING-DAIRY-04", Unit = "g", CurrentStock = 2100, ReorderLevel = 600, CostPerUnit = 0.045m, SupplierName = "Napoli Imports" },
            new() { Name = "House Caesar Dressing", Sku = "ING-SAUCE-03", Unit = "ml", CurrentStock = 3400, ReorderLevel = 1000, CostPerUnit = 0.018m, SupplierName = "Gourmet Flavors" },
            new() { Name = "Skin-on Russet Fries", Sku = "ING-SIDE-01", Unit = "g", CurrentStock = 18500, ReorderLevel = 5000, CostPerUnit = 0.006m, SupplierName = "Valley Meats" },
            new() { Name = "Kentucky Straight Bourbon", Sku = "ING-BEV-01", Unit = "ml", CurrentStock = 3800, ReorderLevel = 1000, CostPerUnit = 0.055m, SupplierName = "Apex Spirits" },
            new() { Name = "Angostura Bitters & Orange", Sku = "ING-BEV-02", Unit = "ml", CurrentStock = 850, ReorderLevel = 200, CostPerUnit = 0.070m, SupplierName = "Apex Spirits" },
            new() { Name = "Mascarpone & Espresso Cream", Sku = "ING-DESS-01", Unit = "g", CurrentStock = 3100, ReorderLevel = 1000, CostPerUnit = 0.032m, SupplierName = "Boulangerie Co." },
            new() { Name = "Belgian Dark Cocoa", Sku = "ING-DESS-02", Unit = "g", CurrentStock = 1200, ReorderLevel = 400, CostPerUnit = 0.038m, SupplierName = "Gourmet Flavors" }
        };
        await context.Ingredients.AddRangeAsync(ingredients);
        await context.SaveChangesAsync();

        // 4. Seed Menu Items
        var burgerCat = categories.First(c => c.Name.Contains("Burger"));
        var steakCat = categories.First(c => c.Name.Contains("Steak"));
        var pizzaCat = categories.First(c => c.Name.Contains("Pizza"));
        var saladCat = categories.First(c => c.Name.Contains("Salad"));
        var bevCat = categories.First(c => c.Name.Contains("Beverage"));
        var dessCat = categories.First(c => c.Name.Contains("Dessert"));

        var menuItems = new List<MenuItem>
        {
            new()
            {
                CategoryId = burgerCat.Id,
                Name = "Truffle Angus Burger",
                Description = "200g prime beef, aged cheddar, arugula, black truffle aioli, on toasted brioche with skin-on fries.",
                Price = 18.50m,
                PrepTimeMinutes = 12,
                Station = KitchenStation.Grill,
                ImageUrl = "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
                IsAvailable = true
            },
            new()
            {
                CategoryId = steakCat.Id,
                Name = "Prime Ribeye Steak 300g",
                Description = "A5 marble grade ribeye charbroiled to perfection with rosemary herb butter and crispy fries.",
                Price = 36.00m,
                PrepTimeMinutes = 18,
                Station = KitchenStation.Grill,
                ImageUrl = "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
                IsAvailable = true
            },
            new()
            {
                CategoryId = pizzaCat.Id,
                Name = "Margherita Napoletana",
                Description = "San Marzano tomatoes, fresh buffalo mozzarella, fresh basil, extra virgin olive oil.",
                Price = 16.00m,
                PrepTimeMinutes = 10,
                Station = KitchenStation.Fryer, // Wood Fired / Oven Station
                ImageUrl = "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=600&q=80",
                IsAvailable = true
            },
            new()
            {
                CategoryId = saladCat.Id,
                Name = "Signature Caesar Salad",
                Description = "Crisp romaine hearts, shaved parmigiano-reggiano, herb croutons, house caesar dressing.",
                Price = 13.50m,
                PrepTimeMinutes = 7,
                Station = KitchenStation.Salad,
                ImageUrl = "https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=600&q=80",
                IsAvailable = true
            },
            new()
            {
                CategoryId = bevCat.Id,
                Name = "Smoked Old Fashioned",
                Description = "Kentucky bourbon, aromatic angostura bitters, flamed orange peel, smoked with oak chips.",
                Price = 14.00m,
                PrepTimeMinutes = 4,
                Station = KitchenStation.Bar,
                ImageUrl = "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=600&q=80",
                IsAvailable = true
            },
            new()
            {
                CategoryId = dessCat.Id,
                Name = "Artisan Tiramisu Al Caffe",
                Description = "Espresso-soaked savoiardi, rich mascarpone cream, dusted with Belgian dark cocoa.",
                Price = 10.50m,
                PrepTimeMinutes = 5,
                Station = KitchenStation.Salad, // Cold station
                ImageUrl = "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80",
                IsAvailable = true
            }
        };
        await context.MenuItems.AddRangeAsync(menuItems);
        await context.SaveChangesAsync();

        // 5. Seed Dish Recipes (Bill of Materials)
        var ingMap = ingredients.ToDictionary(i => i.Name);
        var itemMap = menuItems.ToDictionary(m => m.Name);

        var recipes = new List<DishRecipe>
        {
            // Truffle Angus Burger BOM
            new() { MenuItemId = itemMap["Truffle Angus Burger"].Id, IngredientId = ingMap["Artisan Brioche Bun"].Id, QuantityRequired = 1 },
            new() { MenuItemId = itemMap["Truffle Angus Burger"].Id, IngredientId = ingMap["Prime Angus Beef Patty"].Id, QuantityRequired = 200 },
            new() { MenuItemId = itemMap["Truffle Angus Burger"].Id, IngredientId = ingMap["Aged White Cheddar"].Id, QuantityRequired = 40 },
            new() { MenuItemId = itemMap["Truffle Angus Burger"].Id, IngredientId = ingMap["Black Truffle Aioli"].Id, QuantityRequired = 30 },
            new() { MenuItemId = itemMap["Truffle Angus Burger"].Id, IngredientId = ingMap["Skin-on Russet Fries"].Id, QuantityRequired = 150 },

            // Prime Ribeye Steak BOM
            new() { MenuItemId = itemMap["Prime Ribeye Steak 300g"].Id, IngredientId = ingMap["Prime Ribeye Cut (A5)"].Id, QuantityRequired = 300 },
            new() { MenuItemId = itemMap["Prime Ribeye Steak 300g"].Id, IngredientId = ingMap["Rosemary Herb Butter"].Id, QuantityRequired = 30 },
            new() { MenuItemId = itemMap["Prime Ribeye Steak 300g"].Id, IngredientId = ingMap["Skin-on Russet Fries"].Id, QuantityRequired = 150 },

            // Margherita Napoletana BOM
            new() { MenuItemId = itemMap["Margherita Napoletana"].Id, IngredientId = ingMap["Hand-stretched Pizza Dough"].Id, QuantityRequired = 1 },
            new() { MenuItemId = itemMap["Margherita Napoletana"].Id, IngredientId = ingMap["San Marzano Tomato Sauce"].Id, QuantityRequired = 120 },
            new() { MenuItemId = itemMap["Margherita Napoletana"].Id, IngredientId = ingMap["Fresh Buffalo Mozzarella"].Id, QuantityRequired = 130 },
            new() { MenuItemId = itemMap["Margherita Napoletana"].Id, IngredientId = ingMap["Fresh Genovese Basil"].Id, QuantityRequired = 15 },

            // Signature Caesar Salad BOM
            new() { MenuItemId = itemMap["Signature Caesar Salad"].Id, IngredientId = ingMap["Crisp Romaine Hearts"].Id, QuantityRequired = 160 },
            new() { MenuItemId = itemMap["Signature Caesar Salad"].Id, IngredientId = ingMap["Parmigiano-Reggiano Shavings"].Id, QuantityRequired = 35 },
            new() { MenuItemId = itemMap["Signature Caesar Salad"].Id, IngredientId = ingMap["House Caesar Dressing"].Id, QuantityRequired = 45 },

            // Smoked Old Fashioned BOM
            new() { MenuItemId = itemMap["Smoked Old Fashioned"].Id, IngredientId = ingMap["Kentucky Straight Bourbon"].Id, QuantityRequired = 60 },
            new() { MenuItemId = itemMap["Smoked Old Fashioned"].Id, IngredientId = ingMap["Angostura Bitters & Orange"].Id, QuantityRequired = 10 },

            // Artisan Tiramisu BOM
            new() { MenuItemId = itemMap["Artisan Tiramisu Al Caffe"].Id, IngredientId = ingMap["Mascarpone & Espresso Cream"].Id, QuantityRequired = 120 },
            new() { MenuItemId = itemMap["Artisan Tiramisu Al Caffe"].Id, IngredientId = ingMap["Belgian Dark Cocoa"].Id, QuantityRequired = 15 }
        };
        await context.DishRecipes.AddRangeAsync(recipes);
        await context.SaveChangesAsync();

        // 6. Seed Active Live Orders (for KDS and POS immediate preview)
        var table1 = tables.First(t => t.TableNumber == "T-01");
        var table3 = tables.First(t => t.TableNumber == "T-03");

        var order1 = new Order
        {
            OrderNumber = "ORD-101",
            TableId = table1.Id,
            Type = OrderType.DineIn,
            CustomerName = "Alexander Wright",
            CustomerPhone = "+1 555-0192",
            Status = OrderStatus.Preparing,
            CreatedAt = DateTime.UtcNow.AddMinutes(-14), // 14 mins in prep (Amber warning on KDS)
            SubTotal = 54.50m,
            TaxAmount = 4.36m,
            DiscountAmount = 0m,
            TotalAmount = 58.86m,
            Notes = "VIP Guest. Medium-Rare on Steak please.",
            IsPriority = true
        };
        await context.Orders.AddAsync(order1);
        await context.SaveChangesAsync();

        table1.CurrentOrderId = order1.Id;

        var itemsOrder1 = new List<OrderItem>
        {
            new()
            {
                OrderId = order1.Id,
                MenuItemId = itemMap["Prime Ribeye Steak 300g"].Id,
                ItemName = "Prime Ribeye Steak 300g",
                Quantity = 1,
                UnitPrice = 36.00m,
                ModifiersJson = "[\"Medium-Rare\", \"Extra Rosemary Butter\"]",
                Station = KitchenStation.Grill,
                Status = OrderItemStatus.Cooking,
                Notes = "Medium-Rare"
            },
            new()
            {
                OrderId = order1.Id,
                MenuItemId = itemMap["Truffle Angus Burger"].Id,
                ItemName = "Truffle Angus Burger",
                Quantity = 1,
                UnitPrice = 18.50m,
                ModifiersJson = "[\"No Onions\", \"Crispy Fries\"]",
                Station = KitchenStation.Grill,
                Status = OrderItemStatus.Ready,
                Notes = "No onions"
            }
        };
        await context.OrderItems.AddRangeAsync(itemsOrder1);

        var order2 = new Order
        {
            OrderNumber = "ORD-102",
            TableId = table3.Id,
            Type = OrderType.DineIn,
            CustomerName = "Elena Vance",
            CustomerPhone = "+1 555-0847",
            Status = OrderStatus.Pending,
            CreatedAt = DateTime.UtcNow.AddMinutes(-4), // 4 mins (Fresh Emerald on KDS)
            SubTotal = 43.50m,
            TaxAmount = 3.48m,
            DiscountAmount = 0m,
            TotalAmount = 46.98m,
            Notes = "Table celebration",
            IsPriority = false
        };
        await context.Orders.AddAsync(order2);
        await context.SaveChangesAsync();

        table3.CurrentOrderId = order2.Id;

        var itemsOrder2 = new List<OrderItem>
        {
            new()
            {
                OrderId = order2.Id,
                MenuItemId = itemMap["Margherita Napoletana"].Id,
                ItemName = "Margherita Napoletana",
                Quantity = 1,
                UnitPrice = 16.00m,
                ModifiersJson = "[\"Crispy Crust\"]",
                Station = KitchenStation.Fryer,
                Status = OrderItemStatus.Pending
            },
            new()
            {
                OrderId = order2.Id,
                MenuItemId = itemMap["Signature Caesar Salad"].Id,
                ItemName = "Signature Caesar Salad",
                Quantity = 1,
                UnitPrice = 13.50m,
                ModifiersJson = "[\"Dressing on side\"]",
                Station = KitchenStation.Salad,
                Status = OrderItemStatus.Pending
            },
            new()
            {
                OrderId = order2.Id,
                MenuItemId = itemMap["Smoked Old Fashioned"].Id,
                ItemName = "Smoked Old Fashioned",
                Quantity = 1,
                UnitPrice = 14.00m,
                ModifiersJson = "[]",
                Station = KitchenStation.Bar,
                Status = OrderItemStatus.Cooking
            }
        };
        await context.OrderItems.AddRangeAsync(itemsOrder2);

        // Record Initial Stock Transaction
        var initialTransaction = new InventoryTransaction
        {
            IngredientId = ingMap["Prime Angus Beef Patty"].Id,
            Type = TransactionType.Usage,
            Quantity = 200,
            UnitCost = 0.028m,
            Reason = "Order ORD-101 preparation",
            Timestamp = DateTime.UtcNow.AddMinutes(-14)
        };
        await context.InventoryTransactions.AddAsync(initialTransaction);

        await context.SaveChangesAsync();
    }
}
