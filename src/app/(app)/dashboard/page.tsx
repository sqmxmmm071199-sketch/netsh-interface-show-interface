import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  FileImage,
  FileUp,
  PackageOpen,
  Plus,
  Sparkles,
} from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { OnboardingChecklist } from "@/components/onboarding/onboarding-checklist";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDashboardData } from "@/services/db/current-workspace";

export const dynamic = "force-dynamic";

const quickActions = [
  {
    title: "上传素材",
    description: "补充产品图、场景图、用户评价和短视频素材。",
    href: "/assets",
    icon: FileUp,
  },
  {
    title: "生成内容",
    description: "基于品牌档案和素材资产生成多平台内容草稿。",
    href: "/content-studio",
    icon: Sparkles,
  },
  {
    title: "创建内容日历",
    description: "把主题、平台和发布时间整理为本月运营计划。",
    href: "/calendar",
    icon: CalendarPlus,
  },
];

export default async function DashboardPage() {
  const result = await getDashboardData();
  const data = result.data;

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Dashboard"
          title="品牌空间概览"
          description="连接数据库后，这里会显示当前 workspace 的素材、内容和日历统计。"
        />
        <EmptyState
          title="暂无可用 workspace"
          description={
            result.error ??
            "请先执行数据库迁移和 seed，或创建一个新的品牌空间。"
          }
          action={
            <Button asChild>
              <Link href="/workspaces/new">
                <Plus className="size-4" />
                创建品牌空间
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const metrics = [
    {
      label: "素材数量",
      value: String(data.stats.assetCount),
      trend: `${data.stats.unusedAssetCount} 未使用`,
      icon: FileImage,
    },
    {
      label: "已生成内容",
      value: String(data.stats.generatedContentCount),
      trend: "来自内容库",
      icon: Sparkles,
    },
    {
      label: "本月内容计划",
      value: String(data.stats.calendarItemCount),
      trend: "全部计划",
      icon: CalendarDays,
    },
    {
      label: "素材批次",
      value: String(data.stats.batchCount),
      trend: "已入库",
      icon: PackageOpen,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title={`${data.workspace.name} 概览`}
        description={`当前登录用户：${data.user.email}。所有数据按当前 workspace 隔离。`}
        action={
          <Button asChild>
            <Link href="/content-studio">
              <Sparkles className="size-4" />
              生成内容
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <StatCard key={metric.label} {...metric} />
        ))}
      </div>

      {!data.onboarding.hasBrandProfile ? (
        <EmptyState
          title="先创建你的品牌档案，让 AI 了解你的品牌。"
          description="品牌档案会影响后续素材分析、内容生成、合规检查和运营建议。"
          action={
            <Button asChild>
              <Link href="/brand-profile">
                <Plus className="size-4" />
                创建品牌档案
              </Link>
            </Button>
          }
        />
      ) : null}

      <OnboardingChecklist status={data.onboarding} />

      <div className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
        <Card>
          <CardHeader>
            <CardTitle>快捷入口</CardTitle>
            <CardDescription>
              高频动作放在首页，减少日常运营切换成本。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <div
                  key={action.title}
                  className="flex items-center gap-3 rounded-md border bg-background p-3"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{action.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={action.href}>
                      进入
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>当前品牌空间</CardTitle>
                <CardDescription>
                  来自 Prisma 的 workspace 与聚合统计。
                </CardDescription>
              </div>
              <Button variant="outline" asChild>
                <Link href="/workspaces/new">新建品牌空间</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>品牌空间</TableHead>
                  <TableHead>负责人</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">素材</TableHead>
                  <TableHead className="text-right">内容</TableHead>
                  <TableHead className="text-right">计划</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">
                    {data.workspace.name}
                  </TableCell>
                  <TableCell>
                    {data.workspace.owner.name ?? data.workspace.owner.email}
                  </TableCell>
                  <TableCell>
                    <Badge>活跃</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {data.stats.assetCount}
                  </TableCell>
                  <TableCell className="text-right">
                    {data.stats.generatedContentCount}
                  </TableCell>
                  <TableCell className="text-right">
                    {data.stats.calendarItemCount}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>今日运营焦点</CardTitle>
          <CardDescription>基于数据库统计生成的轻量提醒。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              [
                "未使用素材",
                `当前有 ${data.stats.unusedAssetCount} 个素材还未用于生成内容。`,
              ],
              [
                "内容资产",
                `已沉淀 ${data.stats.generatedContentCount} 条生成内容，可继续复用。`,
              ],
              [
                "日历计划",
                `当前 workspace 有 ${data.stats.calendarItemCount} 个内容日历项。`,
              ],
            ].map(([title, body], index) => (
              <div key={title} className="rounded-md border bg-background p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-7 items-center justify-center rounded-md bg-muted text-sm font-semibold">
                    {index + 1}
                  </span>
                  <p className="font-medium">{title}</p>
                </div>
                <Separator className="my-3" />
                <p className="text-sm leading-6 text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
