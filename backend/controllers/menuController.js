const db = require('../config/database');

const menuController = {
  // Get all menu items with categories
  getAllMenuItems: async (req, res) => {
    try {
      const query = `
        SELECT 
          m.*,
          c.name as category_name,
          c.description as category_description
        FROM menu_items m
        LEFT JOIN categories c ON m.category_id = c.id
        WHERE m.is_available = true
        ORDER BY c.name, m.name
      `;
      
      const result = await db.query(query);
      res.json({
        success: true,
        data: result.rows,
        count: result.rowCount
      });
    } catch (error) {
      console.error('Error fetching menu:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Get menu items by category
  getMenuByCategory: async (req, res) => {
    try {
      const { categoryId } = req.params;
      const query = `
        SELECT m.*, c.name as category_name
        FROM menu_items m
        LEFT JOIN categories c ON m.category_id = c.id
        WHERE m.category_id = $1 AND m.is_available = true
        ORDER BY m.name
      `;
      
      const result = await db.query(query, [categoryId]);
      res.json({
        success: true,
        data: result.rows,
        count: result.rowCount
      });
    } catch (error) {
      console.error('Error fetching menu by category:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Get all categories
  getCategories: async (req, res) => {
    try {
      const query = 'SELECT * FROM categories ORDER BY name';
      const result = await db.query(query);
      res.json({
        success: true,
        data: result.rows,
        count: result.rowCount
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Create new menu item
  createMenuItem: async (req, res) => {
    try {
      const { name, description, price, category_id, image_url, is_available, preparation_time } = req.body;
      
      const query = `
        INSERT INTO menu_items (name, description, price, category_id, image_url, is_available, preparation_time)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const values = [name, description, price, category_id, image_url, is_available || true, preparation_time || 15];
      const result = await db.query(query, values);
      
      res.status(201).json({
        success: true,
        message: 'Menu item created successfully',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error creating menu item:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
};

module.exports = menuController;