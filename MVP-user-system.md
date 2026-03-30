# Image Toolbox - 用户体系 MVP 需求文档

## 1. 项目概述

**项目名称**: Image Toolbox 用户体系  
**版本**: v1.0 MVP  
**日期**: 2026-03-29  
**状态**: 待开发

---

## 2. 功能模块总览

| 模块 | 功能 | 优先级 |
|------|------|--------|
| 认证模块 | Google/GitHub OAuth 登录 | P0 (已完成) |
| 访问控制 | 未登录不能使用 | P0 |
| 额度系统 | 注册赠送 + 扣减 | P0 |
| 个人中心 | 用户信息 + 额度展示 | P0 |
| 订阅系统 | PayPal 预留接口 | P1 |
| 积分系统 | PayPal 预留接口 | P1 |

---

## 3. 定价方案

### 3.1 订阅制

| 套餐 | 额度 | 价格 | API 成本 | 利润 | 利润率 |
|------|------|------|---------|------|--------|
| Basic 基础版 | 50 张/月 | $12.00/月 | $6.00 | $6.00 | 50% |
| Enhanced 加强版 | 100 张/月 | $24.00/月 | $12.00 | $12.00 | 50% |
| Professional 专业版 | 200 张/月 | $48.00/月 | $24.00 | $24.00 | 50% |

**规则**：
- 每月 1 日 00:00 UTC 自动重置
- 可随时取消
- 取消退款按当月剩余额度比例计算

### 3.2 积分制

| 套餐 | 积分 | 价格 | API 成本 | 利润 | 利润率 |
|------|------|------|---------|------|--------|
| Mini | 5 积分 | $1.50 | $0.60 | $0.90 | 60% |
| Starter | 20 积分 | $6.00 | $2.40 | $3.60 | 60% |
| Standard | 60 积分 | $18.00 | $7.20 | $10.80 | 60% |
| Bundle 90 | 90 积分 | $27.00 | $10.80 | $16.20 | 60% |
| Bundle 120 | 120 积分 | $36.00 | $14.40 | $21.60 | 60% |
| Bundle 150 | 150 积分 | $45.00 | $18.00 | $27.00 | 60% |
| 自定义 | 最少 5 积分 | $0.30/积分 | $0.12/积分 | $0.18/积分 | 60% |

**规则**：
- 有效期 3 年（从购买日起）
- 可与订阅叠加使用
- 永不过期（3 年后过期）

### 3.3 免费额度

| 项目 | 数量 | 说明 |
|------|------|------|
| 注册赠送 | 3 次 | 体验用，终身额度 |

---

## 4. 额度使用优先级

```
用户发起处理请求
    ↓
┌─────────────────────────────────┐
│  1. 检查订阅额度                │
│     ├─ 订阅有效 && 未用完       │
│     │       → 扣减订阅额度      │
│     │       → quota_type='subscription'
│     │       → monthly_used++    │
│     │                             │
│     └─ 订阅无效 || 已用完        │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│  2. 检查积分余额                │
│     ├─ 积分 > 0                │
│     │       → 扣减积分          │
│     │       → quota_type='points'
│     │       → points_balance-- │
│     │                             │
│     └─ 积分 = 0                │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│  3. 检查免费额度               │
│     ├─ quota > 0              │
│     │       → 扣减免费额度      │
│     │       → quota_type='free' │
│     │       → quota--          │
│     │                             │
│     └─ quota = 0               │
│             → 提示额度不足      │
└─────────────────────────────────┘
```

---

## 5. 数据库设计

### 5.1 现有表

```sql
-- 用户表（已存在，新增字段）
CREATE TABLE users (
  id TEXT PRIMARY KEY,              -- Google: google_{sub} / GitHub: github_{id}
  email TEXT,                       -- 用户邮箱
  name TEXT,                         -- 显示名称
  picture TEXT,                       -- 头像 URL
  session_token TEXT,                  -- 会话 Token
  quota INTEGER DEFAULT 3,             -- 免费额度（注册赠送）
  total_used INTEGER DEFAULT 0,       -- 累计使用
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);
```

### 5.2 新增表

```sql
-- 额度变动记录表
CREATE TABLE quota_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  amount INTEGER,                 -- 正数: 获得, 负数: 消耗
  balance INTEGER,                  -- 变动后余额
  quota_type TEXT DEFAULT 'free',   -- 'free' / 'subscription' / 'points'
  reason TEXT,                      -- '注册赠送' / '处理图片' / '订阅扣除' / '积分兑换'
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 订阅套餐表
CREATE TABLE subscription_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_name TEXT NOT NULL,          -- 'basic' / 'enhanced' / 'professional'
  display_name TEXT NOT NULL,       -- 显示名称
  quota_monthly INTEGER NOT NULL,   -- 每月额度
  price_usd REAL NOT NULL,         -- 价格 (USD)
  paypal_plan_id TEXT,              -- PayPal Plan ID (预留)
  is_active INTEGER DEFAULT 1,       -- 是否启用
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 用户订阅表
CREATE TABLE user_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE NOT NULL,
  plan_id INTEGER NOT NULL,
  status TEXT DEFAULT 'active',    -- 'active' / 'cancelled' / 'expired'
  monthly_used INTEGER DEFAULT 0,    -- 当月已用
  last_reset_date TEXT,             -- 最后重置日期 (YYYY-MM-DD)
  started_at INTEGER,
  expires_at INTEGER,
  paypal_subscription_id TEXT,      -- PayPal Subscription ID (预留)
  paypal_customer_id TEXT,          -- PayPal Customer ID (预留)
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

-- 积分套餐表
CREATE TABLE point_packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  package_name TEXT NOT NULL,       -- 'starter' / 'standard' / 'bundle90' / 'bundle120' / 'bundle150' / 'custom'
  display_name TEXT NOT NULL,        -- 显示名称
  points INTEGER NOT NULL,           -- 0 表示自定义
  price_usd REAL NOT NULL,          -- 价格 (USD)，0 表示自定义计价
  price_per_point REAL DEFAULT 0,   -- 自定义单价: $0.30
  min_points INTEGER DEFAULT 5,       -- 最少充值积分
  validity_years INTEGER DEFAULT 3,  -- 有效期（年）
  paypal_product_id TEXT,           -- PayPal Product ID (预留)
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 用户积分表
CREATE TABLE user_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE NOT NULL,
  points_balance INTEGER DEFAULT 0,   -- 积分余额
  total_purchased INTEGER DEFAULT 0, -- 累计购买
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 积分购买记录表
CREATE TABLE point_purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  package_id INTEGER,
  points INTEGER NOT NULL,            -- 购买积分数量
  price_usd REAL NOT NULL,          -- 实际支付金额
  expires_at INTEGER NOT NULL,        -- 这批积分过期时间
  paypal_order_id TEXT,             -- PayPal Order ID (预留)
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 6. API 设计

### 6.1 认证相关（已有）

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/auth/login` | POST | Google 登录 |
| `/api/auth/github` | GET | GitHub 登录跳转 |
| `/api/auth/github/callback` | GET | GitHub 回调 |
| `/api/auth/me` | GET | 获取当前用户 |
| `/api/auth/logout` | POST | 退出登录 |

### 6.2 用户相关

| 接口 | 方法 | 说明 |
|------|------|------|
| `GET /api/user/profile` | GET | 获取用户资料（含所有额度状态） |
| `PUT /api/user/profile` | PUT | 更新显示名称、个人简介 |

### 6.3 额度相关

| 接口 | 方法 | 说明 |
|------|------|------|
| `GET /api/user/quotas` | GET | 获取所有类型额度状态 |
| `GET /api/user/quota/history` | GET | 额度变动记录 |

### 6.4 套餐相关（PayPal 预留）

| 接口 | 方法 | 说明 |
|------|------|------|
| `GET /api/plans/subscription` | GET | 获取订阅套餐列表 |
| `GET /api/plans/points` | GET | 获取积分套餐列表 |
| `POST /api/subscribe` | POST | 创建订阅 (PayPal) |
| `GET /api/subscription` | GET | 获取当前订阅状态 |
| `POST /api/subscription/cancel` | POST | 取消订阅（计算退款） |
| `POST /api/points/buy` | POST | 购买积分 (PayPal) |
| `GET /api/points/history` | GET | 积分购买记录 |

### 6.5 处理图片

| 接口 | 方法 | 说明 |
|------|------|------|
| `POST /api/process` | POST | 处理图片（自动扣额度） |

---

## 7. 前端页面

### 7.1 首页访问控制

```
访问首页 (未登录)
    ↓
点击上传按钮
    ↓
┌─────────────────────────────────┐
│         登录对话框                │
│                                 │
│  欢迎回来                        │
│  请先登录以继续使用               │
│                                 │
│  ┌─────────────────────────┐   │
│  │  G  使用 Google 登录    │   │
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │  G  使用 GitHub 登录    │   │
│  └─────────────────────────┘   │
│                                 │
│  ─────────────────────────────  │
│  首次登录即送 3 次免费额度       │
└─────────────────────────────────┘
```

### 7.2 个人中心 (`/profile`)

```
┌─────────────────────────────────────────┐
│  ← 返回首页                              │
├─────────────────────────────────────────┤
│  ┌─────────┐                           │
│  │  头像   │  用户名                    │
│  │         │  user@email.com           │
│  └─────────┘                           │
├─────────────────────────────────────────┤
│  额度信息                                │
│  ┌─────────────────────────────────┐   │
│  │ 免费额度  │  订阅     │  积分     │   │
│  │   0/3   │  45/100  │    60    │   │
│  │ 剩余     │  本月剩余  │  可用     │   │
│  └─────────────────────────────────┘   │
├─────────────────────────────────────────┤
│  账户设置                                │
│  • 显示名称: [________] [保存]            │
│  • 个人简介: [________] [保存]           │
├─────────────────────────────────────────┤
│  额度记录                                │
│  ┌─────────────────────────────────┐   │
│  │ -1 | 处理图片 | 订阅扣除 | 今天 │   │
│  │ -1 | 处理图片 | 积分兑换 | 今天 │   │
│  │ -1 | 处理图片 | 免费额度 | 今天 │   │
│  │ +3 | 注册赠送 | 免费额度 | 昨天 │   │
│  └─────────────────────────────────┘   │
├─────────────────────────────────────────┤
│  [💎 充值积分]  [📦 订阅会员]          │
└─────────────────────────────────────────┘
```

### 7.3 充值页面 (`/pricing`)

```
┌─────────────────────────────────────────┐
│  ← 返回                                  │
├─────────────────────────────────────────┤
│                                          │
│  当前额度                                │
│  ┌─────────────────────────────────┐   │
│  │ 免费额度  │ 订阅      │ 积分      │   │
│  │   0/3   │  45/100  │    60    │   │
│  └─────────────────────────────────┘   │
│                                          │
├─────────────────────────────────────────┤
│                                          │
│  📦 订阅套餐（按月）                     │
│  ┌─────────────────────────────────┐   │
│  │ Basic · 50张/月 · $12.00/月    │   │
│  │ $6.00 利润/用户                │   │
│  ├─────────────────────────────────┤   │
│  │ Enhanced · 100张/月 · $24.00/月 │⭐│
│  │ $12.00 利润/用户               │   │
│  ├─────────────────────────────────┤   │
│  │ Professional · 200张/月 · $48   │   │
│  │ $24.00 利润/用户               │   │
│  └─────────────────────────────────┘   │
│                                          │
│  • 每月 1 日自动重置                     │
│  • 支持取消退款（按比例）                 │
│                                          │
├─────────────────────────────────────────┤
│                                          │
│  💎 积分充值（3 年有效期）               │
│  ┌─────────────────────────────────┐   │
│  │ Mini · 5 积分 · $1.50         │   │
│  ├─────────────────────────────────┤   │
│  │ Starter · 20 积分 · $6.00      │⭐│
│  ├─────────────────────────────────┤   │
│  │ Standard · 60 积分 · $18.00    │   │
│  ├─────────────────────────────────┤   │
│  │ Bundle 90 · 90 积分 · $27.00   │   │
│  ├─────────────────────────────────┤   │
│  │ Bundle 120 · 120 积分 · $36.00 │   │
│  ├─────────────────────────────────┤   │
│  │ Bundle 150 · 150 积分 · $45.00 │   │
│  └─────────────────────────────────┘   │
│                                          │
│  自定义充值                              │
│  ┌─────────────────────────────────┐   │
│  │ 输入积分数量: [____] 积分        │   │
│  │ 单价: $0.30/积分 (最少 5 积分) │   │
│  │ 预计价格: $0.00                 │   │
│  └─────────────────────────────────┘   │
│                                          │
│  有效期: 3 年                           │
│                                          │
└─────────────────────────────────────────┘
```

### 7.4 额度不足弹窗

```
┌─────────────────────────────────────────┐
│  ⚠️ 额度不足                              │
│                                          │
│  您的额度已用完                            │
│                                          │
│  免费额度: 0  │ 订阅: 0/100 │ 积分: 0   │
│                                          │
│  ┌─────────────────────────────────┐   │
│  │ 💎 充值积分                      │   │
│  │    立即到账，支持自定义充值       │   │
│  │    $0.30/积分                   │   │
│  └─────────────────────────────────┘   │
│                                          │
│  ┌─────────────────────────────────┐   │
│  │ 📦 升级订阅                      │   │
│  │    $12.00/月起                   │   │
│  └─────────────────────────────────┘   │
│                                          │
└─────────────────────────────────────────┘
```

---

## 8. 退款规则

### 8.1 订阅取消退款

```
用户取消订阅时
    ↓
检查当月已用额度
    ↓
├─ 已用 = 0
│       → 全额退款
│
├─ 已用 < 每月额度
│       → 按比例退款
│       → 退款 = (每月额度 - 已用) / 每月额度 × 价格
│
└─ 已用 >= 每月额度
        → 不可退款
```

**示例**：Pro 订阅 ($24.00, 100张)，当月使用了 40 张后取消
- 剩余额度：60 张
- 退款 = 60/100 × $24.00 = **$14.40**

### 8.2 积分退款

- 积分一经购买不可退款
- 积分过期后自动失效

---

## 9. PayPal 接口预留（Phase 4-5）

### 9.1 需要创建的产品

1. **订阅产品**：Basic, Enhanced, Professional
2. **积分产品**：各积分套餐

### 9.2 API 预留字段

```sql
-- PayPal 相关字段
paypal_plan_id:           -- 订阅套餐 ID
paypal_subscription_id:   -- 用户订阅 ID
paypal_customer_id:        -- PayPal 客户 ID
paypal_product_id:        -- 积分产品 ID
paypal_order_id:          -- 积分订单 ID
```

---

## 10. 开发计划

| Phase | 内容 | 优先级 | 周期 |
|-------|------|--------|------|
| **Phase 1** | 数据库 + 基础 API | P0 | 1 天 |
| **Phase 2** | 个人中心前端 | P0 | 1 天 |
| **Phase 3** | 访问控制 + 额度扣减 | P0 | 1 天 |
| **Phase 4** | 充值页面 | P1 | 1 天 |
| **Phase 5** | PayPal 订阅接入 | P2 | 待定 |
| **Phase 6** | PayPal 积分接入 | P2 | 待定 |

---

## 11. 技术选型

| 技术 | 说明 |
|------|------|
| 前端 | Next.js + Tailwind CSS + shadcn/ui |
| 后端 | Cloudflare Worker |
| 数据库 | Cloudflare D1 |
| 支付 | PayPal (预留) |

---

## 12. 备注

1. **API 成本**：`$0.12/张` (Remove.bg Standard)
2. **订阅利润**：50%
3. **积分利润**：60%
4. **免费额度**：注册送 3 次
5. **积分有效期**：3 年
