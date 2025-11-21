const db = require('../config/database');

// Store connected clients for SSE
const clients = new Set();

// SSE endpoint for real-time updates
const setupSSE = (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  res.write('\n');
  
  const clientId = Date.now();
  clients.add(res);
  
  console.log(`🔗 New SSE client connected: ${clientId}`);
  
  // Send initial data
  sendDashboardUpdate();
  
  req.on('close', () => {
    clients.delete(res);
    console.log(`🔌 SSE client disconnected: ${clientId}`);
  });
};

// Function to send updates to all connected clients
const sendDashboardUpdate = async () => {
  try {
    const dashboardData = await getRealTimeDashboardData();
    
    const update = {
      type: 'dashboard_update',
      data: dashboardData,
      timestamp: new Date().toISOString()
    };
    
    clients.forEach(client => {
      client.write(`data: ${JSON.stringify(update)}\n\n`);
    });
    
    console.log('📢 Sent real-time update to clients');
  } catch (error) {
    console.error('Error sending SSE update:', error);
  }
};

// Get real-time dashboard data
const getRealTimeDashboardData = async () => {
  try {
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

    // Get active orders directly from database
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

    // Calculate completion rate
    const totalOrdersCount = parseInt(totalOrdersResult.rows[0].count);
    const completedOrdersCount = ordersByStatusResult.rows.find(row => row.status === 'completed')?.count || 0;
    
    const completionRate = totalOrdersCount > 0 
      ? ((completedOrdersCount / totalOrdersCount) * 100).toFixed(1)
      : 0;

    console.log('📊 Real-time Dashboard Stats:', {
      totalOrders,
      todayOrders,
      totalRevenue,
      todayRevenue,
      activeOrders,
      completedOrders: completedOrdersCount,
      completionRate
    });

    return {
      totalOrders,
      todayOrders,
      totalRevenue,
      todayRevenue,
      activeOrders,
      completedOrders: completedOrdersCount,
      completionRate: parseFloat(completionRate),
      popularItems: popularItemsResult.rows,
      ordersByStatus: ordersByStatusResult.rows
    };
  } catch (error) {
    console.error('Error getting real-time data:', error);
    throw error;
  }
};

const orderController = {
  // Create new order - UPDATED with real-time notification
  createOrder: async (req, res) => {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { customer_name, customer_phone, table_number, items, notes } = req.body;
      
      // Validate items
      if (!items || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Order must contain at least one item'
        });
      }
      
      // Calculate total amount and validate menu items
      let totalAmount = 0;
      for (const item of items) {
        const menuResult = await client.query(
          'SELECT price, name, is_available FROM menu_items WHERE id = $1',
          [item.menu_item_id]
        );
        
        if (menuResult.rows.length === 0) {
          throw new Error(`Menu item with ID ${item.menu_item_id} not found`);
        }
        
        if (!menuResult.rows[0].is_available) {
          throw new Error(`Menu item "${menuResult.rows[0].name}" is not available`);
        }
        
        totalAmount += menuResult.rows[0].price * item.quantity;
      }
      
      // Insert order
      const orderResult = await client.query(
        `INSERT INTO orders (customer_name, customer_phone, table_number, total_amount, notes) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [customer_name, customer_phone, table_number, totalAmount, notes]
      );
      
      const order = orderResult.rows[0];
      
      // Insert order items
      for (const item of items) {
        const menuResult = await client.query(
          'SELECT price, name FROM menu_items WHERE id = $1',
          [item.menu_item_id]
        );
        
        await client.query(
          `INSERT INTO order_items (order_id, menu_item_id, quantity, price, notes) 
           VALUES ($1, $2, $3, $4, $5)`,
          [order.id, item.menu_item_id, item.quantity, menuResult.rows[0].price, item.notes || '']
        );
      }
      
      await client.query('COMMIT');
      
      // Get complete order details with items
      const completeOrder = await client.query(`
        SELECT 
          o.*,
          json_agg(
            json_build_object(
              'id', oi.id,
              'menu_item_id', oi.menu_item_id,
              'menu_item_name', m.name,
              'quantity', oi.quantity,
              'price', oi.price,
              'notes', oi.notes
            )
          ) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN menu_items m ON oi.menu_item_id = m.id
        WHERE o.id = $1
        GROUP BY o.id
      `, [order.id]);
      
      // Send WhatsApp notification (simulated)
      sendWhatsAppNotification(completeOrder.rows[0]);
      
      // 🔥 SEND REAL-TIME UPDATE TO ALL CONNECTED CLIENTS
      sendDashboardUpdate();
      
      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: completeOrder.rows[0]
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating order:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating order',
        error: error.message
      });
    } finally {
      client.release();
    }
  },

  // Update order status - UPDATED with real-time notification
  updateOrderStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
        });
      }
      
      const result = await db.query(
        'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [status, id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      
      // 🔥 SEND REAL-TIME UPDATE TO ALL CONNECTED CLIENTS
      sendDashboardUpdate();
      
      res.json({
        success: true,
        message: 'Order status updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Get all orders
  getAllOrders: async (req, res) => {
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
              'price', oi.price,
              'notes', oi.notes
            )
          ) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN menu_items m ON oi.menu_item_id = m.id
        GROUP BY o.id
        ORDER BY o.created_at DESC
      `;
      
      const result = await db.query(query);
      res.json({
        success: true,
        data: result.rows,
        count: result.rowCount
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Get order by ID
  getOrderById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const query = `
        SELECT 
          o.*,
          json_agg(
            json_build_object(
              'id', oi.id,
              'menu_item_id', oi.menu_item_id,
              'menu_item_name', m.name,
              'quantity', oi.quantity,
              'price', oi.price,
              'notes', oi.notes
            )
          ) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN menu_items m ON oi.menu_item_id = m.id
        WHERE o.id = $1
        GROUP BY o.id
      `;
      
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      
      res.json({
        success: true,
        data: result.rows[0],
        message: 'Order retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching order:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Delete order
  deleteOrder: async (req, res) => {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      
      // Check if order exists
      const orderCheck = await client.query('SELECT * FROM orders WHERE id = $1', [id]);
      if (orderCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      
      // Delete order items first (due to foreign key constraint)
      await client.query('DELETE FROM order_items WHERE order_id = $1', [id]);
      
      // Delete order
      const result = await client.query('DELETE FROM orders WHERE id = $1 RETURNING *', [id]);
      
      await client.query('COMMIT');
      
      // 🔥 SEND REAL-TIME UPDATE TO ALL CONNECTED CLIENTS
      sendDashboardUpdate();
      
      res.json({
        success: true,
        message: 'Order deleted successfully',
        data: result.rows[0]
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deleting order:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting order',
        error: error.message
      });
    } finally {
      client.release();
    }
  },

  // Get orders by status
  getOrdersByStatus: async (req, res) => {
    try {
      const { status } = req.params;
      
      const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
        });
      }
      
      const query = `
        SELECT 
          o.*,
          json_agg(
            json_build_object(
              'id', oi.id,
              'menu_item_id', oi.menu_item_id,
              'menu_item_name', m.name,
              'quantity', oi.quantity,
              'price', oi.price,
              'notes', oi.notes
            )
          ) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN menu_items m ON oi.menu_item_id = m.id
        WHERE o.status = $1
        GROUP BY o.id
        ORDER BY o.created_at DESC
      `;
      
      const result = await db.query(query, [status]);
      
      res.json({
        success: true,
        data: result.rows,
        count: result.rowCount,
        message: `Orders with status '${status}' retrieved successfully`
      });
    } catch (error) {
      console.error('Error fetching orders by status:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
};

// WhatsApp notification function
function sendWhatsAppNotification(order) {
  let message = `🆕 *NEW ORDER RECEIVED* 🆕\n`;
  message += `📋 Order #: ${order.order_number}\n`;
  message += `👤 Customer: ${order.customer_name}\n`;
  message += `📞 Phone: ${order.customer_phone || 'N/A'}\n`;
  message += `🪑 Table: ${order.table_number || 'Takeaway'}\n`;
  message += `💰 Total: Rp ${order.total_amount.toLocaleString()}\n`;
  message += `📝 Notes: ${order.notes || 'No notes'}\n\n`;
  message += `📦 Order Items:\n`;
  
  order.items.forEach((item, index) => {
    if (item.menu_item_name) {
      message += `${index + 1}. ${item.menu_item_name} x${item.quantity} - Rp ${(item.price * item.quantity).toLocaleString()}\n`;
    }
  });
  
  console.log('📱 WhatsApp Notification:');
  console.log('=' .repeat(50));
  console.log(message);
  console.log('=' .repeat(50));
}

// Export both controller and SSE functions
module.exports = {
  orderController,
  setupSSE,
  sendDashboardUpdate
};