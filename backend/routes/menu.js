const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');

// GET /api/menu - Get all menu items
router.get('/', menuController.getAllMenuItems);

// GET /api/menu/categories - Get all categories
router.get('/categories', menuController.getCategories);

// GET /api/menu/category/:categoryId - Get menu by category
router.get('/category/:categoryId', menuController.getMenuByCategory);

// POST /api/menu - Create new menu item
router.post('/', menuController.createMenuItem);

module.exports = router;