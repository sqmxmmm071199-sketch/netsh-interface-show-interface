# 数据库初始化说明

云雀营销助手使用 PostgreSQL + Prisma。当前 UI 仍使用 mock 数据，数据库层先作为后续真实业务数据的基础。

## 1. 安装依赖

```powershell
npm install
```

## 2. 创建环境变量

```powershell
Copy-Item .env.example .env
```

修改 `.env` 中的数据库连接：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/yunque_marketing_assistant?schema=public"
```

## 3. 准备 PostgreSQL 数据库

如果本机已有 PostgreSQL，请创建数据库：

```sql
CREATE DATABASE yunque_marketing_assistant;
```

如果使用 Docker，可以参考：

```powershell
docker run --name yunque-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=yunque_marketing_assistant -p 5432:5432 -d postgres:16
```

## 4. 生成 Prisma Client

```powershell
npm run prisma:generate
```

## 5. 创建数据库表

```powershell
npm run prisma:migrate -- --name init
```

## 6. 写入 mock seed 数据

```powershell
npm run prisma:seed
```

seed 会创建：

- mock 用户：`mia@yunque.example`
- 品牌空间：`青柠生活馆`
- 品牌档案
- 素材批次与素材
- 生成内容
- 内容日历项
- 品牌长期记忆

## 7. 打开 Prisma Studio

```powershell
npm run prisma:studio
```
