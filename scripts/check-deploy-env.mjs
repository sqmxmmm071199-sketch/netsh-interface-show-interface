import { existsSync, readFileSync } from "node:fs";

const allowDemoAuth = process.argv.includes("--allow-demo-auth");
const envFilePath = ".env";

function parseEnvFile() {
  if (!existsSync(envFilePath)) return {};

  const env = {};
  const content = readFileSync(envFilePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex < 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    env[key] = normalizeValue(rawValue);
  }

  return env;
}

function normalizeValue(value) {
  return String(value ?? "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .trim();
}

const fileEnv = parseEnvFile();

function getEnv(name) {
  return normalizeValue(process.env[name] ?? fileEnv[name]);
}

function isFilled(name) {
  const value = getEnv(name);
  return Boolean(
    value &&
      value !== "undefined" &&
      value !== "null" &&
      !value.includes("your-") &&
      !value.includes("<"),
  );
}

function isTruthy(name) {
  return ["1", "true", "yes", "on"].includes(getEnv(name).toLowerCase());
}

const errors = [];
const warnings = [];

function requireEnv(name, message) {
  if (!isFilled(name)) {
    errors.push(`${name}: ${message}`);
  }
}

requireEnv("DATABASE_URL", "需要填写 PostgreSQL 连接字符串。");

if (isFilled("DATABASE_URL")) {
  const databaseUrl = getEnv("DATABASE_URL");
  if (!databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://")) {
    errors.push("DATABASE_URL: 必须是 PostgreSQL 连接字符串。");
  }
}

const provider = getEnv("AI_PROVIDER") || "openai";
if (!["openai", "deepseek"].includes(provider)) {
  errors.push('AI_PROVIDER: 只能填写 "openai" 或 "deepseek"。');
}

if (provider === "deepseek") {
  requireEnv("DEEPSEEK_API_KEY", "AI_PROVIDER=deepseek 时必须填写。");
} else {
  requireEnv("OPENAI_API_KEY", "AI_PROVIDER=openai 时必须填写。");
}

const demoAuthEnabled = isTruthy("ENABLE_DEV_AUTH_FALLBACK");
if (demoAuthEnabled && !allowDemoAuth) {
  errors.push(
    'ENABLE_DEV_AUTH_FALLBACK: 生产部署必须设置为 "false"。如果只是演示服，请使用 npm run deploy:check:demo。',
  );
}

if (!demoAuthEnabled) {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "正式登录注册需要填写 Supabase 项目 URL。");
  requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "正式登录注册需要填写 Supabase anon key。");
}

if (isFilled("NEXT_PUBLIC_SUPABASE_URL")) {
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseUrl.startsWith("https://") && !supabaseUrl.startsWith("http://")) {
    errors.push("NEXT_PUBLIC_SUPABASE_URL: 需要是 http 或 https 开头的 URL。");
  }
}

if (demoAuthEnabled) {
  warnings.push("当前开启了本地/演示用户兜底，不适合正式生产环境。");
}

if (!existsSync("prisma/migrations")) {
  errors.push("prisma/migrations: 未找到数据库迁移目录。");
}

if (warnings.length > 0) {
  console.warn("部署检查警告：");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length > 0) {
  console.error("部署检查未通过：");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("部署检查通过：环境变量和迁移目录已准备好。");
