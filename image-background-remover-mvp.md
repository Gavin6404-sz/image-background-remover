# Image Background Remover - MVP 需求文档

## 1. 项目概述

- **项目名称**：Image Background Remover
- **项目类型**：在线图片处理工具（纯工具型网站）
- **核心功能**：上传图片，自动去除背景，下载结果
- **目标用户**：所有人
- **语言支持**：中英文切换（EN/ZH）

---

## 2. 功能需求

### 2.1 核心功能

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 图片上传 | 支持拖拽上传、点击上传，支持 JPG/PNG 等主流格式 | P0 |
| 自动去背景 | 上传后自动调用 Remove.bg API 处理，无需用户操作 | P0 |
| 结果预览 | 处理完成后在页面显示原图 vs 去背景效果图（同时显示） | P0 |
| 图片下载 | 一键下载去背景后的图片（默认 PNG 透明背景） | P0 |
| 背景色切换 | 可选 8 种背景色（透明、白色、黑色、奶油色、粉红、薰衣草蓝、天蓝、薄荷绿），默认透明 | P0 |
| 中英文切换 | 支持中文和英文界面，右上角一键切换 | P0 |
| 图片缩放/平移 | 支持滚轮缩放、拖拽平移查看细节 | P1 |

### 2.2 用户交互流程

```
用户访问页面
    ↓
选择语言（EN/中文）
    ↓
拖拽/点击上传图片（支持 JPG、PNG）
    ↓
自动调用 Remove.bg API 去背景
    ↓
显示处理结果（原图 + 效果图同时显示）
    ↓
选择背景色（8种可选，默认透明）
    ↓
下载图片
```

### 2.3 非功能性需求

| 项目 | 要求 |
|------|------|
| 处理速度 | 秒级响应（Remove.bg 通常 1-3 秒） |
| 输出精度 | 与原图一致，无明显锯齿或模糊 |
| 图片限制 | 单张图片建议 ≤ 10MB |
| 响应式 | 移动端/PC 端均可正常使用 |
| 多语言 | 支持中文和英文实时切换 |

---

## 3. 技术方案

### 3.1 技术栈

| 层级 | 技术选型 |
|------|---------|
| 前端框架 | React + Next.js (App Router) |
| UI 组件 | shadcn/ui |
| 样式 | Tailwind CSS |
| 状态管理 | React Hooks + useState/useEffect |
| 国际化 | React Context（EN/ZH 翻译对象） |
| 后端 | Next.js API Routes |
| 图片处理 API | Remove.bg |
| 部署平台 | Cloudflare Pages |
| 环境变量 | Remove.bg API Key 存在环境变量 |

### 3.2 架构设计

```
┌─────────────────┐      ┌──────────────────────┐      ┌─────────────┐
│   浏览器        │  →   │  Next.js API Routes  │  →   │ Remove.bg   │
│  (用户上传)     │      │  /api/remove-bg       │      │    API      │
│                 │  ←   │  (代理, Key 保护)    │  ←   │             │
│  (下载结果)     │      └──────────────────────┘      └─────────────┘
└─────────────────┘
```

### 3.3 API 设计

**Remove.bg 调用（API Route）**

```
POST /api/remove-bg
Content-Type: multipart/form-data

Body: { image: File }

Response:
{
  "success": true,
  "data": {
    "resultUrl": "data:image/png;base64,..." // base64 编码的结果图
  }
}

Error Response:
{
  "success": false,
  "error": "错误描述"
}
```

### 3.4 目录结构

```
image-background-remover/
├── app/
│   ├── page.tsx              # 首页（包含所有UI和逻辑）
│   ├── layout.tsx             # 根布局
│   ├── globals.css            # 全局样式
│   └── api/
│       └── remove-bg/
│           └── route.ts       # Remove.bg API 代理
├── components/
│   └── ui/                    # shadcn/ui 组件
├── public/
├── .env.local                 # 本地环境变量（不提交）
├── package.json
├── image-background-remover-mvp.md # 本文档
└── image-background-remover-spec.md # 技术规格文档
```

---

## 4. UI 设计

### 4.1 页面结构

**首页（单页应用）**

```
┌──────────────────────────────────────────────────────────────┐
│  Header (sticky)                                              │
│  [Logo + Title]                              [EN] [中文]      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    Hero Section                         │  │
│  │         Transform Your Images Instantly              │  │
│  │    Upload any image and let AI remove background...   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   Upload Area                          │  │
│  │         [Upload Icon]                                  │  │
│  │         Drop your image here                           │  │
│  │         or click to browse                             │  │
│  │         (JPG/PNG, max 10MB)                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │ ⚡ Lightning │  │ 🎨 8 Colors │  │ 📱 Any      │       │
│  │    Fast     │  │   Options   │  │   Device    │       │
│  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Perfect For Every Project                 │  │
│  │  👗 Fashion  🍕 Food   👤 Portrait  🏠 Real Estate │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  Footer                                                      │
│  Powered by Remove.bg • Create beautiful images in seconds  │
└──────────────────────────────────────────────────────────────┘
```

**上传后页面**

```
┌──────────────────────────────────────────────────────────────┐
│  Header                                                      │
│  [Logo + Title]                              [EN] [中文]      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │ ▓▓▓ Original ▓▓▓   │  │ ▓▓▓ Result ▓▓▓      │          │
│  │                     │  │                     │          │
│  │    [Original Img]   │  │   [Result Img]     │          │
│  │    (zoomable)       │  │   (with bg color)  │          │
│  │                     │  │                     │          │
│  └─────────────────────┘  └─────────────────────┘          │
│                   Zoom: 100% | Drag to pan • Scroll to zoom │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Choose Background Color                   │  │
│  │  [透明] [白] [黑] [奶油] [粉] [薰蓝] [天蓝] [薄荷]    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│        [ ⬇️ Download Image ]    [ Upload New Image ]        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 💡 Pro Tips                                           │  │
│  │ • Use high-resolution images for best results          │  │
│  │ • Ensure good contrast between subject and background  │  │
│  │ • Try different background colors...                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 国际化（i18n）

| Key | EN | ZH |
|-----|----|----|
| title | Background Remover | 背景消除器 |
| heroTitle | Transform Your Images Instantly | 瞬间转换您的图片 |
| dropHere | Drop your image here | 拖放图片到此处 |
| chooseBackground | Choose Background Color | 选择背景颜色 |
| download | Download Image | 下载图片 |
| tips | Pro Tips | 使用技巧 |
| ... | ... | ... |

### 4.3 背景色选项

| 名称 | 英文 | 中文 | 色值 |
|------|------|------|------|
| 透明 | Transparent | 透明 | - |
| 白色 | White | 白色 | #ffffff |
| 黑色 | Black | 黑色 | #1a1a1a |
| 奶油色 | Cream | 奶油色 | #f5f5dc |
| 粉红色 | Pink | 粉红色 | #ffb6c1 |
| 薰衣草蓝 | Lavender | 薰衣草蓝 | #e6e6fa |
| 天蓝色 | Sky | 天蓝色 | #87ceeb |
| 薄荷绿 | Mint | 薄荷绿 | #98fb98 |

### 4.4 设计规范

- **主题**：现代简洁工具风格，温暖色调
- **主色调**：橙黄渐变（amber-500 to orange-500）
- **背景**：浅灰白渐变（slate-50 via white to stone-100）
- **卡片**：白色底 + 柔和阴影 + 圆角边框
- **字体大小**：标题 4xl，正文 lg/lg
- **国际化**：右上角 EN/中文 切换按钮

---

## 5. 环境变量

| 变量名 | 说明 | 必填 |
|--------|------|------|
| `REMOVE_BG_API_KEY` | Remove.bg API Key | 是（生产环境） |

> 本地开发使用 .env.local，Cloudflare Pages 在设置中添加环境变量。

---

## 6. 里程碑

| 阶段 | 内容 | 产出 |
|------|------|------|
| M1 | 项目初始化，基础 UI 上传/预览功能 | 可演示 Demo |
| M2 | 对接 Remove.bg API，完成核心去背景功能 | 功能可用 |
| M3 | 8种背景色、中英文切换、Features、使用案例 | 完成 MVP |
| M4 | 部署上线，绑定自定义域名 | 正式发布 |

---

## 7. 已知限制

1. Remove.bg 免费额度有限（50 次/月），生产环境需购买套餐
2. 图片过大（>10MB）可能导致处理超时
3. 复杂背景或低对比度图片可能影响去背效果
4. 纯前端方案（无用户体系），无法统计使用次数

---

## 8. 后续扩展（不纳入 MVP）

- 用户体系（注册/登录，统计使用次数）
- 批量处理
- API 开放
- 水印/裁剪/旋转等编辑功能
- 历史记录
- 更多背景颜色选项
- 高级修图功能
