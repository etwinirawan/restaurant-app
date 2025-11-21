-- Create database (run this first in psql)
-- CREATE DATABASE resto_db;

-- Connect to database first
-- \c resto_db;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Menu items table
CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    image_url VARCHAR(500),
    is_available BOOLEAN DEFAULT true,
    preparation_time INTEGER DEFAULT 15, -- in minutes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(20) UNIQUE DEFAULT 'ORD' || to_char(CURRENT_DATE, 'YYMMDD') || '-' || lpad(nextval('orders_id_seq'::regclass)::text, 4, '0'),
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20),
    table_number VARCHAR(10),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
    total_amount DECIMAL(10,2) DEFAULT 0 CHECK (total_amount >= 0),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INTEGER REFERENCES menu_items(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO categories (name, description) VALUES 
('Appetizers', 'Start your meal right with our delicious appetizers'),
('Main Course', 'Hearty and satisfying main dishes'),
('Desserts', 'Sweet endings to perfect your meal'),
('Beverages', 'Refreshing drinks and beverages')
ON CONFLICT (name) DO NOTHING;

INSERT INTO menu_items (name, description, price, category_id, preparation_time) VALUES 
('Spring Rolls', 'Crispy vegetable spring rolls with sweet chili sauce', 45000, 1, 10),
('Caesar Salad', 'Fresh romaine lettuce with caesar dressing and croutons', 65000, 1, 8),
('Garlic Bread', 'Toasted bread with garlic butter and herbs', 35000, 1, 5),
('Grilled Salmon', 'Atlantic salmon fillet with lemon butter sauce', 125000, 2, 20),
('Beef Steak', 'Tender beef steak with mushroom sauce and mashed potatoes', 150000, 2, 25),
('Chicken Parmesan', 'Breaded chicken with tomato sauce and melted cheese', 95000, 2, 18),
('Chocolate Cake', 'Rich chocolate layer cake with ganache', 45000, 3, 5),
('Ice Cream', 'Vanilla bean ice cream with chocolate sauce', 35000, 3, 2),
('Cheesecake', 'New York style cheesecake with berry compote', 55000, 3, 5),
('Orange Juice', 'Freshly squeezed orange juice', 25000, 4, 2),
('Coffee', 'Premium arabica coffee', 30000, 4, 5),
('Iced Tea', 'Refreshing iced tea with lemon', 20000, 4, 3)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(is_available);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu ON order_items(menu_item_id);