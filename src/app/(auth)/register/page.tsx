import { AuthForm } from "@/components/auth/auth-form";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-sm font-medium text-primary">云雀营销助手</p>
          <h1 className="mt-2 text-2xl font-semibold">创建账号</h1>
        </div>
        <AuthForm mode="register" />
      </div>
    </main>
  );
}
