import { Op } from "sequelize";
import FoodCategory from "../models/FoodCategory.js";
import { 
  createCategory, 
  getAllCategories, 
  getCategoriesByRestaurant,
  updateCategory,
  deleteCategory 
} from "../services/foodCategory.service.js";

// Create
export const create = async (req, res, next) => {
  try {
    const restaurant_id = req.user.restaurant_id; // ✅ from JWT
    const { nom, description, icone_url, ordre_affichage } = req.body;

    if (!restaurant_id) {
      return res.status(403).json({ 
        success: false, 
        message: "Restaurant ID not found in token" 
      });
    }

    const category = await createCategory({
      restaurant_id,
      nom,
      description,
      icone_url,
      ordre_affichage,
    });

    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

// Get All (public - toutes les catégories)
export const getAll = async (req, res, next) => {
  try {
    const categories = await getAllCategories();
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
};

// ✅ NOUVELLE VERSION : Get categories for authenticated restaurant
export const getMyCategories = async (req, res, next) => {
  try {
    const restaurant_id = req.user.restaurant_id; // ✅ from JWT
    
    if (!restaurant_id) {
      return res.status(403).json({ 
        success: false, 
        message: "Restaurant ID not found in token" 
      });
    }

    // Pagination et filtres
    const { 
      page = 1, 
      limit = 20, 
      search,
      sort = 'ordre_affichage' // 'ordre_affichage', 'nom', 'created_at'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Construction du where clause
    const where = { restaurant_id };
    
    if (search && search.trim()) {
      where.nom = { [Op.iLike]: `%${search.trim()}%` };
    }

    // Construction de l'ordre de tri
    let order;
    switch (sort) {
      case 'nom':
        order = [['nom', 'ASC']];
        break;
      case 'created_at':
        order = [['created_at', 'DESC']];
        break;
      case 'ordre_affichage':
      default:
        order = [['ordre_affichage', 'ASC'], ['created_at', 'DESC']];
    }

    const { count, rows } = await FoodCategory.findAndCountAll({
      where,
      order,
      limit: parseInt(limit),
      offset
    });

    res.json({ 
      success: true, 
      data: rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / parseInt(limit)),
        total_items: count,
        items_per_page: parseInt(limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

// Get by Restaurant (ancien - pour admin ou public)
export const getByRestaurant = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const categories = await getCategoriesByRestaurant(restaurantId);
    
    res.json({ 
      success: true, 
      data: categories,
      count: categories.length
    });
  } catch (err) {
    next(err);
  }
};

// Update
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const restaurant_id = req.user.restaurant_id; // ✅ from JWT
    const { nom, description, icone_url, ordre_affichage } = req.body;

    if (!restaurant_id) {
      return res.status(403).json({ 
        success: false, 
        message: "Restaurant ID not found in token" 
      });
    }

    // ✅ Vérifier que la catégorie appartient au restaurant
    const category = await FoodCategory.findOne({ 
      where: { id, restaurant_id } 
    });

    if (!category) {
      return res.status(404).json({ 
        success: false, 
        message: "Food category not found or you don't have permission to modify it" 
      });
    }

    const updated = await updateCategory(id, { 
      nom, 
      description, 
      icone_url, 
      ordre_affichage 
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// Delete
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const restaurant_id = req.user.restaurant_id; // ✅ from JWT

    if (!restaurant_id) {
      return res.status(403).json({ 
        success: false, 
        message: "Restaurant ID not found in token" 
      });
    }

    // ✅ Vérifier que la catégorie appartient au restaurant
    const category = await FoodCategory.findOne({ 
      where: { id, restaurant_id } 
    });

    if (!category) {
      return res.status(404).json({ 
        success: false, 
        message: "Food category not found or you don't have permission to delete it" 
      });
    }

    const deleted = await deleteCategory(id);

    res.json({ 
      success: true, 
      message: "Food category deleted successfully" 
    });
  } catch (err) {
    next(err);
  }
};

// ==================== ADMIN HELPERS ====================

export const adminCreateForRestaurant = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const { nom, description, icone_url, ordre_affichage } = req.body;

    const category = await createCategory({
      restaurant_id: restaurantId,
      nom,
      description,
      icone_url,
      ordre_affichage
    });

    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

export const adminUpdate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nom, description, icone_url, ordre_affichage } = req.body;

    const category = await FoodCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Food category not found"
      });
    }

    const updated = await updateCategory(id, {
      nom,
      description,
      icone_url,
      ordre_affichage
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const adminRemove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await FoodCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Food category not found"
      });
    }

    await deleteCategory(id);
    res.json({
      success: true,
      message: "Food category deleted successfully"
    });
  } catch (err) {
    next(err);
  }
};
