import {
  Archive,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  FileWarning,
  Megaphone,
  PackageOpen,
  ShieldAlert,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  createInsightsFallback,
  generateInsights,
  getAiProviderLabel,
  isAiConfigured,
} from "@/services/ai";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  assetStatusLabels,
  contentStatusLabels,
  contentTypeLabels,
  platformLabels,
} from "@/lib/labels";
import { logError } from "@/lib/logger";
import { getInsightsData } from "@/services/db/current-workspace";

export const dynamic = "force-dynamic";

function percent(value: number, total: number) {
  if (total <= 0) return "0%";
  return `${Math.max(6, Math.round((value / total) * 100))}%`;
}

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: string | number;
  hint: string;
  icon: LucideIcon;
  tone?: "default" | "warning";
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm text-muted-foreground">
            {title}
          </CardTitle>
          <div
            className={`flex size-9 items-center justify-center rounded-md ${
              tone === "warning"
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/10 text-primary"
            }`}
          >
            <Icon className="size-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function SuggestionList({
  title,
  items,
  icon: Icon,
}: {
  title: string;
  items: string[];
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item} className="rounded-md border bg-background p-3">
                <p className="text-sm leading-6 text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">暂无建议。</p>
        )}
      </CardContent>
    </Card>
  );
}

function SuggestionBlock({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-md border bg-muted/20 p-4">
      <p className="text-sm font-medium">{title}</p>
      {items.length > 0 ? (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <p key={item} className="text-sm leading-6 text-muted-foreground">
              {item}
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">暂无建议。</p>
      )}
    </div>
  );
}

export default async function InsightsPage() {
  const result = await getInsightsData();
  const data = result.data;

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Insights"
          title="运营建议"
          description="连接数据库后，这里会读取当前 workspace 的月度运营数据。"
        />
        <EmptyState
          title="暂无统计数据"
          description={
            result.error ??
            "请先执行 seed，或为当前 workspace 创建内容资产。"
          }
        />
      </div>
    );
  }

  const aiResult = isAiConfigured()
    ? await generateInsights(data.insightsInput).catch((error) => {
        logError("insights/openai", error);
        return null;
      })
    : null;
  const insights = aiResult?.data ?? createInsightsFallback(data.insightsInput);
  const topPlatformLabel = data.topPlatform
    ? platformLabels[data.topPlatform.platform]
    : "暂无平台";
  const topContentTypeLabel = data.topContentType
    ? contentTypeLabels[data.topContentType.contentType]
    : "暂无类型";

  const statCards = [
    {
      title: "本月生成内容",
      value: data.stats.monthlyGeneratedContentCount,
      hint: `内容库累计 ${data.stats.contentCount} 条`,
      icon: Megaphone,
    },
    {
      title: "本月计划发布",
      value: data.stats.monthlyPlannedPublishCount,
      hint: `日历累计 ${data.stats.calendarItemCount} 条`,
      icon: CalendarDays,
    },
    {
      title: "本月已发布",
      value: data.stats.monthlyPublishedCount,
      hint: "仅统计系统内发布标记",
      icon: CheckCircle2,
    },
    {
      title: "高风险内容",
      value: data.stats.highRiskContentCount,
      hint: "来自合规检查 riskLevel=high",
      icon: ShieldAlert,
      tone: data.stats.highRiskContentCount > 0 ? "warning" : "default",
    },
    {
      title: "使用最多平台",
      value: topPlatformLabel,
      hint: data.topPlatform
        ? `${data.topPlatform.count} 次使用`
        : "本月暂无平台数据",
      icon: BarChart3,
    },
    {
      title: "最常见内容类型",
      value: topContentTypeLabel,
      hint: data.topContentType
        ? `${data.topContentType.count} 次出现`
        : "本月暂无内容类型数据",
      icon: Archive,
    },
    {
      title: "未使用素材",
      value: data.stats.unusedAssetCount,
      hint: `素材累计 ${data.stats.assetCount} 个`,
      icon: PackageOpen,
      tone: data.stats.unusedAssetCount > 0 ? "warning" : "default",
    },
    {
      title: "已使用素材",
      value: data.stats.usedAssetCount,
      hint: "由发布标记或手动状态维护",
      icon: Sparkles,
    },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insights"
        title={`${data.workspace.name} 运营建议`}
        description={`${data.monthLabel} 月度总结。MVP 阶段仅基于系统内数据，不连接真实社媒平台表现。`}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  AI 月度总结
                </CardTitle>
                <CardDescription>
                  基于 BrandProfile、素材、内容、日历和 BrandMemory 生成。
                </CardDescription>
              </div>
              <Badge variant={aiResult?.parsed ? "default" : "secondary"}>
                {isAiConfigured()
                  ? aiResult?.parsed
                    ? `${getAiProviderLabel()} JSON`
                    : `${getAiProviderLabel()} fallback`
                  : "本地 fallback"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-7 text-muted-foreground">
              {insights.monthlySummary}
            </p>
            <Separator className="my-5" />
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-md border bg-background p-4">
                <p className="text-sm text-muted-foreground">品牌记忆</p>
                <p className="mt-2 text-lg font-semibold">
                  {data.stats.activeMemoryCount} 条
                </p>
              </div>
              <div className="rounded-md border bg-background p-4">
                <p className="text-sm text-muted-foreground">素材利用</p>
                <p className="mt-2 text-lg font-semibold">
                  {data.stats.usedAssetCount}/{data.stats.assetCount}
                </p>
              </div>
              <div className="rounded-md border bg-background p-4">
                <p className="text-sm text-muted-foreground">主要平台</p>
                <p className="mt-2 text-lg font-semibold">{topPlatformLabel}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" />
              下月建议
            </CardTitle>
            <CardDescription>把总结转成可执行的排期动作。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.nextMonthPlan.map((item) => (
                <div key={item} className="rounded-md border bg-background p-3">
                  <p className="text-sm leading-6 text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageOpen className="size-4 text-primary" />
              未使用素材提醒
            </CardTitle>
            <CardDescription>
              当前还有 {data.stats.unusedAssetCount} 个素材尚未进入已使用状态。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.unusedAssetSamples.length > 0 ? (
              <div className="space-y-2">
                {data.unusedAssetSamples.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between gap-3 rounded-md border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {asset.fileName ?? asset.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {asset.tags.slice(0, 3).join("，") || "暂无标签"}
                      </p>
                    </div>
                    <Badge variant="secondary">{assetStatusLabels.UNUSED}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
                当前没有未使用素材。
              </div>
            )}
            <SuggestionBlock title="素材建议" items={insights.assetSuggestions} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileWarning className="size-4 text-primary" />
              高风险内容提醒
            </CardTitle>
            <CardDescription>
              仅统计本月生成内容中合规检查为 high 的内容。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.highRiskContents.length > 0 ? (
              <div className="space-y-2">
                {data.highRiskContents.map((content) => (
                  <div key={content.id} className="rounded-md border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{content.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {contentTypeLabels[content.type]} ·{" "}
                          {content.platforms
                            .map((platform) => platformLabels[platform])
                            .join("，") || "未设置平台"}
                        </p>
                      </div>
                      <Badge variant="accent">高风险</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-md border border-dashed p-5 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4" />
                本月暂无 high 风险内容。
              </div>
            )}
            <SuggestionBlock title="风险建议" items={insights.riskSuggestions} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SuggestionList
          title="内容建议"
          items={insights.contentSuggestions}
          icon={Megaphone}
        />
        <SuggestionList
          title="平台建议"
          items={insights.platformSuggestions}
          icon={BarChart3}
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4 text-primary" />
              状态分布
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <p className="text-sm font-medium">素材状态</p>
              {data.assetsByStatus.map((item) => (
                <div key={item.status} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{assetStatusLabels[item.status]}</span>
                    <span className="text-muted-foreground">
                      {item._count._all}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{
                        width: percent(item._count._all, data.stats.assetCount),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <Separator />
            <div className="space-y-3">
              <p className="text-sm font-medium">内容状态</p>
              {data.contentsByStatus.map((item) => (
                <div key={item.status} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{contentStatusLabels[item.status]}</span>
                    <span className="text-muted-foreground">
                      {item._count._all}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{
                        width: percent(item._count._all, data.stats.contentCount),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
