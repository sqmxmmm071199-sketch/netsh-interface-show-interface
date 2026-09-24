"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Bot,
  FileText,
  Globe2,
  Loader2,
  Megaphone,
  Save,
  Sparkles,
  SlidersHorizontal,
  Target,
} from "lucide-react";
import { useForm } from "react-hook-form";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import { getApiErrorMessage, parseApiPayload } from "@/lib/client-api";
import {
  brandProfileFormSchema,
  type BrandProfileFormValues,
} from "@/lib/validators/brand-profile";

export type BrandProfileAnalysisView = {
  brandSummary: string | null;
  targetAudienceSummary: string | null;
  toneOfVoice: string[];
  contentAngles: string[];
  forbiddenClaims: string[];
  recommendedPlatforms: string[];
  marketingSuggestions: string[];
  aiAnalysisUpdatedAt: string | null;
};

type BrandProfileQuestionnaireProps = {
  workspaceName: string;
  initialValues: BrandProfileFormValues;
  initialAnalysis: BrandProfileAnalysisView | null;
  hasSavedProfile: boolean;
};

type NoticeState = {
  type: "success" | "error";
  message: string;
} | null;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof FileText;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <div>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="mt-1">{description}</CardDescription>
      </div>
    </div>
  );
}

function AnalysisList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border bg-background p-4">
      <p className="text-sm font-medium">{title}</p>
      {items.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <Badge key={item} variant="outline" className="max-w-full break-words">
              {item}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">暂无结果</p>
      )}
    </div>
  );
}

function AnalysisResult({
  analysis,
  canAnalyze,
  isAnalyzing,
  isSubmitting,
  isDirty,
  onAnalyze,
}: {
  analysis: BrandProfileAnalysisView | null;
  canAnalyze: boolean;
  isAnalyzing: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
  onAnalyze: () => void;
}) {
  const disabled = isSubmitting || isAnalyzing || !canAnalyze || isDirty;
  const title = !canAnalyze
    ? "请先保存基础信息"
    : isDirty
      ? "请先保存当前修改"
      : "AI 分析品牌";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <SectionTitle
            icon={Bot}
            title="AI 品牌画像"
            description="基于已保存的品牌档案生成总结、内容方向和营销建议。"
          />
          <div className="flex flex-col items-start gap-2 lg:items-end">
            {analysis?.aiAnalysisUpdatedAt ? (
              <Badge variant="secondary">
                更新于 {new Date(analysis.aiAnalysisUpdatedAt).toLocaleString("zh-CN")}
              </Badge>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={onAnalyze}
              title={title}
            >
              {isAnalyzing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              AI 分析品牌
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {!analysis ? (
          <div className="rounded-md border border-dashed bg-muted/30 p-8 text-center">
            <p className="text-sm font-medium">当前还没有 AI 品牌画像</p>
            <p className="mt-2 text-sm text-muted-foreground">
              保存基础信息后，可以让 AI 生成品牌总结、内容方向和平台建议。
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-md border bg-background p-4">
                <p className="text-sm font-medium">AI 总结品牌</p>
                <p className="mt-3 break-words text-sm leading-7 text-muted-foreground">
                  {analysis.brandSummary || "暂无结果"}
                </p>
              </div>
              <div className="rounded-md border bg-background p-4">
                <p className="text-sm font-medium">目标用户总结</p>
                <p className="mt-3 break-words text-sm leading-7 text-muted-foreground">
                  {analysis.targetAudienceSummary || "暂无结果"}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <AnalysisList title="内容方向" items={analysis.contentAngles} />
              <AnalysisList title="推荐平台" items={analysis.recommendedPlatforms} />
              <AnalysisList title="营销建议" items={analysis.marketingSuggestions} />
              <AnalysisList title="禁用/谨慎表达" items={analysis.forbiddenClaims} />
              <AnalysisList title="AI 识别语调" items={analysis.toneOfVoice} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ToneGuide() {
  return (
    <div className="rounded-md border bg-muted/25 p-4 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">语调字段建议写清楚这些规则</p>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <p>常用表达：品牌常说的词、句式、开场方式。</p>
        <p>Emoji：是否使用、使用频率、适合出现的位置。</p>
        <p>长短偏好：短句、长文、种草笔记或广告式精简文案。</p>
      </div>
    </div>
  );
}

export function BrandProfileQuestionnaire({
  workspaceName,
  initialValues,
  initialAnalysis,
  hasSavedProfile,
}: BrandProfileQuestionnaireProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [notice, setNotice] = useState<NoticeState>(null);
  const [analysis, setAnalysis] = useState<BrandProfileAnalysisView | null>(
    initialAnalysis,
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [canAnalyze, setCanAnalyze] = useState(hasSavedProfile);
  const form = useForm<BrandProfileFormValues>({
    resolver: zodResolver(brandProfileFormSchema),
    defaultValues: initialValues,
  });
  const {
    formState: { errors, isSubmitting, isDirty },
    register,
  } = form;

  async function onSubmit(values: BrandProfileFormValues) {
    setNotice(null);

    try {
      const response = await fetch("/api/brand-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = await parseApiPayload(response);

      if (!response.ok) {
        const message = getApiErrorMessage(payload, "保存失败，请稍后再试。");
        setNotice({ type: "error", message });
        showToast({ type: "error", title: "保存失败", description: message });
        return;
      }

      const message =
        typeof payload.message === "string" ? payload.message : "品牌档案已保存。";
      setNotice({ type: "success", message });
      setCanAnalyze(true);
      showToast({ type: "success", title: "保存成功", description: message });
      form.reset(values);
      router.refresh();
    } catch {
      const message = "网络暂时不可用，品牌档案保存失败。";
      setNotice({ type: "error", message });
      showToast({ type: "error", title: "保存失败", description: message });
    }
  }

  async function handleAnalyze() {
    if (!canAnalyze || isDirty) {
      const message = "请先保存基础信息，再进行 AI 分析。";
      setNotice({ type: "error", message });
      showToast({ type: "error", title: "暂不能分析", description: message });
      return;
    }

    setNotice(null);
    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/brand-profile/analyze", {
        method: "POST",
      });
      const payload = await parseApiPayload(response);

      if (!response.ok) {
        const message = getApiErrorMessage(payload, "AI 分析失败，请稍后再试。");
        setNotice({ type: "error", message });
        showToast({ type: "error", title: "AI 分析失败", description: message });
        return;
      }

      setAnalysis(payload.analysis);
      const message =
        typeof payload.message === "string" ? payload.message : "AI 品牌分析已完成。";
      setNotice({ type: "success", message });
      showToast({ type: "success", title: "AI 分析完成", description: message });
      router.refresh();
    } catch {
      const message = "网络暂时不可用，AI 分析失败。";
      setNotice({ type: "error", message });
      showToast({ type: "error", title: "AI 分析失败", description: message });
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="space-y-6">
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

      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <SectionTitle
                icon={FileText}
                title="基础信息"
                description={`当前品牌空间：${workspaceName}。这些信息是 AI 生成内容的基础上下文。`}
              />
              <Badge variant={isDirty ? "accent" : "secondary"}>
                {isDirty ? "有未保存修改" : "已同步"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                品牌名称
                <Input placeholder="例如：青柠生活馆" {...register("brandName")} />
                <FieldError message={errors.brandName?.message} />
              </label>

              <label className="space-y-2 text-sm font-medium">
                行业
                <Input placeholder="例如：饮品、电商、独立站" {...register("industry")} />
                <FieldError message={errors.industry?.message} />
              </label>

              <label className="space-y-2 text-sm font-medium">
                官网
                <Input placeholder="https://example.com" {...register("websiteUrl")} />
                <FieldError message={errors.websiteUrl?.message} />
              </label>

              <label className="space-y-2 text-sm font-medium">
                店铺链接
                <Input placeholder="https://store.example.com" {...register("storeUrl")} />
                <FieldError message={errors.storeUrl?.message} />
              </label>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                主营产品
                <Textarea
                  className="min-h-32"
                  placeholder="描述产品品类、核心卖点、价格带、使用场景等。"
                  {...register("productDescription")}
                />
                <FieldError message={errors.productDescription?.message} />
              </label>

              <label className="space-y-2 text-sm font-medium">
                目标用户
                <Textarea
                  className="min-h-32"
                  placeholder="描述人群画像、消费动机、常见痛点和内容偏好。"
                  {...register("targetAudience")}
                />
                <FieldError message={errors.targetAudience?.message} />
              </label>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                品牌关键词
                <Textarea
                  placeholder="例如：低糖，通勤，东方茶感，轻负担"
                  {...register("brandKeywords")}
                />
                <FieldError message={errors.brandKeywords?.message} />
              </label>

              <label className="space-y-2 text-sm font-medium">
                竞品链接
                <Textarea
                  placeholder="多个链接可用逗号或换行分隔。"
                  {...register("competitorLinks")}
                />
                <FieldError message={errors.competitorLinks?.message} />
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionTitle
              icon={Megaphone}
              title="品牌语调"
              description="把语气、常用表达和禁用表达沉淀成 AI 可遵守的写作规则。"
            />
          </CardHeader>
          <CardContent className="space-y-5">
            <ToneGuide />
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                品牌语气、常用表达、emoji 与文案长短偏好
                <Textarea
                  className="min-h-40"
                  placeholder="例如：可信、清爽、克制；常用“像朋友分享真实体验”的语气；少量使用 emoji；小红书可写 300-600 字，广告文案保持短句。"
                  {...register("brandTone")}
                />
                <FieldError message={errors.brandTone?.message} />
              </label>

              <label className="space-y-2 text-sm font-medium">
                不希望出现的表达 / 合规敏感项
                <Textarea
                  className="min-h-40"
                  placeholder="例如：100% 有效，全网第一，治愈，永久有效，医学承诺，夸大收益。"
                  {...register("forbiddenWords")}
                />
                <FieldError message={errors.forbiddenWords?.message} />
              </label>
            </div>
          </CardContent>
        </Card>

        <AnalysisResult
          analysis={analysis}
          canAnalyze={canAnalyze}
          isAnalyzing={isAnalyzing}
          isSubmitting={isSubmitting}
          isDirty={isDirty}
          onAnalyze={handleAnalyze}
        />

        <Card>
          <CardHeader>
            <SectionTitle
              icon={SlidersHorizontal}
              title="高级设置"
              description="用于补充平台偏好、默认生成规则和更细的合规要求。"
            />
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
              <label className="space-y-2 text-sm font-medium">
                平台偏好 / 默认生成规则
                <Textarea
                  className="min-h-36"
                  placeholder="例如：小红书优先真实体验和生活场景；Instagram 重点呈现视觉风格；TikTok 脚本前三秒要有强钩子；默认生成 3 个版本。"
                  {...register("platformPreferences")}
                />
                <FieldError message={errors.platformPreferences?.message} />
              </label>

              <div className="space-y-3 rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <AlertTriangle className="size-4 text-primary" />
                  合规提示
                </div>
                <p>
                  合规敏感项会和“不希望出现的表达”一起影响内容生成和合规检查。
                </p>
                <Separator />
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <Globe2 className="size-4 text-primary" />
                  平台规则
                </div>
                <p>
                  可以写入不同平台的格式、语气、长度和禁用表达偏好。
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t pt-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <Target className="mt-0.5 size-4 shrink-0" />
                <p>
                  数组字段会按逗号、中文逗号或换行切分后保存。AI 分析读取的是最近一次保存的数据。
                </p>
              </div>
              <Button type="submit" disabled={isSubmitting || isAnalyzing}>
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                保存品牌档案
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
