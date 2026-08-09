import Link from "next/link";
import {
  ArrowRight,
  CalendarPlus,
  CheckCircle2,
  Circle,
  FileUp,
  Megaphone,
  PencilLine,
  Sparkles,
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
import { Separator } from "@/components/ui/separator";
import type { OnboardingStatus } from "@/types/onboarding";

type OnboardingChecklistProps = {
  status: OnboardingStatus;
};

const checklistConfig = [
  {
    key: "hasBrandProfile",
    title: "创建品牌档案",
    description: "填写品牌名称、目标用户、语调和禁用词。",
    href: "/brand-profile",
    actionLabel: "去填写",
    icon: PencilLine,
  },
  {
    key: "hasAssets",
    title: "上传第一批素材",
    description: "上传产品图、视频、文档或文本资料。",
    href: "/assets",
    actionLabel: "去上传",
    icon: FileUp,
  },
  {
    key: "hasGeneratedContent",
    title: "生成第一条内容",
    description: "选择平台和营销目标，生成品牌内容草稿。",
    href: "/content-studio",
    actionLabel: "去生成",
    icon: Sparkles,
  },
  {
    key: "hasCalendarItem",
    title: "加入内容日历",
    description: "把已保存内容排进未来一周的发布计划。",
    href: "/calendar",
    actionLabel: "去排期",
    icon: CalendarPlus,
  },
  {
    key: "hasPublishedContent",
    title: "标记已发布",
    description: "发布后同步内容状态，并把关联素材标记为已使用。",
    href: "/calendar",
    actionLabel: "去标记",
    icon: Megaphone,
  },
] as const;

export function OnboardingChecklist({ status }: OnboardingChecklistProps) {
  const items = checklistConfig.map((item) => ({
    ...item,
    completed: status[item.key],
  }));
  const completedCount = items.filter((item) => item.completed).length;
  const nextItem = items.find((item) => !item.completed);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>新手引导</CardTitle>
            <CardDescription>
              按这个顺序完成初始化，AI 会更快理解品牌资产和运营节奏。
            </CardDescription>
          </div>
          <Badge variant={completedCount === items.length ? "default" : "secondary"}>
            {completedCount}/{items.length} 已完成
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item, index) => {
            const Icon = item.icon;
            const StatusIcon = item.completed ? CheckCircle2 : Circle;

            return (
              <div key={item.key}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-md ${
                        item.completed
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusIcon
                          className={`size-4 ${
                            item.completed ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                        <p className="text-sm font-medium">{item.title}</p>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    variant={item.completed ? "outline" : "default"}
                    className="sm:w-24"
                  >
                    <Link href={item.href}>
                      {item.completed ? "查看" : item.actionLabel}
                    </Link>
                  </Button>
                </div>
                {index < items.length - 1 ? <Separator className="mt-3" /> : null}
              </div>
            );
          })}
        </div>

        {nextItem ? (
          <div className="mt-4 flex flex-col gap-3 rounded-md border bg-muted/35 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              下一步：<span className="font-medium text-foreground">{nextItem.title}</span>
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href={nextItem.href}>
                继续
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
