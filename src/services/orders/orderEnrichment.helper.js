import { Op } from "sequelize";
import MenuItem from "../../models/MenuItem.js";
import Promotion from "../../models/Promotion.js";

const promotionAttributes = [
  "id",
  "title",
  "description",
  "type",
  "scope",
  "discount_value",
  "currency",
  "badge_text",
  "custom_message",
  "is_active",
  "start_date",
  "end_date",
  "restaurant_id",
  "menu_item_id"
];

const buildActivePromotionWhere = (referenceDate = new Date()) => ({
  is_active: true,
  [Op.and]: [
    {
      [Op.or]: [{ start_date: null }, { start_date: { [Op.lte]: referenceDate } }]
    },
    {
      [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: referenceDate } }]
    }
  ]
});

const setValue = (target, key, value) => {
  if (!target) return;
  if (typeof target.setDataValue === "function") {
    target.setDataValue(key, value);
    return;
  }
  target[key] = value;
};

const getMenuItemIdFromOrderItem = (item) => item?.menu_item?.id ?? item?.menu_item_id ?? null;

/**
 * Adds active promotions to each order item's menu_item, without changing existing fields.
 * Mutates the provided order objects/instances.
 */
export async function hydrateOrderItemsWithActivePromotions(ordersInput, referenceDate = new Date()) {
  if (!ordersInput) return ordersInput;

  const orders = Array.isArray(ordersInput) ? ordersInput : [ordersInput];
  const menuItemIds = new Set();

  for (const order of orders) {
    const items = order?.order_items ?? [];
    for (const item of items) {
      const menuItemId = getMenuItemIdFromOrderItem(item);
      if (menuItemId) menuItemIds.add(menuItemId);
    }
  }

  if (menuItemIds.size === 0) return ordersInput;

  const promotionWhere = buildActivePromotionWhere(referenceDate);
  const menuItems = await MenuItem.findAll({
    where: { id: Array.from(menuItemIds) },
    attributes: ["id"],
    include: [
      {
        model: Promotion,
        as: "primary_promotions",
        attributes: promotionAttributes,
        where: promotionWhere,
        required: false
      },
      {
        model: Promotion,
        as: "promotions",
        through: { attributes: [] },
        attributes: promotionAttributes,
        where: promotionWhere,
        required: false
      }
    ]
  });

  const promoMap = new Map(
    menuItems.map((item) => {
      const json = typeof item.toJSON === "function" ? item.toJSON() : item;
      return [
        json.id,
        {
          primary_promotions: Array.isArray(json.primary_promotions) ? json.primary_promotions : [],
          promotions: Array.isArray(json.promotions) ? json.promotions : []
        }
      ];
    })
  );

  for (const order of orders) {
    const items = order?.order_items ?? [];
    for (const item of items) {
      const menuItemId = getMenuItemIdFromOrderItem(item);
      if (!menuItemId) continue;

      const promo = promoMap.get(menuItemId) || { primary_promotions: [], promotions: [] };
      if (item?.menu_item) {
        setValue(item.menu_item, "primary_promotions", promo.primary_promotions);
        setValue(item.menu_item, "promotions", promo.promotions);
      } else {
        setValue(item, "menu_item_promotions", promo);
      }
    }
  }

  return ordersInput;
}

