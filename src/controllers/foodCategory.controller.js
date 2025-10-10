import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../services/foodCategory.service.js";
import Restaurant from '../models/Restaurant.js';

//  Create
export const create = async (req, res, next) => {
  try {
    const { restaurant_id, nom, description, icone_url, ordre_affichage } = req.body;
    
    // Check if restaurant exists
    const restaurant = await Restaurant.findByPk(restaurant_id);
    if (!restaurant) {
      return res.status(404).json({ 
        success: false, 
        message: 'Restaurant not found' 
      });
    }
    
    const category = await createCategory({ 
      restaurant_id,
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

//  Get All
export const getAll = async (req, res, next) => {
  try {
    const categories = await getAllCategories();
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
};

//  Get by Restaurant
export const getByRestaurant = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const categories = await getAllCategories();
    const filtered = categories.filter(cat => cat.restaurant_id === restaurantId);
    res.json({ success: true, data: filtered });
  } catch (err) {
    next(err);
  }
};

//  Update
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { restaurant_id, nom, description, icone_url, ordre_affichage } = req.body;

    const updated = await updateCategory(id, { 
      restaurant_id,  // ← ADD THIS!
      nom, 
      description, 
      icone_url, 
      ordre_affichage 
    });
    
    if (!updated) {
      return res.status(404).json({ success: false, message: "Food category not found" });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

//  Delete
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deleteCategory(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Food category not found" });
    }

    res.json({ success: true, message: "Food category deleted successfully" });
  } catch (err) {
    next(err);
  }
};
