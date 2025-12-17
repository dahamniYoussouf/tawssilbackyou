import { Op } from "sequelize";
import HomeCategory from "../models/HomeCategory.js";
import Restaurant from "../models/Restaurant.js";

const getRestaurantsCountForSlug = async (slug) => {
  if (!slug) return 0;
  return Restaurant.count({
    where: {
      categories: {
        [Op.contains]: [slug]
      }
    }
  });
};

export const listHomeCategories = async (options = {}) => {
  const where = {};
  if (options.activeOnly) {
    where.is_active = true;
  }

  const categories = await HomeCategory.findAll({
    where,
    order: [
      ["display_order", "ASC"],
      ["created_at", "ASC"]
    ]
  });

  const enhanced = await Promise.all(categories.map(async (category) => {
    const restaurants_count = await getRestaurantsCountForSlug(category.slug);
    return {
      ...category.toJSON(),
      restaurants_count
    };
  }));

  return enhanced;
};

export const createHomeCategory = async (payload) => {
  return HomeCategory.create(payload);
};

export const getHomeCategoryById = async (id) => {
  return HomeCategory.findByPk(id);
};

export const updateHomeCategory = async (id, payload) => {
  const category = await getHomeCategoryById(id);
  if (!category) return null;
  await category.update(payload);
  return category;
};

export const deleteHomeCategory = async (id) => {
  return HomeCategory.destroy({ where: { id } });
};
