const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Dashboard stats
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 Dashboard stats requested');
    
    // Get total orders (all orders except cancelled)
    const totalOrdersQuery = `
      SELECT COUNT(*) as count
      FROM orders 
      WHERE status != 'cancelled'
    `;
    const totalOrdersResult = await db.query(totalOrdersQuery);
    const totalOrders = parseInt(totalOrdersResult.rows[0].count);

    // Get today's orders (all orders except cancelled)
    const todayOrdersQuery = `
      SELECT COUNT(*) as count
      FROM orders 
      WHERE DATE(created_at) = CURRENT_DATE
      AND status != 'cancelled'
    `;
    const todayOrdersResult = await db.query(todayOrdersQuery);
    const todayOrders = parseInt(todayOrdersResult.rows[0].count);

    // Get total revenue (ALL orders except cancelled)
    const totalRevenueQuery = `
      SELECT COALESCE(SUM(total_amount), 0) as revenue 
      FROM orders 
      WHERE status != 'cancelled'
    `;
    const totalRevenueResult = await db.query(totalRevenueQuery);
    const totalRevenue = parseFloat(totalRevenueResult.rows[0].revenue);

    // Get today's revenue (ALL orders except cancelled)
    const todayRevenueQuery = `
      SELECT COALESCE(SUM(total_amount), 0) as revenue 
      FROM orders 
      WHERE DATE(created_at) = CURRENT_DATE 
      AND status != 'cancelled'
    `;
    const todayRevenueResult = await db.query(todayRevenueQuery);
    const todayRevenue = parseFloat(todayRevenueResult.rows[0].revenue);

    // Get orders by status
    const ordersByStatusQuery = `
      SELECT 
        status, 
        COUNT(*) as count
      FROM orders 
      GROUP BY status
    `;
    const ordersByStatusResult = await db.query(ordersByStatusQuery);

    // DEBUG: Log orders by status
    console.log('📋 Orders by Status RAW:', ordersByStatusResult.rows);

    // Get active orders directly from database - ALL STATUS FROM PENDING TO READY
    const activeOrdersQuery = `
      SELECT COUNT(*) as count
      FROM orders 
      WHERE status IN ('pending', 'confirmed', 'preparing', 'ready')
    `;
    const activeOrdersResult = await db.query(activeOrdersQuery);
    const activeOrders = parseInt(activeOrdersResult.rows[0].count);

    // Get popular menu items
    const popularItemsQuery = `
      SELECT 
        m.name,
        m.id,
        COUNT(oi.id) as order_count,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.quantity * oi.price) as total_revenue
      FROM order_items oi
      JOIN menu_items m ON oi.menu_item_id = m.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status != 'cancelled'
      GROUP BY m.id, m.name
      ORDER BY total_quantity DESC
      LIMIT 5
    `;
    const popularItemsResult = await db.query(popularItemsQuery);

    console.log('📊 Final Dashboard Stats:', {
      totalOrders,
      todayOrders,
      totalRevenue,
      todayRevenue,
      activeOrders,
      allStatuses: ordersByStatusResult.rows
    });

    res.json({
      success: true,
      data: {
        totalOrders,
        todayOrders,
        totalRevenue,
        todayRevenue,
        activeOrders,
        popularItems: popularItemsResult.rows,
        ordersByStatus: ordersByStatusResult.rows
      },
      message: 'Dashboard stats loaded successfully'
    });

  } catch (error) {
    console.error('❌ Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard stats',
      error: error.message
    });
  }
});

module.exports = router;