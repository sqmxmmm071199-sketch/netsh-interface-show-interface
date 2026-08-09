# 云雀营销助手

云雀营销助手是一款面向小型品牌团队的 AI 社媒营销提效与内容资产管理工具。它帮助品牌商家沉淀品牌档案、产品资料、素材库和历史内容，并基于这些资产生成多平台营销内容、内容日历、运营建议和评论 / 私信回复建议。

当前版本是 MVP：已包含工作区、品牌档案、素材上传、AI 素材分析、内容生成、合规检查、内容日历、品牌长期记忆、运营建议、基础登录和工作区管理；暂不做真实社媒自动发布。

## 技术栈

- Next.js App Router + TypeScript
- Tailwind CSS + shadcn/ui
- PostgreSQL + Prisma ORM
- OpenAI API / DeepSeek API
- Supabase Auth
- 本地 mock storage，后续可替换为 Supabase Storage 或 S3
- ESLint

## 本地启动

1. 安装依赖：

```bash
npm install
```

2. 准备环境变量：

```bash
cp .env.example .env
```

然后在 `.env` 中填写 `DATABASE_URL`，选择并配置 `AI_PROVIDER` 对应的 API key，以及需要启用登录时的 Supabase 配置。

3. 生成 Prisma Client：

```bash
npm run prisma:generate
```

4. 启动开发服务器：

```bash
npm run dev
```

默认访问地址是 `http://localhost:3000`。

## 数据库迁移

开发环境创建并应用迁移：

```bash
npm run prisma:migrate
```

生产环境只应用已提交的迁移：

```bash
npm run prisma:migrate:deploy
```

注意：生产环境不要使用 `prisma migrate dev`，它是开发命令，会使用 shadow database 并可能提示重置数据库。

## Seed 数据

本地初始化 mock 数据：

```bash
npm run prisma:seed
```

seed 会创建 mock 用户、workspace、品牌档案、素材、生成内容和日历项。生产环境默认不建议执行 seed，除非你明确需要演示数据。

## 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | 是 | PostgreSQL 连接字符串，Prisma runtime 使用。 |
| `DIRECT_URL` | 否 | 数据库提供商给出的直连地址。使用连接池时，可在受控迁移流程中使用它。当前 schema 未强制依赖。 |
| `AI_PROVIDER` | AI 功能必填 | AI 服务提供方，可选 `openai` 或 `deepseek`。 |
| `OPENAI_API_KEY` | 使用 OpenAI 时必填 | OpenAI API key。不要提交真实 key。 |
| `OPENAI_MODEL` | 否 | 覆盖默认 OpenAI 模型。未设置时使用代码中的默认值。 |
| `DEEPSEEK_API_KEY` | 使用 DeepSeek 时必填 | DeepSeek API key。不要提交真实 key。 |
| `DEEPSEEK_MODEL` | 否 | DeepSeek 模型，默认 `deepseek-chat`。 |
| `DEEPSEEK_BASE_URL` | 否 | DeepSeek OpenAI-compatible endpoint，默认 `https://api.deepseek.com`。 |
| `NEXT_PUBLIC_SUPABASE_URL` | 登录必填 | Supabase 项目 URL。 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 登录必填 | Supabase anon public key。 |

DeepSeek 接入使用 OpenAI-compatible Chat Completions API。当前实现中，DeepSeek 分支会用于品牌分析、素材文本/metadata 分析、内容生成、合规检查、运营建议和回复建议；图片素材的多模态直传分析仍由 OpenAI 分支支持，DeepSeek 分支会基于文件名、说明、标签和 metadata 生成基础分析。

## 部署到 Vercel

1. 准备 PostgreSQL 数据库，例如 Supabase、Neon、Vercel Marketplace Postgres 或其他托管 PostgreSQL。
2. 在数据库中应用迁移：

```bash
npm run prisma:migrate:deploy
```

3. 将项目推送到 GitHub / GitLab / Bitbucket。
4. 在 Vercel 中 Import Project。
5. 在 Vercel Project Settings -> Environment Variables 中添加：
   - `DATABASE_URL`
   - `AI_PROVIDER`
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL`，可选
   - 或 `DEEPSEEK_API_KEY`、`DEEPSEEK_MODEL`、`DEEPSEEK_BASE_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Build Command 使用默认 `npm run build`。当前脚本已包含 `prisma generate && next build`。
7. Install Command 使用默认 `npm install`。当前项目还配置了 `postinstall: prisma generate`，用于避免 Vercel 依赖缓存导致 Prisma Client 过期。
8. 部署完成后，访问 Vercel 域名并注册 / 登录，创建品牌空间和品牌档案。

也可以在 Vercel Build Command 中显式使用：

```bash
npm run vercel-build
```

## Prisma 在 Vercel 上的注意事项

- Vercel 会缓存依赖，可能导致 Prisma Client 没有随 schema 更新而重新生成。项目已通过 `postinstall` 和 `build` 脚本显式执行 `prisma generate`。
- 生产迁移使用 `prisma migrate deploy`，不要用 `migrate dev`。
- `migrate deploy` 只应用 pending migrations，不会生成 Prisma Client，所以 build/postinstall 中仍需要 `prisma generate`。
- Serverless 环境建议使用适合短连接/连接池的 PostgreSQL 地址作为 `DATABASE_URL`。如果数据库提供直连地址和池化地址，迁移流程优先使用直连地址，运行时使用池化地址。
- `src/lib/prisma.ts` 已使用全局单例模式，避免 Next.js 开发热更新创建过多 Prisma Client 实例。
- 不要把 `prisma:seed` 放进 Vercel build。生产 seed 应该是一次性、人工确认或受控脚本。

参考文档：

- [Prisma Vercel dependency caching issue](https://www.prisma.io/docs/orm/more/help-and-troubleshooting/vercel-caching-issue)
- [Prisma Migrate development and production](https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)

## 常用命令

```bash
npm run dev
npm run lint
npm run build
npm run prisma:generate
npm run prisma:migrate
npm run prisma:migrate:deploy
npm run prisma:seed
npm run prisma:studio
```

## 部署前检查清单

- `npm run lint` 通过。
- `npm run build` 通过。
- Vercel 已配置所有必需环境变量。
- 生产数据库已执行 `npm run prisma:migrate:deploy`。
- Supabase Auth 的 Site URL 和 Redirect URLs 已加入 Vercel 域名。
- 没有把 `.env` 或真实 API key 提交到代码仓库。
