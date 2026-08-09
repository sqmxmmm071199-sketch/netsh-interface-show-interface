"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  KeyRound,
  Languages,
  Loader2,
  Settings2,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
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
import { getApiErrorMessage, parseApiPayload } from "@/lib/client-api";
import { useLanguage } from "@/lib/client-language";
import {
  getI18nCopy,
  languageOptions,
  normalizeLanguage,
  type AppLanguage,
} from "@/lib/i18n";

type NoticeState = {
  type: "success" | "error";
  message: string;
} | null;

type SettingsContentProps = {
  workspace: {
    name: string;
    slug: string;
  };
  aiProviderLabel: string;
};

export function SettingsContent({
  workspace,
  aiProviderLabel,
}: SettingsContentProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { language, setLanguage } = useLanguage();
  const copy = getI18nCopy(language);
  const settingsCopy = copy.settings;
  const [notice, setNotice] = useState<NoticeState>(null);
  const [isSaving, setIsSaving] = useState(false);

  function notify(type: "success" | "error", title: string, message: string) {
    setNotice({ type, message });
    showToast({ type, title, description: message });
  }

  function handleLanguageChange(value: string) {
    const nextLanguage = normalizeLanguage(value) as AppLanguage;
    setLanguage(nextLanguage);
    const nextCopy = getI18nCopy(nextLanguage);
    showToast({
      type: "success",
      title: nextCopy.settings.saveSuccess,
      description: nextCopy.settings.languageSaved,
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const formData = new FormData(event.currentTarget);
    const values = {
      name: String(formData.get("name") ?? "").trim(),
      slug: String(formData.get("slug") ?? "").trim(),
    };

    if (values.name.length < 2) {
      notify("error", settingsCopy.saveFailed, settingsCopy.nameRequired);
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/settings/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = await parseApiPayload(response);

      if (!response.ok) {
        throw new Error(getApiErrorMessage(payload, settingsCopy.saveFailed));
      }

      notify("success", settingsCopy.saveSuccess, settingsCopy.saveSuccess);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : settingsCopy.saveFailed;
      notify("error", settingsCopy.saveFailed, message);
    } finally {
      setIsSaving(false);
    }
  }

  const settingsItems = [
    {
      title: settingsCopy.teamTitle,
      icon: Users,
      description: settingsCopy.teamDescription,
      tags: ["Owner", settingsCopy.planned],
    },
    {
      title: settingsCopy.aiTitle,
      icon: KeyRound,
      description: settingsCopy.aiDescription,
      tags: [aiProviderLabel, settingsCopy.configured],
    },
    {
      title: settingsCopy.notificationTitle,
      icon: Bell,
      description: settingsCopy.notificationDescription,
      tags: [settingsCopy.planned],
    },
    {
      title: settingsCopy.interfaceLanguage,
      icon: Languages,
      description:
        language === "zh-CN"
          ? "当前界面语言为中文。侧边栏、顶部导航和设置页会立即跟随切换。"
          : "The current interface language is English. Sidebar, top bar, and settings copy update immediately.",
      tags: [settingsCopy.localPreference],
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={settingsCopy.eyebrow}
        title={settingsCopy.title}
        description={settingsCopy.description}
      />

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="size-4 text-primary" />
              {settingsCopy.basicsTitle}
            </CardTitle>
            <CardDescription>{settingsCopy.basicsDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action="/api/settings/workspace"
              className="space-y-4"
              method="post"
              onSubmit={handleSubmit}
            >
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

              <label className="space-y-2 text-sm font-medium">
                {settingsCopy.workspaceName}
                <Input
                  name="name"
                  defaultValue={workspace.name}
                  required
                  minLength={2}
                  maxLength={80}
                />
              </label>

              <label className="space-y-2 text-sm font-medium">
                {settingsCopy.workspaceSlug}
                <Input
                  name="slug"
                  defaultValue={workspace.slug}
                  required
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  minLength={3}
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground">
                  {settingsCopy.slugHelp}
                </p>
              </label>

              <label className="space-y-2 text-sm font-medium">
                {settingsCopy.interfaceLanguage}
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={language}
                  onChange={(event) => handleLanguageChange(event.target.value)}
                >
                  {languageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.nativeLabel}
                    </option>
                  ))}
                </select>
              </label>

              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                {isSaving ? settingsCopy.saving : settingsCopy.save}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {settingsItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="size-4 text-primary" />
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
