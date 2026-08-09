"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type AuthMode = "login" | "register";

type NoticeState = {
  type: "success" | "error";
  message: string;
} | null;

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [notice, setNotice] = useState<NoticeState>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const configured = isSupabaseConfigured();
  const isLogin = mode === "login";
  const title = isLogin ? "登录云雀营销助手" : "注册云雀营销助手";
  const description = isLogin
    ? "登录后进入工作台，继续管理品牌空间。"
    : "创建账号后，可以创建多个品牌 Workspace。";
  const callbackUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/auth/callback`;
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    if (!configured) {
      const message =
        "尚未配置 Supabase Auth。请在 .env 中设置 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY。";
      setNotice({
        type: "error",
        message,
      });
      showToast({ type: "error", title: "认证未配置", description: message });
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const result = isLogin
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { name },
              emailRedirectTo: callbackUrl,
            },
          });

      if (result.error) throw result.error;

      if (!isLogin && !result.data.session) {
        const message = "注册成功。请先查收邮箱并完成验证，然后返回登录。";
        setNotice({
          type: "success",
          message,
        });
        showToast({ type: "success", title: "注册成功", description: message });
        return;
      }

      showToast({ type: "success", title: "登录成功" });
      router.push(redirectTo);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : isLogin
            ? "登录失败，请检查邮箱和密码。"
            : "注册失败，请稍后重试。";
      setNotice({
        type: "error",
        message,
      });
      showToast({
        type: "error",
        title: isLogin ? "登录失败" : "注册失败",
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {notice ? (
            <div
              className={`rounded-md border px-3 py-2 text-sm ${
                notice.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {notice.message}
            </div>
          ) : null}

          {!isLogin ? (
            <label className="space-y-2 text-sm font-medium">
              姓名
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="例如：Mia"
              />
            </label>
          ) : null}

          <label className="space-y-2 text-sm font-medium">
            邮箱
            <Input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="space-y-2 text-sm font-medium">
            密码
            <Input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              minLength={6}
              required
            />
          </label>

          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isLogin ? (
              <LogIn className="size-4" />
            ) : (
              <UserPlus className="size-4" />
            )}
            {isLogin ? "登录" : "注册"}
          </Button>
        </form>

        <div className="mt-5 text-center text-sm text-muted-foreground">
          {isLogin ? "还没有账号？" : "已有账号？"}
          <Link
            className="px-1 font-medium text-primary hover:underline"
            href={isLogin ? "/register" : "/login"}
          >
            {isLogin ? "去注册" : "去登录"}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
