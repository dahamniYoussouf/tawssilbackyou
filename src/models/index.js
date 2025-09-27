import Restaurant from "./Restaurant.js";
import MenuItem from "./MenuItem.js";
import FoodCategory from "./FoodCategory.js";

Restaurant.hasMany(MenuItem, { foreignKey: "restaurant_id", as: "menu_items" });
MenuItem.belongsTo(Restaurant, { foreignKey: "restaurant_id", as: "restaurant" });

FoodCategory.hasMany(MenuItem, { foreignKey: "category_id", as: "items" });
MenuItem.belongsTo(FoodCategory, { foreignKey: "category_id", as: "category" });

export { Restaurant, MenuItem, FoodCategory };
