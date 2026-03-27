# Image Background Remover - 技术规格文档

## 1. 项目信息

- **项目名称**：Image Background Remover
- **GitHub 仓库**：https://github.com/Gavin6404-sz/image-background-remover
- **线上地址**：https://8df0f535.image-background-remover-bz5.pages.dev
- **状态**：已上线

---

## 2. 部署配置

### 2.1 Cloudflare Pages 部署配置

由于 Cloudflare Pages 对 Next.js 支持有限，采用以下配置：

**next.config.ts**
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
```

**package.json**
```json
{
  "name": "image-background-remover",
  "engines": {
    "node": ">=18.0.0"
  }
}
```

**wrangler.toml**
```toml
name = "image-background-remover"
compatibility_date = "2026-03-27"
pages_build_output_dir = ".next"
```

### 2.2 部署命令

```bash
# 本地构建
npm run build

# 部署到 Cloudflare Pages
wrangler pages deploy .next --project-name=image-background-remover
```

---

## 3. 技术架构

### 3.1 架构说明

- **前端框架**：React + Next.js (App Router)
- **UI 组件**：shadcn/ui
- **样式**：Tailwind CSS
- **国际化**：React 内置 EN/ZH 翻译对象
- **图片处理**：客户端直接调用 Remove.bg API
- **部署平台**：Cloudflare Pages

### 3.2 客户端 Remove.bg 调用

由于使用 `output: 'export'` 静态导出，API 路由不可用，改为客户端直接调用：

```typescript
const processWithRemoveBg = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('image_file', file);
  formData.append('size', 'auto');
  formData.append('format', 'png');

  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: {
      'X-Api-Key': 'ZVPuP9RmbPnUoGX6duU3wh9m',
    },
    body: formData,
  });

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};
```

---

## 4. 环境变量

| 变量名 | 说明 | 状态 |
|--------|------|------|
| `REMOVE_BG_API_KEY` | Remove.bg API Key | 已配置在客户端代码中 |

---

## 5. 部署历史

| 日期 | 版本 | 部署方式 | 说明 |
|------|------|---------|------|
| 2026-03-27 | v1.0 | wrangler pages deploy | 纯前端版本，Remove.bg API 客户端直连 |

---

## 6. 已知问题

1. **Remove.bg API Key 暴露在前端**：生产环境建议添加后端代理
2. **免费额度有限**：Remove.bg 免费版每月 50 次请求
3. **无法使用 Next.js API Routes**：因 Cloudflare Pages 限制

---

## 7. 后续优化建议

1. 添加 Cloudflare Workers 作为 API 代理，保护 API Key
2. 接入用户认证和用量统计
3. 支持更多图片处理功能（裁剪、旋转等）
