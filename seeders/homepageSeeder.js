import HomeCategory from "../src/models/HomeCategory.js";
import ThematicSelection from "../src/models/ThematicSelection.js";
import RecommendedDish from "../src/models/RecommendedDish.js";
import Promotion from "../src/models/Promotion.js";
import PromotionMenuItem from "../src/models/PromotionMenuItem.js";
import DailyDeal from "../src/models/DailyDeal.js";
import Announcement from "../src/models/Announcement.js";
import { slugify } from "../src/utils/slug.js";

export const seedHomepageModules = async ({ restaurants, restaurantMenuMap }) => {
  if (!restaurants?.length) {
    return {
      homeCategoryCount: 0,
      thematicCount: 0,
      recommendedCount: 0,
      promotionCount: 0,
      dailyDealCount: 0,
      announcementCount: 0
    };
  }

  console.log("Initializing homepage modules, promotions, and announcements...");

  const homeCategoryTemplates = [
    {
      name: "Burgers",
      description: "Les burgers gourmets les plus commandAcs",
      image_url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600",
      display_order: 1,
      is_active: true
    },
    {
      name: "Tacos",
      description: "Tacos maison, sauces piquantes et croustillants",
      image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600",
      display_order: 2,
      is_active: true
    },
    {
      name: "Pizza",
      description: "Pizzas napolitaines, wood-fired et recettes signature",
      image_url: "https://images.unsplash.com/photo-1548365328-9b0eb7da55f4?w=600",
      display_order: 3,
      is_active: true
    },
    {
      name: "Desserts",
      description: "Douceurs pour terminer votre commande en beautAc",
      image_url: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600",
      display_order: 4,
      is_active: true
    }
  ].map((template) => ({
    ...template,
    slug: slugify(template.name)
  }));

  const createdHomeCategories = await HomeCategory.bulkCreate(homeCategoryTemplates, { returning: true });
  const findHomeCategoryId = (name) => createdHomeCategories.find((cat) => cat.name === name)?.id;

  const thematicTemplates = [
    {
      name: "Tacos pour vous",
      description: "Les tacos les plus commandés par la communauté Tawssil",
      home_category_id: findHomeCategoryId("Tacos"),
      image_url: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600",
      is_active: true
    },
    {
      name: "Les fans de pizza",
      description: "Pizzas artisanales avec pâte croustillante",
      home_category_id: findHomeCategoryId("Pizza"),
      image_url: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=600",
      is_active: true
    },
    {
      name: "Burgers gourmets",
      description: "Burgers premium soigneusement sélectionnés",
      home_category_id: findHomeCategoryId("Burgers"),
      image_url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600",
      is_active: true
    }
  ].filter((item) => item.home_category_id);

  const createdThematicSelections = await ThematicSelection.bulkCreate(thematicTemplates);

  const premiumRestaurants = restaurants.filter((rest) => rest.is_premium);
  const recommendedEntries = [];

  premiumRestaurants.slice(0, 6).forEach((restaurant, index) => {
    const candidateItems = restaurantMenuMap.get(restaurant.id) || [];
    if (!candidateItems.length) {
      return;
    }
    const menuItem = candidateItems[Math.floor(Math.random() * candidateItems.length)];
    recommendedEntries.push({
      restaurant_id: restaurant.id,
      menu_item_id: menuItem.id,
      reason: index % 2 === 0 ? "Plat premium recommandé" : "Coup de coeur chef",
      is_active: true
    });
  });

  const createdRecommendedDishes = recommendedEntries.length
    ? await RecommendedDish.bulkCreate(recommendedEntries)
    : [];

  const findRestaurantByCategory = (category) =>
    restaurants.find((rest) => Array.isArray(rest.categories) && rest.categories.includes(category));

  const getMenuItemIdsForRestaurant = (restaurantId, limit = 2) =>
    (restaurantMenuMap.get(restaurantId) || []).slice(0, limit).map((item) => item.id);

  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const burgerRestaurant = findRestaurantByCategory("burger") || restaurants[0];
  const tacosRestaurant = findRestaurantByCategory("tacos") || restaurants[1];
  const pizzaRestaurant = findRestaurantByCategory("pizza") || restaurants[2];
  const promoRestaurant = premiumRestaurants[0] || burgerRestaurant;

  const promotionsPayload = [
    {
      title: "20% sur les burgers premium",
      description: "Remise exclusive sur une sélection de burgers gourmets",
      type: "percentage",
      restaurant_id: burgerRestaurant.id,
      discount_value: 20,
      start_date: new Date(now.getTime() - oneDay),
      end_date: new Date(now.getTime() + 14 * oneDay),
      badge_text: "-20%",
      is_active: true,
      menu_item_ids: getMenuItemIdsForRestaurant(burgerRestaurant.id, 3)
    },
    {
      title: "-200 DA sur les tacos",
      description: "Tacos épicés, sauces maison et garnitures copieuses",
      type: "amount",
      restaurant_id: tacosRestaurant.id,
      discount_value: 200,
      start_date: new Date(now.getTime() - oneDay),
      end_date: new Date(now.getTime() + 10 * oneDay),
      badge_text: "-200 DA",
      is_active: true,
      menu_item_ids: getMenuItemIdsForRestaurant(tacosRestaurant.id, 2)
    },
    {
      title: "Livraison gratuite 48h",
      description: "Frais offerts sur toutes les commandes de plus de 2500 DA",
      type: "free_delivery",
      scope: "delivery",
      restaurant_id: pizzaRestaurant.id,
      badge_text: "Livraison gratuite",
      start_date: now,
      end_date: new Date(now.getTime() + 7 * oneDay),
      is_active: true
    },
    {
      title: "Plat bonus",
      description: "Recevez un plat complémentaire automatiquement",
      type: "buy_x_get_y",
      restaurant_id: promoRestaurant.id,
      menu_item_id: getMenuItemIdsForRestaurant(promoRestaurant.id, 1)[0] || null,
      buy_quantity: 1,
      free_quantity: 1,
      start_date: new Date(now.getTime() - oneDay),
      end_date: new Date(now.getTime() + 12 * oneDay),
      is_active: true
    },
    {
      title: "Boisson offerte dès 2000 DA",
      description: "Ajoutez une boisson gratuite pour les grosses commandes",
      type: "other",
      restaurant_id: restaurants[3]?.id || burgerRestaurant.id,
      custom_message: "Boisson offerte dès 2000 DA",
      start_date: now,
      end_date: new Date(now.getTime() + 5 * oneDay),
      is_active: true
    }
  ];

  const createdPromotions = await Promotion.bulkCreate(promotionsPayload, { returning: true });
  const promotionMenuLinks = [];

  promotionsPayload.forEach((payload, index) => {
    const promo = createdPromotions[index];
    (payload.menu_item_ids || []).forEach((menuId) => {
      if (!menuId) {
        return;
      }
      promotionMenuLinks.push({
        promotion_id: promo.id,
        menu_item_id: menuId
      });
    });
  });

  if (promotionMenuLinks.length) {
    await PromotionMenuItem.bulkCreate(promotionMenuLinks, { ignoreDuplicates: true });
  }

  const dailyDealEntries = createdPromotions.slice(0, 3).map((promo, index) => ({
    promotion_id: promo.id,
    start_date: new Date(now.getTime() - (index + 1) * oneDay),
    end_date: new Date(now.getTime() + (index + 5) * oneDay),
    is_active: true
  }));

  const createdDailyDeals = dailyDealEntries.length
    ? await DailyDeal.bulkCreate(dailyDealEntries)
    : [];

  const announcementEntries = [
    {
      title: "Livraison gratuite dès 2500 DA",
      content: "Commandez pour 2500 DA et profitez de la livraison offerte.",
      is_active: true,
      start_date: now,
      end_date: new Date(now.getTime() + 6 * oneDay),
      restaurant_index: 0
    },
    {
      title: "Burgers à -20% cette semaine",
      content: "Nos burgers tendance sont à -20% jusqu'au dimanche minuit.",
      is_active: true,
      start_date: now,
      end_date: new Date(now.getTime() + 10 * oneDay),
      restaurant_index: 1
    }
  ];

  const announcementPayloads = announcementEntries.map((entry, index) => {
    if (entry.restaurant_index !== undefined && Number.isInteger(entry.restaurant_index)) {
      const restaurant = restaurants[entry.restaurant_index % restaurants.length];
      return {
        ...entry,
        restaurant_id: restaurant?.id || null
      };
    }
    return {
      ...entry,
      restaurant_id: restaurants[index % restaurants.length]?.id || null
    };
  });

  const createdAnnouncements = await Announcement.bulkCreate(announcementPayloads);

  console.log(`ƒo. ${createdHomeCategories.length} home categories created`);
  console.log(`ƒo. ${createdThematicSelections.length} thematic selections created`);
  console.log(`ƒo. ${createdRecommendedDishes.length} recommended dishes created`);
  console.log(`ƒo. ${createdPromotions.length} promotions created`);
  console.log(`ƒo. ${createdDailyDeals.length} daily deals created`);
  console.log(`ƒo. ${createdAnnouncements.length} announcements created`);

  return {
    homeCategoryCount: createdHomeCategories.length,
    thematicCount: createdThematicSelections.length,
    recommendedCount: createdRecommendedDishes.length,
    promotionCount: createdPromotions.length,
    dailyDealCount: createdDailyDeals.length,
    announcementCount: createdAnnouncements.length
  };
};
