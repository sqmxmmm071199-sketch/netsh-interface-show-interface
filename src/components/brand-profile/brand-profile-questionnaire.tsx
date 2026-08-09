"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, Sparkles } from "lucide-react";
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
};

type NoticeState = {
  type: "success" | "error";
  message: string;
} | null;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function AnalysisList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border bg-background p-4">
      <p className="text-sm font-medium">{title}</p>
      {items.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <Badge key={item} variant="outline">
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

function AnalysisResult({ analysis }: { analysis: BrandProfileAnalysisView | null }) {
  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI 分析结果</CardTitle>
          <CardDescription>保存品牌问卷后，点击“AI 分析品牌”生成结果。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-dashed bg-muted/40 p-8 text-center text-sm text-muted-foreground">
            当前还没有 AI 分析结果。
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>AI 分析结果</CardTitle>
            <CardDescription>
              结果已保存到 BrandProfile，可作为后续内容生成上下文。
            </CardDescription>
          </div>
          {analysis.aiAnalysisUpdatedAt ? (
            <Badge variant="secondary">
              {new Date(analysis.aiAnalysisUpdatedAt).toLocaleString("zh-CN")}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border bg-background p-4">
            <p className="text-sm font-medium">品牌总结</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {analysis.brandSummary || "暂无结果"}
            </p>
          </div>
          <div className="rounded-md border bg-background p-4">
            <p className="text-sm font-medium">目标用户总结</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {analysis.targetAudienceSummary || "暂无结果"}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnalysisList title="品牌语调关键词" items={analysis.toneOfVoice} />
          <AnalysisList title="内容方向" items={analysis.contentAngles} />
          <AnalysisList title="不建议使用的营销表达" items={analysis.forbiddenClaims} />
          <AnalysisList title="推荐平台" items={analysis.recommendedPlatforms} />
          <AnalysisList title="营销建议" items={analysis.marketingSuggestions} />
        </div>
      </CardContent>
    </Card>
  );
}

export function BrandProfileQuestionnaire({
  workspaceName,
  initialValues,
  initialAnalysis,
}: BrandProfileQuestionnaireProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [notice, setNotice] = useState<NoticeState>(null);
  const [analysis, setAnalysis] = useState<BrandProfileAnalysisView | null>(
    initialAnalysis,
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>品牌档案问卷</CardTitle>
                <CardDescription>
                  当前品牌空间：{workspaceName}。填写后保存到 BrandProfile。
                </CardDescription>
              </div>
              <Badge variant={isDirty ? "accent" : "secondary"}>
                {isDirty ? "有未保存修改" : "已同步"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
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

            <Separator />

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
                品牌语调
                <Textarea
                  placeholder="例如：可信、清爽、克制、像朋友分享。可用逗号分隔。"
                  {...register("brandTone")}
                />
                <FieldError message={errors.brandTone?.message} />
              </label>

              <label className="space-y-2 text-sm font-medium">
                品牌关键词
                <Textarea
                  placeholder="例如：低糖，通勤，东方茶感，轻负担"
                  {...register("brandKeywords")}
                />
                <FieldError message={errors.brandKeywords?.message} />
              </label>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                禁用词
                <Textarea
                  placeholder="例如：减肥神器，治愈焦虑，全网第一"
                  {...register("forbiddenWords")}
                />
                <FieldError message={errors.forbiddenWords?.message} />
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

            <label className="space-y-2 text-sm font-medium">
              平台偏好
              <Textarea
                className="min-h-28"
                placeholder="例如：小红书真实体验，Instagram 生活方式视觉，TikTok 前三秒强钩子"
                {...register("platformPreferences")}
              />
              <FieldError message={errors.platformPreferences?.message} />
            </label>

            <div className="flex flex-col gap-3 border-t pt-5 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-sm text-muted-foreground">
                数组字段会按逗号、中文逗号或换行切分后保存。AI 分析会读取已保存的数据。
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="submit" disabled={isSubmitting || isAnalyzing}>
                  {isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  保存品牌档案
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSubmitting || isAnalyzing || isDirty}
                  onClick={handleAnalyze}
                  title={isDirty ? "请先保存品牌问卷" : "AI 分析品牌"}
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
          </CardContent>
        </Card>
      </form>

      <AnalysisResult analysis={analysis} />
    </div>
  );
}
