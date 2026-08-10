"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  FileImage,
  Lightbulb,
  LogOut,
  Menu,
  MessageSquareText,
  Plus,
  Settings,
  UserSquare2,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/toast-provider";
import { getApiErrorMessage, parseApiPayload } from "@/lib/client-api";
import { useLanguage } from "@/lib/client-language";
import { getI18nCopy } from "@/lib/i18n";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type AppShellUser = {
  email: string;
  name: string | null;
};

type AppShellWorkspace = {
  id: string;
  name: string;
};

const navItems = [
  { href: "/dashboard", labelKey: "dashboard", icon: BarChart3 },
  { href: "/brand-profile", labelKey: "brandProfile", icon: UserSquare2 },
  { href: "/assets", labelKey: "assets", icon: FileImage },
  { href: "/content-studio", labelKey: "contentStudio", icon: MessageSquareText },
  { href: "/calendar", labelKey: "calendar", icon: CalendarDays },
  { href: "/insights", labelKey: "insights", icon: Lightbulb },
  { href: "/reply-assistant", labelKey: "replyAssistant", icon: MessageSquareText },
  { href: "/settings", labelKey: "settings", icon: Settings },
] as const;

const brandLogoSrc = "/yunque-logo.png";

function Sidebar({
  pathname,
  copy,
  onNavigate,
}: {
  pathname: string;
  copy: ReturnType<typeof getI18nCopy>;
  onNavigate?: () => void;
}) {
  return (
    <aside className="flex h-full w-64 flex-col border-r bg-white">
      <div className="flex h-16 items-center gap-3 border-b px-5">
        <div className="flex size-9 items-center justify-center rounded-md border bg-white p-1 shadow-sm">
          <Image
            src={brandLogoSrc}
            alt={copy.appName}
            width={32}
            height={32}
            className="size-7 object-contain"
            unoptimized
            priority
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{copy.appName}</p>
          <p className="text-xs text-muted-foreground">{copy.appTagline}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          const label = copy.nav[item.labelKey];

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <Separator />
      <div className="p-4">
        <div className="rounded-md bg-muted p-3">
          <p className="text-sm font-medium">{copy.workspaceMode}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {copy.workspaceModeDescription}
          </p>
        </div>
      </div>
    </aside>
  );
}

export function AppShell({
  children,
  user,
  workspaces,
  currentWorkspaceId,
}: {
  children: ReactNode;
  user: AppShellUser | null;
  workspaces: AppShellWorkspace[];
  currentWorkspaceId: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();
  const { language } = useLanguage();
  const copy = getI18nCopy(language);
  const [open, setOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const current = navItems.find((item) => item.href === pathname) ?? navItems[0];
  const currentLabel = copy.nav[current.labelKey];
  const currentWorkspace =
    workspaces.find((workspace) => workspace.id === currentWorkspaceId) ??
    workspaces[0] ??
    null;

  async function switchWorkspace(workspaceId: string) {
    setIsSwitching(true);
    try {
      const response = await fetch("/api/workspaces/current", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const payload = await parseApiPayload(response);

      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(payload, copy.switchFailedDescription),
        );
      }

      showToast({ type: "success", title: copy.switchSuccess });
      router.refresh();
    } catch (error) {
      showToast({
        type: "error",
        title: copy.switchFailed,
        description:
          error instanceof Error ? error.message : copy.switchFailedDescription,
      });
    } finally {
      setIsSwitching(false);
    }
  }

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-foreground">
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex">
        <Sidebar pathname={pathname} copy={copy} />
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/35"
            aria-label={copy.closeNavigation}
            onClick={() => setOpen(false)}
          />
          <div className="relative h-full">
            <Sidebar
              pathname={pathname}
              copy={copy}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b bg-white/90 px-4 backdrop-blur md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden"
              onClick={() => setOpen(true)}
              title={copy.openNavigation}
            >
              <Menu className="size-4" />
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{currentLabel}</p>
              <p className="hidden text-xs text-muted-foreground sm:block">
                {currentWorkspace
                  ? `${currentWorkspace.name} · ${copy.currentWorkspace}`
                  : copy.noWorkspace}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {workspaces.length > 0 ? (
              <Select
                value={currentWorkspace?.id}
                onValueChange={switchWorkspace}
                disabled={isSwitching}
              >
                <SelectTrigger className="hidden w-48 bg-white sm:flex">
                  <SelectValue placeholder={copy.selectWorkspace} />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((workspace) => (
                    <SelectItem key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Button className="hidden sm:inline-flex" asChild>
              <Link href="/workspaces/new">
                <Plus className="size-4" />
                {copy.newWorkspace}
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring">
                  <Avatar>
                    <AvatarFallback>
                      {(user?.name ?? user?.email ?? "云").slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="space-y-1">
                    <p>{user?.name ?? copy.currentUser}</p>
                    <p className="text-xs font-normal text-muted-foreground">
                      {user?.email ?? copy.notLoggedIn}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/workspaces/new">
                    <Plus className="size-4" />
                    {copy.newBrandWorkspace}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="size-4" />
                    {copy.workspaceSettings}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="size-4" />
                  {copy.signOut}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
