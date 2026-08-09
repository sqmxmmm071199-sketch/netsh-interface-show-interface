# 云雀营销助手服务器部署指南

这份文档按零基础操作写，推荐部署方式是：

- 服务器：Ubuntu 22.04 或 24.04
- 运行方式：Node.js 22 + PM2
- 反向代理：Nginx
- HTTPS：Certbot 免费证书
- 数据库：推荐先用 Supabase / Neon / 云数据库 PostgreSQL

## 1. 部署前准备

你需要准备：

1. 一台云服务器，系统选择 Ubuntu 22.04 或 24.04。
2. 一个域名，例如 `app.example.com`。
3. 一个 PostgreSQL 数据库。
4. 一个 DeepSeek 或 OpenAI API Key。
5. 一个 Supabase 项目，用于登录注册。
6. 一个 Git 仓库，用来把本地代码同步到服务器。

服务器建议配置：

- 演示环境：2 核 2G
- 更稳的测试环境：2 核 4G
- 磁盘：40G 以上

## 2. 配置域名解析

到域名服务商后台添加一条 DNS 记录：

```text
类型：A
主机记录：app
记录值：你的服务器公网 IP
```

等待几分钟后，后面就可以用 `app.example.com` 访问。

## 3. 登录服务器

在你自己的电脑终端里执行：

```bash
ssh root@你的服务器公网IP
```

第一次登录会询问是否继续，输入：

```bash
yes
```

## 4. 安装基础软件

```bash
apt update
apt install -y git curl nginx
```

## 5. 安装 Node.js 22

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
node -v
npm -v
```

看到 `node -v` 输出 `v22...` 就可以继续。

## 6. 上传或拉取项目代码

推荐先把本地项目推到 GitHub / GitLab，然后服务器拉取：

```bash
cd /var/www
git clone 你的仓库地址 yunque-marketing-assistant
cd yunque-marketing-assistant
```

如果 `/var/www` 不存在：

```bash
mkdir -p /var/www
```

## 7. 安装项目依赖

```bash
npm ci
```

如果你没有提交 `package-lock.json`，才使用：

```bash
npm install
```

## 8. 配置环境变量

```bash
cp .env.example .env
nano .env
```

正式生产环境至少填写这些：

```env
DATABASE_URL="postgresql://用户名:密码@数据库地址:5432/数据库名?schema=public"
PORT="3000"

AI_PROVIDER="deepseek"
DEEPSEEK_API_KEY="你的 DeepSeek Key"
DEEPSEEK_MODEL="deepseek-chat"
DEEPSEEK_BASE_URL="https://api.deepseek.com"

NEXT_PUBLIC_SUPABASE_URL="你的 Supabase 项目 URL"
NEXT_PUBLIC_SUPABASE_ANON_KEY="你的 Supabase anon key"

ENABLE_DEV_AUTH_FALLBACK="false"
```

如果只是给别人临时演示，还没配置 Supabase Auth，可以临时使用：

```env
ENABLE_DEV_AUTH_FALLBACK="true"
DEV_AUTH_FALLBACK_EMAIL="mia@yunque.example"
```

但正式上线必须改回：

```env
ENABLE_DEV_AUTH_FALLBACK="false"
```

保存 `nano`：

1. 按 `Ctrl + O`
2. 按回车
3. 按 `Ctrl + X`

## 9. 检查部署环境

正式生产检查：

```bash
npm run deploy:check
```

演示环境检查：

```bash
npm run deploy:check:demo
```

如果检查失败，按照提示补 `.env`。

## 10. 初始化数据库

执行 Prisma 生产迁移：

```bash
npm run prisma:migrate:deploy
```

如果是演示环境，需要 mock 数据：

```bash
npm run prisma:seed
```

生产环境不要随便执行 seed，避免创建演示数据。

## 11. 构建项目

```bash
npm run build
```

构建成功后会看到 Next.js 的路由列表。

## 12. 用 PM2 启动应用

安装 PM2：

```bash
npm install -g pm2
```

启动项目：

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

`pm2 startup` 会输出一行命令，把那一整行复制出来再执行一次。

查看状态：

```bash
pm2 status
```

查看日志：

```bash
pm2 logs yunque-marketing-assistant
```

本机健康检查：

```bash
curl http://127.0.0.1:3000/api/health
curl http://127.0.0.1:3000/api/health?db=1
```

第一个检查应用，第二个检查应用和数据库。

## 13. 配置 Nginx

新建配置：

```bash
nano /etc/nginx/sites-available/yunque
```

复制下面内容，把 `your-domain.com` 改成你的真实域名：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

启用配置：

```bash
ln -s /etc/nginx/sites-available/yunque /etc/nginx/sites-enabled/yunque
nginx -t
systemctl reload nginx
```

现在可以先访问：

```text
http://你的域名
```

## 14. 配置 HTTPS

安装 Certbot：

```bash
apt install -y certbot python3-certbot-nginx
```

申请证书：

```bash
certbot --nginx -d 你的域名
```

完成后访问：

```text
https://你的域名
```

## 15. 配置 Supabase Auth

进入 Supabase 项目后台：

1. 打开 Authentication。
2. 打开 URL Configuration。
3. Site URL 填：

```text
https://你的域名
```

4. Redirect URLs 添加：

```text
https://你的域名/auth/callback
http://localhost:3000/auth/callback
```

本地开发地址可以保留，方便以后继续调试。

## 16. 后续更新代码

每次更新项目后，在服务器执行：

```bash
cd /var/www/yunque-marketing-assistant
git pull
npm ci
npm run deploy:check
npm run prisma:migrate:deploy
npm run build
pm2 restart yunque-marketing-assistant
```

如果只是演示环境并且还没有 Supabase Auth：

```bash
npm run deploy:check:demo
```

## 17. 常见问题

### 页面打不开

检查应用是否启动：

```bash
pm2 status
pm2 logs yunque-marketing-assistant
```

检查 Nginx：

```bash
nginx -t
systemctl status nginx
```

### 数据库连接失败

检查：

```bash
curl http://127.0.0.1:3000/api/health?db=1
```

如果返回 `database: "error"`，通常是 `DATABASE_URL` 不正确，或数据库没有允许服务器 IP 访问。

### AI 功能失败

检查 `.env`：

```env
AI_PROVIDER="deepseek"
DEEPSEEK_API_KEY="..."
DEEPSEEK_BASE_URL="https://api.deepseek.com"
```

修改 `.env` 后需要重启：

```bash
pm2 restart yunque-marketing-assistant
```

### 上传素材失败

当前项目使用本地 mock storage，文件会写入：

```text
public/mock-uploads
```

确认服务器用户有写入权限：

```bash
mkdir -p public/mock-uploads
chmod -R 755 public/mock-uploads
```

正式产品建议后续改成 Supabase Storage、S3 或 OSS。

