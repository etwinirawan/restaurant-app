const express = require('express');
const router = express.Router();
const { orderController, setupSSE } = require('../controllers/orderController');

// Existing routes
router.post('/', orderController.createOrder);
router.get('/', orderController.getAllOrders);
router.put('/:id/status', orderController.updateOrderStatus);

// 🔥 NEW: Real-time updates endpoint
router.get('/stream', setupSSE);

module.exports = router;