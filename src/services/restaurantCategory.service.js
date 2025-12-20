import { Op } from "sequelize";
import HomeCategory from "../models/HomeCategory.js";
import { normalizeCategoryList } from "../utils/slug.js";

const ensureSlugs = (values = []) => normalizeCategoryList(values);

export const findHomeCategoriesBySlugs = async (slugs = []) => {
  const normalizedSlugs = ensureSlugs(slugs);
  if (normalizedSlugs.length === 0) {
    return [];
  }

  return HomeCategory.findAll({
    where: {
      slug: {
        [Op.in]: normalizedSlugs
      }
    }
  });
};

export const syncRestaurantHomeCategories = async (restaurant, slugs = []) => {
  if (!restaurant) {
    throw new Error("Restaurant instance is required to assign parent categories");
  }

  const normalizedSlugs = ensureSlugs(slugs);
  if (normalizedSlugs.length === 0) {
    throw new Error("At least one home category is required");
  }

  const categories = await findHomeCategoriesBySlugs(normalizedSlugs);
  const foundSlugs = categories.map((category) => category.slug);
  const missing = normalizedSlugs.filter((slug) => !foundSlugs.includes(slug));

  if (missing.length > 0) {
    throw new Error(`Unknown home categories: ${missing.join(", ")}`);
  }

  await restaurant.setHome_categories(categories);
  return categories;
};

export const serializeHomeCategories = (categories = []) => {
  return (categories || []).map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    image_url: category.image_url,
    display_order: category.display_order
  }));
};

export const extractHomeCategorySlugs = (categories = []) => {
  return (categories || [])
    .map((category) => category.slug)
    .filter(Boolean);
};
