# 注册登录功能 MVP

## 项目概述

为 Image Background Remover 添加用户名 + 密码注册和登录功能。

**技术方案：** 纯 Cloudflare Worker，使用 Web Crypto API（PBKDF2）做密码哈希，不引入新基础设施。

---

## 功能需求

### 1. 注册

**入口：** 登录对话框中的"注册"标签

**输入：**
- 用户名（username）：用户自定义字符串
- 密码（password）：至少 8 字符

**校验规则：**
- username：3-20 字符，支持字母、数字、下划线
- password：至少 8 字符

**重复检查：**
- 注册前查询数据库，检查 username 是否已被占用
- 已被占用 → 返回 409 Conflict，前端提示"用户名已被占用，请换一个"
- 用户可修改后重试

**业务逻辑：**
1. 校验参数格式
2. 查询 users 表，检查 username 是否存在
3. 存在 → 409 "Username already taken"
4. PBKDF2 哈希密码（100,000 次迭代，salt 16 字节随机）
5. 生成 userId：`email_${username}_${Date.now()}`
6. INSERT 到 users 表（username, password_hash, auth_type='email'）
7. 首次注册赠送 3 次免费额度（INSERT 到 quota_transactions）
8. 生成 sessionToken（64 字符随机），返回用户信息并自动登录

**注册响应：**
```json
{
  "success": true,
  "user": { "id": "email_john_1775240000", "username": "john", "name": "john" },
  "sessionToken": "..."
}
```

**失败响应（username 重复）：**
```json
{
  "error": "Username already taken"
}
```
HTTP Status: 409

---

### 2. 登录

**入口：** 登录对话框中的"登录"标签

**输入：**
- 用户名（username）：用户自定义字符串
- 密码（password）

**业务逻辑：**
1. 查询 users 表中 username = 输入值 的记录
2. 用户不存在 → 401 "Invalid credentials"
3. PBKDF2 验证密码（用存储的 salt 重新计算 hash 比对）
4. 验证失败 → 401 "Invalid credentials"
5. 生成新 sessionToken，更新到数据库
6. 返回用户信息 + sessionToken

**登录响应：**
```json
{
  "success": true,
  "user": { "id": "email_john_1775240000", "username": "john", "name": "john", "picture": null },
  "sessionToken": "..."
}
```

**失败响应：**
```json
{
  "error": "Invalid credentials"
}
```
HTTP Status: 401

---

## 前端变更

### 登录对话框

顶部 tab 切换：[Google登录 | 账号密码]

**"账号密码" tab：**
- 用户名输入框（placeholder: "用户名"）
- 密码输入框
- 登录按钮
- 链接文字："还没有账号？立即注册"

**"注册" tab：**
- 用户名输入框（placeholder: "用户名（3-20位，字母数字下划线）"）
- 密码输入框（placeholder: "密码（至少8位）"）
- 确认密码输入框（placeholder: "确认密码"）
- 注册按钮
- 链接文字："已有账号？立即登录"

**行为：**
- 注册成功后自动完成登录（获取 sessionToken），跳转到主页
- 登录成功后跳转到主页
- 失败显示对应错误提示（用户名重复 / 用户名或密码错误）
- 确认密码不一致时前端直接拦截提示，不调后端

---

## 后端变更（Worker）

### 新增 endpoint

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 用户名+密码注册 |
| POST | `/api/auth/login/email` | 用户名+密码登录 |

### 复用 endpoint

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/auth/me` | 已有，验证 session |
| POST | `/api/auth/logout` | 已有，注销 session |

### 新增函数

`hashPassword(password)` — PBKDF2 哈希，salt 16 字节随机，100,000 次迭代  
`verifyPassword(password, stored)` — PBKDF2 验证，常量时间比对

### 密码存储格式

```
base64(salt):hex(hash)
例: aGVsbG8=/f7a8...3c2d
```

### 数据库

无需新建表，users 表已有字段足够。

**可选迁移（DBA）：**
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
```

---

## 文件变更清单

| 文件 | 变更 |
|------|------|
| `worker/index.js` | 新增 PBKDF2 函数、register endpoint、login/email endpoint |
| `app/page.tsx` | 登录对话框新增用户名+密码 tab 和注册 tab |
| `worker/wrangler.toml` | 无变更 |
| D1 数据库 | 可选：加 username 唯一索引 |

---

## 部署步骤

1. 可选：数据库加 username 唯一索引
2. 部署 Worker 到 Cloudflare
3. 构建部署前端到 Cloudflare Pages

---

## 确认事项

- [x] 用户名直接用户自定义，不从邮箱生成
- [x] 注册检查重复，提示用户修改
- [x] 注册成功后自动登录跳转主页
- [x] 不需要邮件验证
