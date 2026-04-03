# Image Toolbox - 用户体系 MVP 需求文档

## 1. 项目概述

**项目名称**: Image Toolbox 用户体系  
**版本**: v2.0 MVP  
**日期**: 2026-04-01  
**状态**: 待开发

---

## 2. 功能模块总览

| 模块 | 功能 | 优先级 | 状态 |
|------|------|--------|------|
| 认证模块 | Google OAuth 登录 | P0 | ✅ 已完成 |
| 认证模块 | GitHub OAuth 登录 | P0 | ✅ 已完成 |
| 认证模块 | 邮箱注册/登录 | P0 | 📋 待开发 |
| 访问控制 | 未登录不能使用 | P0 | 📋 待开发 |
| 额度系统 | 注册赠送 + 扣减 | P0 | 📋 待开发 |
| 个人中心 | 用户信息 + 额度展示 | P0 | 📋 待开发 |
| 定价页面 | 订阅/积分展示 | P1 | 📋 待开发 |
| FAQ 页面 | 常见问题 | P1 | 📋 待开发 |
| 订阅系统 | PayPal 预留接口 | P2 | 📋 后期 |
| 积分系统 | PayPal 预留接口 | P2 | 📋 后期 |

---

## 3. 定价方案

**API 成本**: $0.12/张 (Remove.bg Standard)

### 3.1 订阅制（按月，自动重置）

| 套餐 | 额度 | API 成本 | 售价 | 利润 | 利润率 |
|------|------|---------|------|------|--------|
| Basic | 25 次/月 | $3.00 | $9.99 | $6.99 | 70% |
| Pro | 60 次/月 | $7.20 | $19.99 | $12.79 | 64% |

**规则**：
- 每月 1 日 00:00 UTC 自动重置额度
- 可随时取消订阅
- 取消退款按当月剩余额度比例计算

### 3.2 积分制（永久有效）

| 套餐 | 次数 | API 成本 | 售价 | 利润 | 利润率 |
|------|------|---------|------|------|--------|
| Starter | 10 次 | $1.20 | $4.99 | $3.79 | 76% |
| Standard | 30 次 | $3.60 | $12.99 | $9.39 | 72% |
| Bundle | 90 次 | $10.80 | $29.99 | $19.19 | 64% |

**规则**：
- 永久有效，无过期时间
- 可与订阅叠加使用
- 积分用完可再购买

### 3.3 免费额度

| 项目 | 数量 | 说明 |
|------|------|------|
| 注册赠送 | 3 次 | 一次性，终身有效 |

---

## 4. 用户权限分层

| 角色 | 权限 | 说明 |
|------|------|------|
| **未登录访客** | 看预览，不能下载 | 吸引注册 |
| **已注册用户** | 免费 3 次 | 注册即送，体验完整功能 |
| **付费用户** | 订阅/积分无限制 | 按需购买 |

### 权限说明

| 操作 | 未登录 | 已登录(免费额度) | 付费用户 |
|------|--------|-----------------|---------|
| 查看首页 | ✅ | ✅ | ✅ |
| 上传图片 | ✅ | ✅ | ✅ |
| AI 背景移除 | ❌ | ✅ (扣额度) | ✅ (扣额度) |
| 下载结果 | ❌ | ✅ | ✅ |
| 重新处理 | ❌ | ✅ (扣额度) | ✅ (扣额度) |

---

## 5. 额度使用优先级

**核心原则：免费额度 > 订阅额度 > 积分额度**

```
用户发起处理请求
    ↓
┌─────────────────────────────────┐
│  1. 检查免费额度（最高优先级）   │
│     ├─ quota > 0               │
│     │       → 扣减免费额度      │
│     │       → quota_type='free' │
│     │       → quota--          │
│     │                            │
│     └─ quota = 0               │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│  2. 检查订阅额度（次优先级）     │
│     ├─ 订阅有效 && monthly_used < quota_monthly │
│     │       → 扣减订阅额度      │
│     │       → quota_type='subscription' │
│     │       → monthly_used++    │
│     │                            │
│     └─ 订阅无效 || 已用完       │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│  3. 检查积分余额（最低优先级）   │
│     ├─ 积分 > 0                │
│     │       → 扣减积分          │
│     │       → quota_type='points' │
│     │       → points_balance-- │
│     │                            │
│     └─ 积分 = 0                 │
│             → 提示"额度不足"      │
└─────────────────────────────────┘
```

---

## 6. 注册登录方式

### 6.1 已支持

| 方式 | 状态 | 说明 |
|------|------|------|
| Google OAuth | ✅ 已完成 | 一键登录 |
| GitHub OAuth | ✅ 已完成 | 一键登录 |

### 6.2 待开发

| 方式 | 说明 |
|------|------|
| 邮箱注册/登录 | 邮箱 + 密码登录 |
| 用户名注册/登录 | 用户名 + 密码登录 |

### 6.3 登录注册页面设计

```
┌─────────────────────────────────────┐
│         登录 / 注册                   │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Continue with Google       │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Continue with GitHub       │   │
│  └─────────────────────────────┘   │
│                                     │
│  ─────────── 或 ───────────        │
│                                     │
│  邮箱/用户名: [________________]   │
│  密码: [____________________]      │
│                                     │
│  ┌─────────────────────────────┐   │
│  │       登录 / 注册            │   │
│  └─────────────────────────────┘   │
│                                     │
│  首次登录即送 3 次免费额度          │
└─────────────────────────────────────┘
```

---

## 7. 数据库设计

### 7.1 现有表（users）

```sql
-- 用户表（已存在，新增字段）
CREATE TABLE users (
  id TEXT PRIMARY KEY,                    -- UUID 或 oauth id
  email TEXT,                              -- 用户邮箱
  username TEXT UNIQUE,                  -- 用户名（可选）
  name TEXT,                              -- 显示名称
  picture TEXT,                           -- 头像 URL
  password_hash TEXT,                     -- 密码哈希（邮箱注册用）
  auth_type TEXT DEFAULT 'google',        -- 'google' / 'github' / 'email'
  session_token TEXT,                      -- 会话 Token
  quota INTEGER DEFAULT 3,                -- 免费额度（注册赠送）
  total_used INTEGER DEFAULT 0,           -- 累计使用
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);
```

### 7.2 新增表

```sql
-- 额度变动记录表
CREATE TABLE quota_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  amount INTEGER,                         -- 正数: 获得, 负数: 消耗
  balance INTEGER,                        -- 变动后余额
  quota_type TEXT DEFAULT 'free',         -- 'free' / 'subscription' / 'points'
  reason TEXT,                             -- '注册赠送' / '处理图片' / '订阅扣除' / '积分兑换'
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 订阅套餐表
CREATE TABLE subscription_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_name TEXT NOT NULL,                -- 'basic' / 'pro'
  display_name TEXT NOT NULL,             -- 显示名称
  quota_monthly INTEGER NOT NULL,          -- 每月额度
  price_usd REAL NOT NULL,                -- 价格 (USD)
  paypal_plan_id TEXT,                    -- PayPal Plan ID (预留)
  is_active INTEGER DEFAULT 1,             -- 是否启用
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 用户订阅表
CREATE TABLE user_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE NOT NULL,
  plan_id INTEGER NOT NULL,
  status TEXT DEFAULT 'active',           -- 'active' / 'cancelled' / 'expired'
  monthly_used INTEGER DEFAULT 0,          -- 当月已用
  last_reset_date TEXT,                   -- 最后重置日期 (YYYY-MM-DD)
  started_at INTEGER,
  expires_at INTEGER,
  paypal_subscription_id TEXT,            -- PayPal Subscription ID (预留)
  paypal_customer_id TEXT,                -- PayPal Customer ID (预留)
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

-- 积分套餐表
CREATE TABLE point_packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  package_name TEXT NOT NULL,             -- 'starter' / 'standard' / 'bundle'
  display_name TEXT NOT NULL,              -- 显示名称
  points INTEGER NOT NULL,                 -- 积分/次数
  price_usd REAL NOT NULL,                -- 价格 (USD)
  paypal_product_id TEXT,                 -- PayPal Product ID (预留)
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 用户积分表
CREATE TABLE user_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE NOT NULL,
  points_balance INTEGER DEFAULT 0,        -- 积分余额
  total_purchased INTEGER DEFAULT 0,      -- 累计购买
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 积分购买记录表
CREATE TABLE point_purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  package_id INTEGER,
  points INTEGER NOT NULL,                -- 购买积分数量
  price_usd REAL NOT NULL,                -- 实际支付金额
  paypal_order_id TEXT,                   -- PayPal Order ID (预留)
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 处理历史记录表
CREATE TABLE processing_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  quota_type TEXT,                        -- 'free' / 'subscription' / 'points'
  credits_used INTEGER DEFAULT 1,          -- 消耗积分
  status TEXT DEFAULT 'success',           -- 'success' / 'failed'
  error_message TEXT,                     -- 失败原因（如果有）
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 8. API 设计

### 8.1 认证相关

| 接口 | 方法 | 说明 | 状态 |
|------|------|------|------|
| `/api/auth/login` | POST | Google 登录 | ✅ 已完成 |
| `/api/auth/github` | GET | GitHub 登录跳转 | ✅ 已完成 |
| `/api/auth/github/callback` | GET | GitHub 回调 | ✅ 已完成 |
| `/api/auth/register` | POST | 邮箱/用户名注册 | 📋 待开发 |
| `/api/auth/login/email` | POST | 邮箱登录 | 📋 待开发 |
| `/api/auth/login/username` | POST | 用户名登录 | 📋 待开发 |
| `/api/auth/me` | GET | 获取当前用户 | ✅ 已完成 |
| `/api/auth/logout` | POST | 退出登录 | ✅ 已完成 |

### 8.2 用户相关

| 接口 | 方法 | 说明 |
|------|------|------|
| `GET /api/user/profile` | GET | 获取用户资料（含所有额度状态） |
| `PUT /api/user/profile` | PUT | 更新显示名称、个人简介 |

### 8.3 额度相关

| 接口 | 方法 | 说明 |
|------|------|------|
| `GET /api/user/quotas` | GET | 获取所有类型额度状态 |
| `GET /api/user/quota/history` | GET | 额度变动记录 |

### 8.4 处理历史

| 接口 | 方法 | 说明 |
|------|------|------|
| `GET /api/user/history` | GET | 获取处理历史（支持分页+筛选） |
| `GET /api/user/history/stats` | GET | 获取统计概览 |

### 8.5 套餐相关

| 接口 | 方法 | 说明 |
|------|------|------|
| `GET /api/plans/subscription` | GET | 订阅套餐列表 |
| `GET /api/plans/points` | GET | 积分套餐列表 |

### 8.6 支付相关（PayPal 预留）

| 接口 | 方法 | 说明 |
|------|------|------|
| `POST /api/subscribe` | POST | 创建订阅 |
| `GET /api/subscription` | GET | 获取当前订阅状态 |
| `POST /api/subscription/cancel` | POST | 取消订阅 |
| `POST /api/points/buy` | POST | 购买积分 |
| `GET /api/points/history` | GET | 积分购买记录 |

### 8.7 处理图片

| 接口 | 方法 | 说明 |
|------|------|------|
| `POST /api/process` | POST | 处理图片（自动扣额度） |

---

## 9. 前端页面

### 9.1 首页访问控制

```
未登录用户
    ↓ 点击上传/处理
┌─────────────────────────────────┐
│         登录对话框               │
│                                 │
│  欢迎使用 Image Toolbox         │
│  请先登录以继续使用              │
│                                 │
│  ┌─────────────────────────┐   │
│  │  Continue with Google   │   │
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │  Continue with GitHub  │   │
│  └─────────────────────────┘   │
│                                 │
│  ─────────── 或 ───────────    │
│  邮箱/用户名: [____________]   │
│  密码: [__________________]   │
│  ┌─────────────────────────┐   │
│  │     登录 / 注册          │   │
│  └─────────────────────────┘   │
│                                 │
│  🎁 首次登录即送 3 次免费额度   │
└─────────────────────────────────┘
```

### 9.2 个人中心 (`/profile`)

```
┌─────────────────────────────────────────┐
│  ← 返回首页                              │
├─────────────────────────────────────────┤
│  ┌─────────┐                           │
│  │  头像   │  用户名                    │
│  │         │  user@email.com           │
│  │         │  注册于 2026-03-25        │
│  └─────────┘                           │
├─────────────────────────────────────────┤
│  额度概览                                │
│  ┌─────────────────────────────────┐   │
│  │ 免费额度 │  订阅     │  积分      │   │
│  │   2/3   │  45/60   │    28     │   │
│  │ 剩余     │  本月剩余  │  可用      │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [💎 充值积分]  [📦 订阅会员]           │
├─────────────────────────────────────────┤
│  账户设置                                │
│  • 显示名称: [________] [保存]           │
│  • 个人简介: [________] [保存]           │
├─────────────────────────────────────────┤
│  处理历史                      [筛选 ▼]  │
│  ┌─────────────────────────────────┐   │
│  │ 时间         │ 类型   │ 状态       │   │
│  │ 15:30 今天   │ 免费   │ ✅ 成功   │   │
│  │ 14:22 今天   │ 订阅   │ ✅ 成功   │   │
│  │ 10:15 昨天   │ 积分   │ ✅ 成功   │   │
│  │ 09:30 04-01 │ 免费   │ ❌ 失败   │   │
│  └─────────────────────────────────┘   │
│  < 1 2 3 >  共 12 条                   │
└─────────────────────────────────────────┘
```

### 9.3 处理历史功能

| 功能 | 说明 |
|------|------|
| 列表展示 | 时间、额度类型、消耗、状态 |
| 筛选 | 时间范围、额度类型、状态 |
| 分页 | 每页 20 条 |
| 统计 | 本月使用汇总 |

### 9.4 定价页面 (`/pricing`)

```
┌─────────────────────────────────────────┐
│  ← 返回                                  │
├─────────────────────────────────────────┤
│                                          │
│  💰 当前额度                              │
│  ┌─────────────────────────────────┐   │
│  │ 免费额度 │ 订阅       │ 积分       │   │
│  │   0/3   │  45/60    │    28     │   │
│  └─────────────────────────────────┘   │
│                                          │
├─────────────────────────────────────────┤
│                                          │
│  📦 订阅套餐（按月，自动重置）            │
│  ┌─────────────────────────────────┐   │
│  │ Basic · 25次/月                 │   │
│  │ $9.99/月                        │   │
│  │ [立即订阅]                      │   │
│  ├─────────────────────────────────┤   │
│  │ ⭐ Pro · 60次/月                │   │
│  │ $19.99/月                       │⭐│
│  │ [立即订阅]                      │   │
│  └─────────────────────────────────┘   │
│                                          │
│  • 每月 1 日自动重置额度                  │
│  • 支持随时取消                          │
│                                          │
├─────────────────────────────────────────┤
│                                          │
│  💎 积分充值（永久有效）                  │
│  ┌─────────────────────────────────┐   │
│  │ Starter · 10次 · $4.99         │   │
│  │ [立即购买]                      │   │
│  ├─────────────────────────────────┤   │
│  │ ⭐ Standard · 30次 · $12.99      │   │
│  │ [立即购买]                      │   │
│  ├─────────────────────────────────┤   │
│  │ Bundle · 90次 · $29.99         │   │
│  │ [立即购买]                      │   │
│  └─────────────────────────────────┘   │
│                                          │
│  • 积分永久有效，可与订阅叠加使用         │
│                                          │
└─────────────────────────────────────────┘
```

### 9.5 额度不足弹窗

```
┌─────────────────────────────────────────┐
│  ⚠️ 额度不足                              │
│                                          │
│  您的额度已用完                            │
│                                          │
│  免费额度: 0  │ 订阅: 0/60 │ 积分: 0   │
│                                          │
│  ┌─────────────────────────────────┐   │
│  │ 💎 充值积分                      │   │
│  │    $4.99 起，永久有效            │   │
│  │    [立即充值]                    │   │
│  └─────────────────────────────────┘   │
│                                          │
│  ┌─────────────────────────────────┐   │
│  │ 📦 订阅会员                      │   │
│  │    $9.99/月 起                   │   │
│  │    [立即订阅]                    │   │
│  └─────────────────────────────────┘   │
│                                          │
└─────────────────────────────────────────┘
```

### 9.6 FAQ 页面 (`/faq`)

```
┌─────────────────────────────────────────┐
│  ← 返回                                  │
├─────────────────────────────────────────┤
│                                          │
│  常见问题 FAQ                            │
│                                          │
│  Q: 如何获得免费试用？                    │
│  A: 注册账号即送 3 次免费额度            │
│                                          │
│  Q: 订阅和积分有什么区别？                │
│  A: 订阅按月计算，额度每月重置；         │
│     积分永久有效，可与订阅叠加使用        │
│                                          │
│  Q: 额度用完了怎么办？                    │
│  A: 可购买积分或订阅套餐                 │
│                                          │
│  Q: 可以退款吗？                         │
│  A: 订阅可按比例退款，积分购买不可退      │
│                                          │
│  Q: 如何取消订阅？                        │
│  A: 在个人中心随时取消                   │
│                                          │
│  Q: 图片处理需要多久？                    │
│  A: 通常 3-5 秒                          │
│                                          │
│  Q: 支持哪些图片格式？                    │
│  A: JPG、PNG、WebP，最大 10MB            │
│                                          │
│  Q: 积分会过期吗？                        │
│  A: 积分永久有效，无过期时间              │
│                                          │
└─────────────────────────────────────────┘
```

---

## 10. 转化漏斗

```
访客 → 注册 → 体验免费额度 → 额度不足 → 引导充值 → 付费
  │       │         │           │           │
  │       │         │           │           ↓
  │       │         │           └─→ [积分充值] 或 [订阅套餐]
  │       │         └─→ 展示已用 X/3 次
  │       └─→ 注册送 3 次
  └─→ 首屏展示工具能力
```

---

## 11. 退款规则

### 11.1 订阅取消退款

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

**示例**：Pro 订阅 ($19.99, 60次)，当月使用了 20 次后取消
- 剩余额度：40 次
- 退款 = 40/60 × $19.99 = **$13.33**

### 11.2 积分退款

- 积分一经购买不可退款
- 积分过期后自动失效

---

## 12. PayPal 接口预留（后期）

### 12.1 需要创建的产品

1. **订阅产品**：Basic, Pro
2. **积分产品**：Starter, Standard, Bundle

### 12.2 API 预留字段

```sql
-- PayPal 相关字段
paypal_plan_id:           -- 订阅套餐 ID
paypal_subscription_id:   -- 用户订阅 ID
paypal_customer_id:       -- PayPal 客户 ID
paypal_product_id:        -- 积分产品 ID
paypal_order_id:          -- 积分订单 ID
```

---

## 13. 开发计划

| Phase | 内容 | 优先级 | 周期 |
|-------|------|--------|------|
| **Phase 1** | 数据库 + 基础 API | P0 | 1 天 |
| **Phase 2** | 个人中心前端 | P0 | 1 天 |
| **Phase 3** | 访问控制 + 额度扣减 | P0 | 1 天 |
| **Phase 4** | 定价页面 + FAQ | P1 | 1 天 |
| **Phase 5** | 邮箱注册/登录 | P1 | 1 天 |
| **Phase 6** | PayPal 订阅接入 | P2 | 待定 |
| **Phase 7** | PayPal 积分接入 | P2 | 待定 |

---

## 14. 技术选型

| 技术 | 说明 |
|------|------|
| 前端 | Next.js + Tailwind CSS + shadcn/ui |
| 后端 | Cloudflare Worker |
| 数据库 | Cloudflare D1 |
| 支付 | PayPal (预留) |

---

## 15. 备注

1. **API 成本**：$0.12/张 (Remove.bg Standard)
2. **订阅利润**：64-70%
3. **积分利润**：64-76%
4. **免费额度**：注册送 3 次
5. **积分有效期**：永久有效
