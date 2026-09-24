import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  FileText,
  Lightbulb,
  Megaphone,
  MessageSquareReply,
  PackageOpen,
  ShieldAlert,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import {
  createInsightsFallback,
  generateInsights,
  getAiProviderLabel,
  isAiConfigured,
} from "@/services/ai";
import { EmptyState } from "@/components/layout/empty-state";
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
import {
  contentStatusLabels,
  contentTypeLabels,
  platformLabels,
} from "@/lib/labels";
import { logError } from "@/lib/logger";
import { getInsightsData } from "@/services/db/current-workspace";

export const dynamic = "force-dynamic";

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

function AdviceSection({
  title,
  items,
  icon: Icon,
}: {
  title: string;
  items: string[];
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-md border bg-background p-4">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <p className="text-sm font-medium">{title}</p>
      </div>
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

function ReminderCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
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
          description="基于当前系统内数据生成简单、可执行的运营建议。"
        />
        <EmptyState
          title="暂无统计数据"
          description={
            result.error ??
            "请先上传素材、生成内容，并把内容加入日历后再查看运营建议。"
          }
        />
      </div>
    );
  }

  const hasOperationalData =
    data.stats.assetCount > 0 ||
    data.stats.contentCount > 0 ||
    data.stats.calendarItemCount > 0;

  if (!hasOperationalData) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Insights"
          title={`${data.workspace.name} 运营建议`}
          description="这里不会展示虚构数据；先沉淀素材和内容后，AI 才能给出可靠建议。"
        />
        <EmptyState
          title="还没有可分析的数据"
          description="请先上传第一批素材，并在内容生成页保存至少一条内容。之后这里会基于系统内数据生成建议。"
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild>
                <Link href="/assets">
                  <PackageOpen className="size-4" />
                  上传素材
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/content-studio">
                  <Sparkles className="size-4" />
                  生成内容
                </Link>
              </Button>
            </div>
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

  const statCards = [
    {
      title: "本月生成内容",
      value: data.stats.monthlyGeneratedContentCount,
      hint: "来自 GeneratedContent.createdAt",
      icon: Megaphone,
    },
    {
      title: "已计划内容",
      value: data.stats.monthlyPlannedPublishCount,
      hint: "来自本月 ContentCalendarItem",
      icon: CalendarDays,
    },
    {
      title: "已发布内容",
      value: data.stats.monthlyPublishedCount,
      hint: "仅统计系统内发布标记",
      icon: CheckCircle2,
    },
    {
      title: "未使用素材",
      value: data.stats.unusedAssetCount,
      hint: "来自 Asset.status = UNUSED",
      icon: PackageOpen,
      tone: data.stats.unusedAssetCount > 0 ? "warning" : "default",
    },
    {
      title: "高风险内容",
      value: data.stats.highRiskContentCount,
      hint: "来自合规检查 riskLevel=high",
      icon: ShieldAlert,
      tone: data.stats.highRiskContentCount > 0 ? "warning" : "default",
    },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insights"
        title={`${data.workspace.name} 运营建议`}
        description={`${data.monthLabel}，仅基于 BrandProfile、素材、内容、日历和品牌记忆生成。`}
        action={
          <Button asChild variant="outline">
            <Link href="/reply-assistant">
              <MessageSquareReply className="size-4" />
              生成评论/私信回复
            </Link>
          </Button>
        }
      />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">本月概览</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            这些数字全部来自当前 workspace 的数据库记录，不包含真实社媒平台表现。
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {statCards.map((card) => (
            <StatCard key={card.title} {...card} />
          ))}
        </div>
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="size-4 text-primary" />
                AI 运营建议
              </CardTitle>
              <CardDescription>
                AI 输入只包含系统内统计、样本内容、品牌档案和品牌记忆。
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
        <CardContent className="space-y-5">
          <div className="rounded-md border bg-muted/20 p-4">
            <p className="text-sm font-medium">本月总结</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {insights.monthlySummary}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <AdviceSection
              title="素材使用建议"
              items={insights.assetSuggestions}
              icon={PackageOpen}
            />
            <AdviceSection
              title="内容方向建议"
              items={insights.contentSuggestions}
              icon={Megaphone}
            />
            <AdviceSection
              title="平台建议"
              items={insights.platformSuggestions}
              icon={CalendarDays}
            />
            <AdviceSection
              title="风险提醒"
              items={insights.riskSuggestions}
              icon={ShieldAlert}
            />
          </div>

          <AdviceSection
            title="下月建议"
            items={insights.nextMonthPlan}
            icon={Sparkles}
          />
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">待处理提醒</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            优先处理这些项目，可以让内容资产更快进入发布节奏。
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <ReminderCard
            title="未使用素材"
            description={`当前还有 ${data.stats.unusedAssetCount} 个素材未使用。`}
            icon={PackageOpen}
          >
            {data.unusedAssetSamples.length > 0 ? (
              <div className="space-y-2">
                {data.unusedAssetSamples.map((asset) => (
                  <div key={asset.id} className="rounded-md border p-3">
                    <p className="truncate text-sm font-medium">
                      {asset.fileName ?? asset.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {asset.tags.slice(0, 3).join("，") || "暂无标签"}
                    </p>
                  </div>
                ))}
                <Button asChild size="sm" variant="outline" className="mt-2">
                  <Link href="/assets">查看素材库</Link>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4" />
                暂无未使用素材。
              </div>
            )}
          </ReminderCard>

          <ReminderCard
            title="未加入日历的内容"
            description={`当前还有 ${data.stats.unplannedContentCount} 条内容未加入日历。`}
            icon={FileText}
          >
            {data.unplannedContentSamples.length > 0 ? (
              <div className="space-y-2">
                {data.unplannedContentSamples.map((content) => (
                  <div key={content.id} className="rounded-md border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {content.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {contentTypeLabels[content.type]} ·{" "}
                          {content.platforms
                            .map((platform) => platformLabels[platform])
                            .join("，") || "未设置平台"}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {contentStatusLabels[content.status]}
                      </Badge>
                    </div>
                  </div>
                ))}
                <Button asChild size="sm" variant="outline" className="mt-2">
                  <Link href="/calendar">加入日历</Link>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4" />
                已保存内容基本都有日历计划。
              </div>
            )}
          </ReminderCard>

          <ReminderCard
            title="高风险内容"
            description={`本月有 ${data.stats.highRiskContentCount} 条高风险内容。`}
            icon={AlertTriangle}
          >
            {data.highRiskContents.length > 0 ? (
              <div className="space-y-2">
                {data.highRiskContents.map((content) => (
                  <div key={content.id} className="rounded-md border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {content.title}
                        </p>
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
              <div className="flex items-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4" />
                本月暂无 high 风险内容。
              </div>
            )}
          </ReminderCard>
        </div>
      </section>
    </div>
  );
}
