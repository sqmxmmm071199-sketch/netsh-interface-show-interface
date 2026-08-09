"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ContentStatus, ContentType, Platform } from "@prisma/client";
import {
  AlertTriangle,
  CalendarDays,
  Copy,
  Eye,
  Loader2,
  Pencil,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import { getApiErrorMessage, parseApiPayload } from "@/lib/client-api";
import {
  contentStatusLabels,
  contentTypeLabels,
  formatDateTime,
  platformLabels,
} from "@/lib/labels";
import type { ComplianceCheckResult } from "@/lib/prompts/compliance-check";
import type {
  ContentGenerationFormValues,
  GeneratedContentVariantValues,
} from "@/lib/validators/content-studio";

type AssetOption = {
  id: string;
  title: string;
  fileName: string | null;
  type: string;
  tags: string[];
  aiDescription: string | null;
  productName: string | null;
  scene: string | null;
};

type RecentContentItem = {
  id: string;
  title: string;
  body: string;
  status: ContentStatus;
  platforms: Platform[];
  type: ContentType;
  hashtags: string[];
  callToAction: string | null;
  createdAt: string;
  riskNotes: ComplianceCheckResult | null;
  assets: Array<{
    id: string;
    title: string;
    fileName: string | null;
  }>;
};

type NoticeState = {
  type: "success" | "error" | "info";
  message: string;
} | null;

type ContentGeneratorProps = {
  workspaceName: string;
  brandName: string | null;
  assets: AssetOption[];
  recentContents: RecentContentItem[];
};

const platformOptions = [
  "INSTAGRAM",
  "TIKTOK",
  "FACEBOOK",
  "PINTEREST",
  "LINKEDIN",
  "XIAOHONGSHU",
] as Platform[];

const contentTypeOptions = [
  "POST",
  "CAROUSEL",
  "SHORT_VIDEO_SCRIPT",
  "STORY",
  "AD_COPY",
] as ContentType[];

const defaultForm: ContentGenerationFormValues = {
  platform: "XIAOHONGSHU",
  contentType: "POST",
  marketingGoal: "提升新品种草转化，突出真实使用场景和核心卖点。",
  selectedAssets: [],
  tone: "清爽、可信、克制，像朋友分享真实体验",
  numberOfVariants: 3,
  extraInstructions: "",
};

function isPlatform(value: string): value is Platform {
  return (platformOptions as readonly string[]).includes(value);
}

function isContentType(value: string): value is ContentType {
  return (contentTypeOptions as readonly string[]).includes(value);
}

function validateGenerationForm(
  values: ContentGenerationFormValues,
):
  | { ok: true; data: ContentGenerationFormValues }
  | { ok: false; message: string } {
  const platform = String(values.platform);
  const contentType = String(values.contentType);
  const marketingGoal = values.marketingGoal.trim();
  const tone = values.tone.trim();
  const extraInstructions = values.extraInstructions.trim();
  const numberOfVariants = Number(values.numberOfVariants);
  const selectedAssets = values.selectedAssets.filter(Boolean).slice(0, 12);

  if (!isPlatform(platform)) {
    return { ok: false, message: "请选择生成平台。" };
  }

  if (!isContentType(contentType)) {
    return { ok: false, message: "请选择内容类型。" };
  }

  if (marketingGoal.length < 2) {
    return { ok: false, message: "请填写营销目标。" };
  }

  if (marketingGoal.length > 300) {
    return { ok: false, message: "营销目标最多 300 个字。" };
  }

  if (!Number.isInteger(numberOfVariants) || numberOfVariants < 1 || numberOfVariants > 5) {
    return { ok: false, message: "生成数量需要在 1 到 5 之间。" };
  }

  if (tone.length > 120) {
    return { ok: false, message: "语气描述最多 120 个字。" };
  }

  if (extraInstructions.length > 1000) {
    return { ok: false, message: "额外要求最多 1000 个字。" };
  }

  return {
    ok: true,
    data: {
      platform,
      contentType,
      marketingGoal,
      selectedAssets,
      tone,
      numberOfVariants,
      extraInstructions,
    },
  };
}

function getAssetName(asset: AssetOption) {
  return asset.fileName ?? asset.title;
}

function getRiskBadgeVariant(riskLevel?: "low" | "medium" | "high") {
  if (riskLevel === "high") return "default";
  if (riskLevel === "medium") return "accent";
  return "secondary";
}

function getRiskLabel(riskLevel?: "low" | "medium" | "high") {
  if (riskLevel === "high") return "高风险";
  if (riskLevel === "medium") return "中风险";
  if (riskLevel === "low") return "低风险";
  return "未检查";
}

function getDefaultCalendarValue() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function ContentGenerator({
  workspaceName,
  brandName,
  assets,
  recentContents,
}: ContentGeneratorProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [form, setForm] = useState<ContentGenerationFormValues>({
    ...defaultForm,
    selectedAssets: assets.slice(0, 2).map((asset) => asset.id),
  });
  const [variants, setVariants] = useState<GeneratedContentVariantValues[]>([]);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [savedIndexes, setSavedIndexes] = useState<number[]>([]);
  const [detailsContent, setDetailsContent] = useState<RecentContentItem | null>(
    null,
  );
  const [editingContent, setEditingContent] = useState<RecentContentItem | null>(
    null,
  );
  const [calendarContent, setCalendarContent] = useState<RecentContentItem | null>(
    null,
  );
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [calendarScheduledAt, setCalendarScheduledAt] = useState(
    getDefaultCalendarValue,
  );
  const [calendarOwnerName, setCalendarOwnerName] = useState("");
  const [calendarNotes, setCalendarNotes] = useState("");
  const [actionContentId, setActionContentId] = useState<string | null>(null);

  const selectedAssetDetails = useMemo(
    () => assets.filter((asset) => form.selectedAssets.includes(asset.id)),
    [assets, form.selectedAssets],
  );

  function notify(type: "success" | "error", title: string, message: string) {
    setNotice({ type, message });
    showToast({ type, title, description: message });
  }

  function updateForm<K extends keyof ContentGenerationFormValues>(
    key: K,
    value: ContentGenerationFormValues[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function toggleAsset(assetId: string) {
    setForm((current) => {
      const exists = current.selectedAssets.includes(assetId);
      return {
        ...current,
        selectedAssets: exists
          ? current.selectedAssets.filter((id) => id !== assetId)
          : [...current.selectedAssets, assetId],
      };
    });
  }

  async function handleGenerate(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (isGenerating) return;

    setNotice({
      type: "info",
      message: "正在生成内容并进行合规检查，通常需要 10-30 秒，请稍候。",
    });
    setSavedIndexes([]);
    setVariants([]);
    setIsGenerating(true);

    try {
      const parsed = validateGenerationForm(form);

      if (!parsed.ok) {
        notify("error", "配置不完整", parsed.message);
        return;
      }

      const response = await fetch("/api/content-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const payload = await parseApiPayload(response);

      if (!response.ok) {
        notify("error", "生成失败", getApiErrorMessage(payload, "内容生成失败，请稍后再试。"));
        return;
      }

      const nextVariants = payload.variants ?? [];
      setVariants(nextVariants);

      if (nextVariants.length === 0) {
        notify("error", "生成失败", "AI 没有返回可展示的内容，请调整配置后重试。");
        return;
      }

      notify(
        "success",
        "生成完成",
        typeof payload.message === "string" ? payload.message : "内容已生成。",
      );
    } catch {
      notify("error", "生成失败", "网络暂时不可用，内容生成失败。");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSave(variant: GeneratedContentVariantValues, index: number) {
    setNotice(null);
    setSavingIndex(index);

    try {
      const response = await fetch("/api/content-studio/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          variant,
        }),
      });
      const payload = await parseApiPayload(response);

      if (!response.ok) {
        notify("error", "保存失败", getApiErrorMessage(payload, "保存失败，请稍后再试。"));
        return;
      }

      setSavedIndexes((current) => [...new Set([...current, index])]);
      notify(
        "success",
        "保存成功",
        typeof payload.message === "string" ? payload.message : "内容已保存。",
      );
      router.refresh();
    } catch {
      notify("error", "保存失败", "网络暂时不可用，内容保存失败。");
    } finally {
      setSavingIndex(null);
    }
  }

  async function handleCopy(content: RecentContentItem) {
    try {
      await navigator.clipboard.writeText(content.body);
      notify("success", "复制成功", "正文已复制。");
    } catch {
      notify("error", "复制失败", "请手动选中正文复制。");
    }
  }

  function openEdit(content: RecentContentItem) {
    setEditingContent(content);
    setEditTitle(content.title);
    setEditBody(content.body);
  }

  function openCalendar(content: RecentContentItem) {
    setCalendarContent(content);
    setCalendarScheduledAt(getDefaultCalendarValue());
    setCalendarOwnerName("");
    setCalendarNotes("");
  }

  async function handleUpdateContent() {
    if (!editingContent) return;

    setNotice(null);
    setActionContentId(editingContent.id);

    try {
      const response = await fetch(`/api/content-studio/${editingContent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          body: editBody,
        }),
      });
      const payload = await parseApiPayload(response);

      if (!response.ok) {
        notify("error", "更新失败", getApiErrorMessage(payload, "更新失败，请稍后再试。"));
        return;
      }

      setEditingContent(null);
      notify(
        "success",
        "更新成功",
        typeof payload.message === "string" ? payload.message : "内容已更新。",
      );
      router.refresh();
    } catch {
      notify("error", "更新失败", "网络暂时不可用，内容更新失败。");
    } finally {
      setActionContentId(null);
    }
  }

  async function handleDeleteContent(content: RecentContentItem) {
    if (!window.confirm(`确定删除「${content.title}」吗？`)) return;

    setNotice(null);
    setActionContentId(content.id);

    try {
      const response = await fetch(`/api/content-studio/${content.id}`, {
        method: "DELETE",
      });
      const payload = await parseApiPayload(response);

      if (!response.ok) {
        notify("error", "删除失败", getApiErrorMessage(payload, "删除失败，请稍后再试。"));
        return;
      }

      notify(
        "success",
        "删除成功",
        typeof payload.message === "string" ? payload.message : "内容已删除。",
      );
      router.refresh();
    } catch {
      notify("error", "删除失败", "网络暂时不可用，内容删除失败。");
    } finally {
      setActionContentId(null);
    }
  }

  async function handleAddToCalendar() {
    if (!calendarContent) return;

    setNotice(null);
    setActionContentId(calendarContent.id);

    try {
      const response = await fetch(
        `/api/content-studio/${calendarContent.id}/calendar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduledAt: new Date(calendarScheduledAt).toISOString(),
            ownerName: calendarOwnerName,
            notes: calendarNotes,
          }),
        },
      );
      const payload = await parseApiPayload(response);

      if (!response.ok) {
        notify("error", "加入日历失败", getApiErrorMessage(payload, "加入日历失败，请稍后再试。"));
        return;
      }

      setCalendarContent(null);
      notify(
        "success",
        "已加入日历",
        typeof payload.message === "string" ? payload.message : "已加入内容日历。",
      );
      router.refresh();
    } catch {
      notify("error", "加入日历失败", "网络暂时不可用，加入日历失败。");
    } finally {
      setActionContentId(null);
    }
  }

  return (
    <div className="space-y-4">
      {notice ? (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            notice.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : notice.type === "info"
                ? "border-primary/20 bg-primary/5 text-foreground"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[390px_1fr]">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>生成配置</CardTitle>
            <CardDescription>
              当前品牌空间：{workspaceName}
              {brandName ? ` · ${brandName}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleGenerate}>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <label className="space-y-2 text-sm font-medium">
                平台
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={form.platform}
                  onChange={(event) =>
                    updateForm("platform", event.target.value as Platform)
                  }
                  disabled={isGenerating}
                >
                  {platformOptions.map((platform) => (
                    <option key={platform} value={platform}>
                      {platformLabels[platform]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm font-medium">
                内容类型
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={form.contentType}
                  onChange={(event) =>
                    updateForm("contentType", event.target.value as ContentType)
                  }
                  disabled={isGenerating}
                >
                  {contentTypeOptions.map((contentType) => (
                    <option key={contentType} value={contentType}>
                      {contentTypeLabels[contentType]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="space-y-2 text-sm font-medium">
              营销目标
              <Textarea
                className="min-h-24"
                value={form.marketingGoal}
                onChange={(event) =>
                  updateForm("marketingGoal", event.target.value)
                }
              />
            </label>

            <label className="space-y-2 text-sm font-medium">
              语气
              <Input
                value={form.tone}
                onChange={(event) => updateForm("tone", event.target.value)}
                placeholder="例如：专业、轻松、可信、有画面感"
              />
            </label>

            <label className="space-y-2 text-sm font-medium">
              生成数量
              <Input
                min={1}
                max={5}
                type="number"
                value={form.numberOfVariants}
                onChange={(event) =>
                  updateForm("numberOfVariants", Number(event.target.value))
                }
              />
            </label>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">选择素材</p>
                <Badge variant="secondary">{form.selectedAssets.length} 个</Badge>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-2">
                {assets.length > 0 ? (
                  assets.map((asset) => (
                    <label
                      key={asset.id}
                      className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-muted/60"
                    >
                      <input
                        className="mt-1 size-4"
                        type="checkbox"
                        checked={form.selectedAssets.includes(asset.id)}
                        onChange={() => toggleAsset(asset.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {getAssetName(asset)}
                        </span>
                        <span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">
                          {asset.aiDescription ?? asset.scene ?? "暂无素材分析"}
                        </span>
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="p-3 text-sm text-muted-foreground">
                    暂无可用素材，可先到素材库上传。
                  </p>
                )}
              </div>
              {selectedAssetDetails.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedAssetDetails.slice(0, 4).map((asset) => (
                    <Badge key={asset.id} variant="outline">
                      {getAssetName(asset)}
                    </Badge>
                  ))}
                  {selectedAssetDetails.length > 4 ? (
                    <Badge variant="secondary">
                      +{selectedAssetDetails.length - 4}
                    </Badge>
                  ) : null}
                </div>
              ) : null}
            </div>

            <label className="space-y-2 text-sm font-medium">
              额外要求
              <Textarea
                className="min-h-28"
                value={form.extraInstructions}
                onChange={(event) =>
                  updateForm("extraInstructions", event.target.value)
                }
                placeholder="例如：避免夸大功效；标题更像小红书真实分享；CTA 不要太硬。"
              />
            </label>

            <Button
              className="w-full"
              disabled={isGenerating}
              type="submit"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  正在生成...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  生成内容
                </>
              )}
            </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>生成结果</CardTitle>
                <CardDescription>
                  选择任意一条保存为 GeneratedContent，素材会自动关联。
                </CardDescription>
              </div>
              {savedIndexes.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/calendar")}
                >
                  <CalendarDays className="size-4" />
                  去日历
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {variants.length > 0 ? (
              variants.map((variant, index) => {
                const isSaved = savedIndexes.includes(index);

                return (
                  <div
                    key={`${variant.title}-${index}`}
                    className={`rounded-md border p-4 ${
                      variant.complianceCheck?.riskLevel === "high"
                        ? "border-destructive/50 bg-destructive/5"
                        : ""
                    }`}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">{platformLabels[form.platform]}</Badge>
                          <Badge variant="secondary">
                            {contentTypeLabels[form.contentType]}
                          </Badge>
                          <Badge
                            variant={getRiskBadgeVariant(
                              variant.complianceCheck?.riskLevel,
                            )}
                            className={
                              variant.complianceCheck?.riskLevel === "high"
                                ? "bg-destructive text-destructive-foreground"
                                : ""
                            }
                          >
                            {getRiskLabel(variant.complianceCheck?.riskLevel)}
                          </Badge>
                          {isSaved ? <Badge>已保存</Badge> : null}
                        </div>
                        <h2 className="mt-3 text-lg font-semibold">
                          {variant.title}
                        </h2>
                      </div>
                      <Button
                        type="button"
                        disabled={savingIndex === index || isSaved}
                        onClick={() => handleSave(variant, index)}
                      >
                        {savingIndex === index ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Save className="size-4" />
                        )}
                        {isSaved ? "已保存" : "保存"}
                      </Button>
                    </div>

                    <Separator className="my-4" />

                    {variant.complianceCheck?.riskLevel === "high" ? (
                      <div className="mb-4 flex gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                        <div>
                          <p className="font-medium">高风险内容，请谨慎使用</p>
                          <p className="mt-1 leading-6">
                            建议先按合规提示改写，再保存到发布计划。
                          </p>
                        </div>
                      </div>
                    ) : null}

                    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium">开头钩子</p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {variant.hook}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">正文</p>
                          <p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted-foreground">
                            {variant.body}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">CTA</p>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {variant.cta}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-md bg-muted/40 p-4">
                        <p className="text-sm font-medium">Hashtags</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {variant.hashtags.map((tag) => (
                            <Badge key={tag} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <Separator className="my-4" />
                        <p className="text-sm font-medium">视觉建议</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {variant.visualSuggestion}
                        </p>
                        <Separator className="my-4" />
                        <p className="text-sm font-medium">平台建议</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {variant.platformNotes}
                        </p>
                        <Separator className="my-4" />
                        <p className="text-sm font-medium">合规检查</p>
                        {variant.complianceCheck ? (
                          <div className="mt-3 space-y-3">
                            <p className="text-sm leading-6 text-muted-foreground">
                              {variant.complianceCheck.overallSuggestion}
                            </p>
                            {variant.complianceCheck.issues.length > 0 ? (
                              <div className="space-y-2">
                                {variant.complianceCheck.issues.map((issue, issueIndex) => (
                                  <div
                                    key={`${issue.text}-${issueIndex}`}
                                    className="rounded-md bg-background p-3 text-xs"
                                  >
                                    <p className="font-medium text-foreground">
                                      {issue.text}
                                    </p>
                                    <p className="mt-1 leading-5 text-muted-foreground">
                                      {issue.reason}
                                    </p>
                                    <p className="mt-1 leading-5 text-muted-foreground">
                                      建议：{issue.suggestion}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                暂无明显问题。
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-muted-foreground">
                            暂无合规检查结果。
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-md border border-dashed bg-muted/30 p-10 text-center">
                <p className="text-sm font-medium">
                  选择平台和营销目标，生成第一条品牌内容。
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  也可以选择素材、语气和生成数量，结果会显示在这里。
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>最近生成内容</CardTitle>
          <CardDescription>
            已保存内容进入内容库，默认状态为 DRAFT，可在这里继续管理。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentContents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>平台</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>标题</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>关联素材</TableHead>
                  <TableHead>风险</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentContents.map((content) => {
                  const riskLevel = content.riskNotes?.riskLevel;
                  const isActing = actionContentId === content.id;

                  return (
                    <TableRow key={content.id}>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {content.platforms.map((platform) => (
                            <Badge key={platform} variant="outline">
                              {platformLabels[platform]}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{contentTypeLabels[content.type]}</TableCell>
                      <TableCell className="max-w-64">
                        <p className="truncate font-medium">{content.title}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {contentStatusLabels[content.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(new Date(content.createdAt))}
                      </TableCell>
                      <TableCell>
                        {content.assets.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {content.assets.slice(0, 2).map((asset) => (
                              <Badge key={asset.id} variant="secondary">
                                {asset.fileName ?? asset.title}
                              </Badge>
                            ))}
                            {content.assets.length > 2 ? (
                              <Badge variant="outline">
                                +{content.assets.length - 2}
                              </Badge>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">无</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getRiskBadgeVariant(riskLevel)}
                          className={
                            riskLevel === "high"
                              ? "bg-destructive text-destructive-foreground"
                              : ""
                          }
                        >
                          {getRiskLabel(riskLevel)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="icon"
                            variant="outline"
                            title="查看详情"
                            onClick={() => setDetailsContent(content)}
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            title="复制正文"
                            onClick={() => handleCopy(content)}
                          >
                            <Copy className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            title="编辑"
                            onClick={() => openEdit(content)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            title="加入内容日历"
                            onClick={() => openCalendar(content)}
                          >
                            <CalendarDays className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            title="删除"
                            disabled={isActing}
                            onClick={() => handleDeleteContent(content)}
                          >
                            {isActing ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-md border border-dashed bg-muted/30 p-10 text-center">
              <p className="text-sm font-medium">
                选择平台和营销目标，生成第一条品牌内容。
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                保存生成结果后，它会以 DRAFT 状态进入最近生成内容列表。
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(detailsContent)} onOpenChange={() => setDetailsContent(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          {detailsContent ? (
            <>
              <DialogHeader>
                <DialogTitle>{detailsContent.title}</DialogTitle>
                <DialogDescription>
                  {detailsContent.platforms.map((platform) => platformLabels[platform]).join("，")}
                  {" · "}
                  {contentTypeLabels[detailsContent.type]}
                  {" · "}
                  {contentStatusLabels[detailsContent.status]}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={getRiskBadgeVariant(detailsContent.riskNotes?.riskLevel)}>
                    {getRiskLabel(detailsContent.riskNotes?.riskLevel)}
                  </Badge>
                  {detailsContent.hashtags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="rounded-md border bg-muted/30 p-4">
                  <p className="whitespace-pre-line text-sm leading-7">
                    {detailsContent.body}
                  </p>
                </div>
                {detailsContent.callToAction ? (
                  <div>
                    <p className="text-sm font-medium">CTA</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {detailsContent.callToAction}
                    </p>
                  </div>
                ) : null}
                <div>
                  <p className="text-sm font-medium">关联素材</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {detailsContent.assets.length > 0 ? (
                      detailsContent.assets.map((asset) => (
                        <Badge key={asset.id} variant="secondary">
                          {asset.fileName ?? asset.title}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">暂无关联素材</span>
                    )}
                  </div>
                </div>
                {detailsContent.riskNotes ? (
                  <div>
                    <p className="text-sm font-medium">风险说明</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {detailsContent.riskNotes.overallSuggestion}
                    </p>
                    {detailsContent.riskNotes.issues.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {detailsContent.riskNotes.issues.map((issue, index) => (
                          <div key={`${issue.text}-${index}`} className="rounded-md border p-3">
                            <p className="text-sm font-medium">{issue.text}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {issue.reason}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              建议：{issue.suggestion}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingContent)} onOpenChange={() => setEditingContent(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑内容</DialogTitle>
            <DialogDescription>可修改标题和正文，状态与风险记录暂不变。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <label className="space-y-2 text-sm font-medium">
              标题
              <Input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
            </label>
            <label className="space-y-2 text-sm font-medium">
              正文
              <Textarea
                className="min-h-60"
                value={editBody}
                onChange={(event) => setEditBody(event.target.value)}
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingContent(null)}>
              取消
            </Button>
            <Button
              disabled={Boolean(editingContent && actionContentId === editingContent.id)}
              onClick={handleUpdateContent}
            >
              {editingContent && actionContentId === editingContent.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              保存修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(calendarContent)} onOpenChange={() => setCalendarContent(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>加入内容日历</DialogTitle>
            <DialogDescription>
              创建一个 ContentCalendarItem，状态默认为已排期。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <label className="space-y-2 text-sm font-medium">
              排期时间
              <Input
                type="datetime-local"
                value={calendarScheduledAt}
                onChange={(event) => setCalendarScheduledAt(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              负责人
              <Input
                value={calendarOwnerName}
                onChange={(event) => setCalendarOwnerName(event.target.value)}
                placeholder="例如：Mia"
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              备注
              <Textarea
                value={calendarNotes}
                onChange={(event) => setCalendarNotes(event.target.value)}
                placeholder="例如：发布前复核封面和禁用词。"
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCalendarContent(null)}>
              取消
            </Button>
            <Button
              disabled={Boolean(calendarContent && actionContentId === calendarContent.id)}
              onClick={handleAddToCalendar}
            >
              {calendarContent && actionContentId === calendarContent.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CalendarDays className="size-4" />
              )}
              加入日历
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
