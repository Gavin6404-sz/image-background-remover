-- Migration: 0001_initial_schema.sql
-- Run this migration to set up the initial database schema and seed data

-- ========== Users Table ==========
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  picture TEXT,
  auth_type TEXT NOT NULL DEFAULT 'email',
  session_token TEXT UNIQUE,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- ========== Subscription Plans Table ==========
CREATE TABLE IF NOT EXISTS subscription_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  quota_monthly INTEGER NOT NULL,
  price_usd REAL NOT NULL,
  paypal_plan_id TEXT,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

INSERT OR REPLACE INTO subscription_plans (id, plan_name, display_name, quota_monthly, price_usd, is_active, sort_order) VALUES
  (1, 'basic', 'Basic', 25, 9.99, 1, 1),
  (2, 'pro', 'Pro', 60, 19.99, 1, 2);

-- ========== User Subscriptions Table ==========
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE NOT NULL,
  plan_id INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  monthly_used INTEGER DEFAULT 0,
  last_reset_date TEXT,
  started_at INTEGER,
  expires_at INTEGER,
  paypal_subscription_id TEXT,
  paypal_customer_id TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

-- ========== Point Packages Table ==========
CREATE TABLE IF NOT EXISTS point_packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  package_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  points INTEGER NOT NULL,
  price_usd REAL NOT NULL,
  paypal_product_id TEXT,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

INSERT OR REPLACE INTO point_packages (id, package_name, display_name, points, price_usd, is_active, sort_order) VALUES
  (1, 'starter', 'Starter', 10, 4.99, 1, 1),
  (2, 'standard', 'Standard', 30, 11.99, 1, 2),
  (3, 'bundle', 'Bundle', 90, 34.99, 1, 3);

-- ========== User Points Table ==========
CREATE TABLE IF NOT EXISTS user_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE NOT NULL,
  points_balance INTEGER DEFAULT 0,
  total_purchased INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ========== Point Purchases Table ==========
CREATE TABLE IF NOT EXISTS point_purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  package_id INTEGER,
  points INTEGER NOT NULL,
  price_usd REAL NOT NULL,
  paypal_order_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ========== Processing History Table ==========
CREATE TABLE IF NOT EXISTS processing_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  quota_type TEXT DEFAULT 'free',
  credits_used INTEGER DEFAULT 1,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ========== Quota Transactions Table ==========
CREATE TABLE IF NOT EXISTS quota_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  quota_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
