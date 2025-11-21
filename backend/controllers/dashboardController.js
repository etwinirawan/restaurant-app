const db = require('../config/database');

const dashboardController = {
  // Get dashboard statistics
  getDashboardStats: async (req, res) => {
    try {
      // Get total orders (all orders except cancelled)
      const totalOrdersQuery = `
        SELECT COUNT(*) 
        FROM orders 
        WHERE status != 'cancelled'
      `;
      const totalOrdersResult = await db.query(totalOrdersQuery);

      // Get today's orders (all orders except cancelled)
      const todayOrdersQuery = `
        SELECT COUNT(*) 
        FROM orders 
        WHERE DATE(created_at) = CURRENT_DATE
        AND status != 'cancelled'
      `;
      const todayOrdersResult = await db.query(todayOrdersQuery);

      // Get total revenue (ALL orders except cancelled)
      const totalRevenueQuery = `
        SELECT COALESCE(SUM(total_amount), 0) as revenue 
        FROM orders 
        WHERE status != 'cancelled'
      `;
      const totalRevenueResult = await db.query(totalRevenueQuery);

      // Get today's revenue (ALL orders except cancelled)
      const todayRevenueQuery = `
        SELECT COALESCE(SUM(total_amount), 0) as revenue 
        FROM orders 
        WHERE DATE(created_at) = CURRENT_DATE 
        AND status != 'cancelled'
      `;
      const todayRevenueResult = await db.query(todayRevenueQuery);

      // Get completed revenue (for completion rate calculation)
      const completedRevenueQuery = `
        SELECT COALESCE(SUM(total_amount), 0) as revenue 
        FROM orders 
        WHERE status = 'completed'
      `;
      const completedRevenueResult = await db.query(completedRevenueQuery);

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
        LIMIT 10
      `;
      const popularItemsResult = await db.query(popularItemsQuery);

      // Get orders by status
      const ordersByStatusQuery = `
        SELECT 
          status, 
          COUNT(*) as count,
          COALESCE(SUM(total_amount), 0) as total_amount
        FROM orders 
        GROUP BY status
        ORDER BY 
          CASE status 
            WHEN 'pending' THEN 1
            WHEN 'confirmed' THEN 2
            WHEN 'preparing' THEN 3
            WHEN 'ready' THEN 4
            WHEN 'completed' THEN 5
            WHEN 'cancelled' THEN 6
            ELSE 7
          END
      `;
      const ordersByStatusResult = await db.query(ordersByStatusQuery);

      // Get daily revenue for the last 7 days
      const weeklyRevenueQuery = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as order_count,
          COALESCE(SUM(total_amount), 0) as revenue
        FROM orders 
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
        AND status != 'cancelled'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 7
      `;
      const weeklyRevenueResult = await db.query(weeklyRevenueQuery);

      // Get average order value (all orders except cancelled)
      const avgOrderValueQuery = `
        SELECT 
          COALESCE(AVG(total_amount), 0) as avg_order_value,
          COUNT(*) as total_orders
        FROM orders 
        WHERE status != 'cancelled'
      `;
      const avgOrderValueResult = await db.query(avgOrderValueQuery);

      // Get today's order status breakdown
      const todayStatusQuery = `
        SELECT 
          status, 
          COUNT(*) as count
        FROM orders 
        WHERE DATE(created_at) = CURRENT_DATE
        GROUP BY status
      `;
      const todayStatusResult = await db.query(todayStatusQuery);

      // Calculate completion rate
      const totalOrdersCount = parseInt(totalOrdersResult.rows[0].count);
      const completedOrdersCount = ordersByStatusResult.rows.find(row => row.status === 'completed')?.count || 0;
      
      const completionRate = totalOrdersCount > 0 
        ? ((completedOrdersCount / totalOrdersCount) * 100).toFixed(1)
        : 0;

      res.json({
        success: true,
        data: {
          // Basic stats
          totalOrders: totalOrdersCount,
          todayOrders: parseInt(todayOrdersResult.rows[0].count),
          totalRevenue: parseFloat(totalRevenueResult.rows[0].revenue),
          todayRevenue: parseFloat(todayRevenueResult.rows[0].revenue),
          completedRevenue: parseFloat(completedRevenueResult.rows[0].revenue),
          
          // Advanced stats
          avgOrderValue: parseFloat(avgOrderValueResult.rows[0].avg_order_value),
          completedOrders: completedOrdersCount,
          
          // Breakdowns
          popularItems: popularItemsResult.rows,
          ordersByStatus: ordersByStatusResult.rows,
          weeklyRevenue: weeklyRevenueResult.rows,
          todayStatus: todayStatusResult.rows,
          
          // Calculated fields
          completionRate: parseFloat(completionRate),
          
          // Additional useful metrics
          activeOrders: ordersByStatusResult.rows
            .filter(row => ['pending', 'confirmed', 'preparing', 'ready'].includes(row.status))
            .reduce((sum, row) => sum + parseInt(row.count), 0),
          
          cancelledOrders: ordersByStatusResult.rows.find(row => row.status === 'cancelled')?.count || 0
        },
        message: 'Dashboard statistics retrieved successfully'
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Get recent activities
  getRecentActivities: async (req, res) => {
    try {
      const query = `
        SELECT 
          o.*,
          json_agg(
            json_build_object(
              'id', oi.id,
              'menu_item_id', oi.menu_item_id,
              'menu_item_name', m.name,
              'quantity', oi.quantity,
              'price', oi.price
            )
          ) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN menu_items m ON oi.menu_item_id = m.id
        WHERE o.created_at >= CURRENT_DATE - INTERVAL '1 day'
        AND o.status != 'cancelled'
        GROUP BY o.id
        ORDER BY o.created_at DESC
        LIMIT 20
      `;
      
      const result = await db.query(query);
      
      res.json({
        success: true,
        data: result.rows,
        count: result.rowCount,
        message: 'Recent activities retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Get sales report by date range
  getSalesReport: async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      let dateFilter = '';
      let queryParams = [];

      if (startDate && endDate) {
        dateFilter = 'WHERE o.created_at BETWEEN $1 AND $2';
        queryParams = [startDate, endDate];
      } else {
        // Default to last 30 days
        dateFilter = 'WHERE o.created_at >= CURRENT_DATE - INTERVAL \'30 days\'';
      }

      const salesQuery = `
        SELECT 
          DATE(o.created_at) as date,
          COUNT(*) as order_count,
          COUNT(DISTINCT o.customer_phone) as unique_customers,
          COALESCE(SUM(o.total_amount), 0) as total_revenue,
          COALESCE(AVG(o.total_amount), 0) as avg_order_value,
          SUM(oi.quantity) as total_items_sold
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        ${dateFilter}
        AND o.status != 'cancelled'
        GROUP BY DATE(o.created_at)
        ORDER BY date DESC
        LIMIT 30
      `;

      const result = await db.query(salesQuery, queryParams);

      res.json({
        success: true,
        data: result.rows,
        count: result.rowCount,
        message: 'Sales report retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching sales report:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Get kitchen performance metrics
  getKitchenMetrics: async (req, res) => {
    try {
      // Average preparation time by menu item
      const prepTimeQuery = `
        SELECT 
          m.name,
          m.preparation_time as estimated_time,
          COUNT(oi.id) as times_ordered,
          AVG(
            EXTRACT(EPOCH FROM (o.updated_at - o.created_at)) / 60
          ) as actual_avg_time
        FROM order_items oi
        JOIN menu_items m ON oi.menu_item_id = m.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status = 'completed'
        AND o.created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY m.id, m.name, m.preparation_time
        HAVING COUNT(oi.id) >= 3
        ORDER BY times_ordered DESC
        LIMIT 15
      `;

      // Busiest hours
      const busiestHoursQuery = `
        SELECT 
          EXTRACT(HOUR FROM created_at) as hour,
          COUNT(*) as order_count,
          COALESCE(SUM(total_amount), 0) as revenue
        FROM orders 
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND status != 'cancelled'
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY order_count DESC
        LIMIT 10
      `;

      const [prepTimeResult, busiestHoursResult] = await Promise.all([
        db.query(prepTimeQuery),
        db.query(busiestHoursQuery)
      ]);

      res.json({
        success: true,
        data: {
          preparationTimes: prepTimeResult.rows,
          busiestHours: busiestHoursResult.rows
        },
        message: 'Kitchen metrics retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching kitchen metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Get customer analytics
  getCustomerAnalytics: async (req, res) => {
    try {
      // Top customers by spending
      const topCustomersQuery = `
        SELECT 
          customer_name,
          customer_phone,
          COUNT(*) as order_count,
          COALESCE(SUM(total_amount), 0) as total_spent,
          AVG(total_amount) as avg_order_value,
          MAX(created_at) as last_order_date
        FROM orders 
        WHERE status != 'cancelled'
        AND customer_phone IS NOT NULL
        GROUP BY customer_name, customer_phone
        HAVING COUNT(*) >= 2
        ORDER BY total_spent DESC
        LIMIT 10
      `;

      // Customer retention
      const customerRetentionQuery = `
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COUNT(DISTINCT customer_phone) as unique_customers,
          COUNT(DISTINCT CASE 
            WHEN customer_phone IN (
              SELECT DISTINCT customer_phone 
              FROM orders 
              WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
            ) 
            THEN customer_phone 
          END) as returning_customers
        FROM orders 
        WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
        AND customer_phone IS NOT NULL
        AND status != 'cancelled'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC
      `;

      const [topCustomersResult, retentionResult] = await Promise.all([
        db.query(topCustomersQuery),
        db.query(customerRetentionQuery)
      ]);

      res.json({
        success: true,
        data: {
          topCustomers: topCustomersResult.rows,
          customerRetention: retentionResult.rows
        },
        message: 'Customer analytics retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching customer analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Get real-time order status
  getRealTimeOrders: async (req, res) => {
    try {
      const query = `
        SELECT 
          status,
          COUNT(*) as count,
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', id,
              'order_number', order_number,
              'customer_name', customer_name,
              'table_number', table_number,
              'total_amount', total_amount,
              'created_at', created_at,
              'items', (
                SELECT JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'menu_item_name', m.name,
                    'quantity', oi.quantity
                  )
                )
                FROM order_items oi
                JOIN menu_items m ON oi.menu_item_id = m.id
                WHERE oi.order_id = o.id
              )
            )
            ORDER BY created_at DESC
          ) as orders
        FROM orders o
        WHERE status IN ('pending', 'confirmed', 'preparing', 'ready')
        AND created_at >= CURRENT_DATE
        GROUP BY status
        ORDER BY 
          CASE status 
            WHEN 'pending' THEN 1
            WHEN 'confirmed' THEN 2
            WHEN 'preparing' THEN 3
            WHEN 'ready' THEN 4
            ELSE 5
          END
      `;

      const result = await db.query(query);

      res.json({
        success: true,
        data: result.rows,
        message: 'Real-time orders retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching real-time orders:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
};

module.exports = dashboardController;