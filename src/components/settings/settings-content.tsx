"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  KeyRound,
  Languages,
  Loader2,
  Settings2,
  ShieldAlert,
  Trash2,
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
import {
  getI18nCopy,
  languageOptions,
  normalizeLanguage,
  type AppLanguage,
} from "@/lib/i18n";
import type { AiProviderPublicStatus } from "@/lib/ai/provider";

type NoticeState = {
  type: "success" | "error";
  message: string;
} | null;

type NotificationPreferences = {
  dashboardReminders: boolean;
  highRiskReminders: boolean;
  unusedAssetReminders: boolean;
};

type SettingsContentProps = {
  workspace: {
    name: string;
    slug: string;
    brandName: string;
  };
  aiStatus: AiProviderPublicStatus;
};

const notificationStorageKey = "yunque_notification_preferences";

const defaultNotificationPreferences: NotificationPreferences = {
  dashboardReminders: true,
  highRiskReminders: true,
  unusedAssetReminders: true,
};

const settingsText = {
  "zh-CN": {
    workspaceTitle: "工作区设置",
    workspaceDescription: "管理当前品牌空间的基础信息和默认品牌。",
    workspaceName: "工作区名称",
    workspaceSlug: "URL 标识",
    defaultBrand: "默认品牌",
    defaultLanguage: "默认语言",
    aiTitle: "AI 配置",
    aiDescription: "API Key 只从服务端环境变量读取，不会在前端显示或保存。",
    aiProvider: "AI Provider",
    apiKey: "API Key",
    model: "当前模型名称",
    envOnly: "环境变量配置",
    configured: "已配置",
    notConfigured: "未配置",
    testConnection: "测试 AI 连接",
    testing: "测试中...",
    languageTitle: "多语言设置",
    languageDescription:
      "当前已覆盖主要导航、顶部标题、设置页标题和按钮文案；业务页面正文仍以中文为主，后续再逐步完整 i18n。",
    interfaceLanguage: "界面语言",
    languageApplied: "界面语言已切换",
    notificationTitle: "通知偏好",
    notificationDescription:
      "MVP 阶段先控制站内提醒显示，后续可扩展到邮件或协作工具通知。",
    dashboardReminders: "显示首页提醒",
    highRiskReminders: "显示高风险内容提醒",
    unusedAssetReminders: "显示未使用素材提醒",
    saveNotifications: "保存通知偏好",
    notificationSaved: "通知偏好已保存到当前浏览器。",
    dangerTitle: "危险操作",
    dangerDescription:
      "以下操作会影响当前工作区数据。MVP 阶段先展示入口，暂不执行真实删除。",
    clearDemoData: "清空测试数据",
    deleteWorkspace: "删除工作区",
    notEnabled: "暂未开放",
    dangerUnavailable: "这个危险操作目前只是 UI 入口，尚未执行真实数据删除。",
    switchByEnv:
      "如需切换服务商，请修改 AI_PROVIDER 环境变量并重启服务。",
    slugHelp: "只能使用小写字母、数字和连字符。",
  },
  "en-US": {
    workspaceTitle: "Workspace Settings",
    workspaceDescription:
      "Manage the current workspace basics and default brand.",
    workspaceName: "Workspace name",
    workspaceSlug: "URL slug",
    defaultBrand: "Default brand",
    defaultLanguage: "Default language",
    aiTitle: "AI Configuration",
    aiDescription:
      "API keys are read from server environment variables only. They are never shown or stored in the frontend.",
    aiProvider: "AI Provider",
    apiKey: "API Key",
    model: "Current model",
    envOnly: "Environment variable",
    configured: "Configured",
    notConfigured: "Not configured",
    testConnection: "Test AI connection",
    testing: "Testing...",
    languageTitle: "Language Settings",
    languageDescription:
      "Current coverage includes main navigation, top-bar titles, Settings page titles, and button labels. Business page body copy is still mostly Chinese and will be localized gradually.",
    interfaceLanguage: "Interface language",
    languageApplied: "Interface language updated",
    notificationTitle: "Notification Preferences",
    notificationDescription:
      "MVP controls in-app reminders first. Email or collaboration notifications can be added later.",
    dashboardReminders: "Show dashboard reminders",
    highRiskReminders: "Show high-risk content reminders",
    unusedAssetReminders: "Show unused asset reminders",
    saveNotifications: "Save notification preferences",
    notificationSaved: "Notification preferences saved in this browser.",
    dangerTitle: "Danger Zone",
    dangerDescription:
      "These actions affect workspace data. In MVP they are UI placeholders and do not delete data.",
    clearDemoData: "Clear demo data",
    deleteWorkspace: "Delete workspace",
    notEnabled: "Not enabled",
    dangerUnavailable:
      "This dangerous action is currently a UI placeholder and has not deleted any data.",
    switchByEnv:
      "To switch providers, update the AI_PROVIDER environment variable and restart the service.",
    slugHelp: "Use lowercase letters, numbers, and hyphens only.",
  },
} as const;

function parseNotificationPreferences(value: string | null) {
  if (!value) return defaultNotificationPreferences;

  try {
    return {
      ...defaultNotificationPreferences,
      ...(JSON.parse(value) as Partial<NotificationPreferences>),
    };
  } catch {
    return defaultNotificationPreferences;
  }
}

export function SettingsContent({ workspace, aiStatus }: SettingsContentProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { language, setLanguage } = useLanguage();
  const copy = getI18nCopy(language);
  const settingsCopy = copy.settings;
  const text = settingsText[language];
  const [notice, setNotice] = useState<NoticeState>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [aiNotice, setAiNotice] = useState<NoticeState>(null);
  const [name, setName] = useState(workspace.name);
  const [slug, setSlug] = useState(workspace.slug);
  const [brandName, setBrandName] = useState(
    workspace.brandName || workspace.name,
  );
  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationPreferences>(defaultNotificationPreferences);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setNotificationPreferences(
        parseNotificationPreferences(
          window.localStorage.getItem(notificationStorageKey),
        ),
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function notify(type: "success" | "error", title: string, message: string) {
    setNotice({ type, message });
    showToast({ type, title, description: message });
  }

  function handleLanguageChange(value: string) {
    const nextLanguage = normalizeLanguage(value) as AppLanguage;
    setLanguage(nextLanguage);
    showToast({
      type: "success",
      title: settingsText[nextLanguage].languageApplied,
      description: settingsText[nextLanguage].languageDescription,
    });
  }

  function updateNotificationPreference(
    key: keyof NotificationPreferences,
    value: boolean,
  ) {
    setNotificationPreferences((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const values = {
      name: name.trim(),
      slug: slug.trim(),
      defaultBrandName: brandName.trim(),
      defaultLanguage: language,
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

  async function testAiConnection() {
    setAiNotice(null);
    setIsTestingAi(true);

    try {
      const response = await fetch("/api/settings/ai-test", {
        method: "POST",
      });
      const payload = await parseApiPayload(response);

      if (!response.ok) {
        throw new Error(getApiErrorMessage(payload, "AI 连接测试失败。"));
      }

      const message =
        typeof payload.message === "string"
          ? payload.message
          : "AI 连接测试成功。";
      setAiNotice({ type: "success", message });
      showToast({ type: "success", title: message });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "AI 连接测试失败。";
      setAiNotice({ type: "error", message });
      showToast({
        type: "error",
        title: "AI 连接测试失败",
        description: message,
      });
    } finally {
      setIsTestingAi(false);
    }
  }

  function saveNotificationPreferences() {
    window.localStorage.setItem(
      notificationStorageKey,
      JSON.stringify(notificationPreferences),
    );
    showToast({
      type: "success",
      title: text.notificationSaved,
    });
  }

  function showDangerPlaceholder() {
    showToast({
      type: "error",
      title: text.notEnabled,
      description: text.dangerUnavailable,
    });
  }

  const apiKeyStatus = aiStatus.configured
    ? text.configured
    : text.notConfigured;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={settingsCopy.eyebrow}
        title={settingsCopy.title}
        description={settingsCopy.description}
      />

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="size-4 text-primary" />
              {text.workspaceTitle}
            </CardTitle>
            <CardDescription>{text.workspaceDescription}</CardDescription>
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

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-medium">
                  {text.workspaceName}
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    minLength={2}
                    maxLength={80}
                  />
                </label>

                <label className="space-y-2 text-sm font-medium">
                  {text.workspaceSlug}
                  <Input
                    value={slug}
                    onChange={(event) => setSlug(event.target.value)}
                    required
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    minLength={3}
                    maxLength={60}
                  />
                  <p className="text-xs text-muted-foreground">
                    {text.slugHelp}
                  </p>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-medium">
                  {text.defaultBrand}
                  <Input
                    value={brandName}
                    onChange={(event) => setBrandName(event.target.value)}
                    maxLength={80}
                  />
                </label>

                <label className="space-y-2 text-sm font-medium">
                  {text.defaultLanguage}
                  <Select value={language} onValueChange={handleLanguageChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languageOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.nativeLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </div>

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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-4 text-primary" />
              {text.aiTitle}
            </CardTitle>
            <CardDescription>{text.aiDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium">{text.aiProvider}</p>
                <Select value={aiStatus.provider} disabled>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deepseek">DeepSeek</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="mock">Mock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">{text.apiKey}</p>
                <div className="flex h-9 items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 text-sm">
                  <span className="truncate">
                    {aiStatus.apiKeyEnvName ?? "AI_PROVIDER=mock"}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      aiStatus.configured
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }
                  >
                    {apiKeyStatus}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="rounded-md border bg-muted/25 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{text.model}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {aiStatus.model}
                  </p>
                </div>
                <Badge variant="outline">{text.envOnly}</Badge>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                {text.switchByEnv}
              </p>
            </div>

            {aiNotice ? (
              <div
                className={`rounded-md border px-3 py-2 text-sm ${
                  aiNotice.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
                }`}
              >
                {aiNotice.message}
              </div>
            ) : null}

            <Button
              type="button"
              variant="outline"
              onClick={testAiConnection}
              disabled={isTestingAi}
            >
              {isTestingAi ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <KeyRound className="size-4" />
              )}
              {isTestingAi ? text.testing : text.testConnection}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="size-4 text-primary" />
              {text.languageTitle}
            </CardTitle>
            <CardDescription>{text.languageDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="space-y-2 text-sm font-medium">
              {text.interfaceLanguage}
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="max-w-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.nativeLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <div className="rounded-md border bg-muted/25 p-3 text-sm leading-6 text-muted-foreground">
              {text.languageDescription}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-4 text-primary" />
              {text.notificationTitle}
            </CardTitle>
            <CardDescription>{text.notificationDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {[
                ["dashboardReminders", text.dashboardReminders],
                ["highRiskReminders", text.highRiskReminders],
                ["unusedAssetReminders", text.unusedAssetReminders],
              ].map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                >
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={
                      notificationPreferences[
                        key as keyof NotificationPreferences
                      ]
                    }
                    onChange={(event) =>
                      updateNotificationPreference(
                        key as keyof NotificationPreferences,
                        event.target.checked,
                      )
                    }
                  />
                </label>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={saveNotificationPreferences}
            >
              <CheckCircle2 className="size-4" />
              {text.saveNotifications}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="size-4 text-destructive" />
            {text.dangerTitle}
          </CardTitle>
          <CardDescription>{text.dangerDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4" />
              <p>{text.dangerDescription}</p>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={showDangerPlaceholder}
            >
              <Trash2 className="size-4" />
              {text.clearDemoData}
              <Badge variant="outline">{text.notEnabled}</Badge>
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={showDangerPlaceholder}
            >
              <Trash2 className="size-4" />
              {text.deleteWorkspace}
              <Badge variant="outline" className="border-white/40 text-white">
                {text.notEnabled}
              </Badge>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
