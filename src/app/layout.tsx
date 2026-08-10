import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/toast-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "云雀营销助手",
  description: "面向小型品牌团队的 AI 社媒营销提效与内容资产管理工具。",
  icons: {
    icon: [{ url: "/yunque-logo.png", type: "image/png" }],
    shortcut: "/yunque-logo.png",
    apple: "/yunque-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
