"use client";

import { FormEvent, useMemo, useState } from "react";
import type { ContentStatus, ContentType, Platform } from "@prisma/client";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Filter,
  Loader2,
  Plus,
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
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  contentStatusLabels,
  contentTypeLabels,
  platformLabels,
} from "@/lib/labels";
import { useToast } from "@/components/ui/toast-provider";
import { getApiErrorMessage, parseApiPayload } from "@/lib/client-api";

export type CalendarPlanItem = {
  id: string;
  title: string;
  description: string | null;
  platform: Platform;
  contentType: ContentType;
  status: ContentStatus;
  scheduledAt: string;
  publishedAt: string | null;
  ownerName: string | null;
  notes: string | null;
  generatedContentId: string | null;
  generatedContentTitle: string | null;
};

export type CalendarGeneratedContentOption = {
  id: string;
  title: string;
  body: string;
  type: ContentType;
  status: ContentStatus;
  platforms: Platform[];
  assets: Array<{
    id: string;
    title: string | null;
    fileName: string | null;
  }>;
};

type CalendarStatusFilter = ContentStatus | "ALL";

const statusFilters = [
  "ALL",
  "DRAFT",
  "SCHEDULED",
  "PUBLISHED",
  "ARCHIVED",
] as const satisfies readonly CalendarStatusFilter[];

const statusOptions = [
  "DRAFT",
  "SCHEDULED",
  "PUBLISHED",
  "ARCHIVED",
] as const satisfies readonly ContentStatus[];

const platformOptions = [
  "INSTAGRAM",
  "TIKTOK",
  "FACEBOOK",
  "PINTEREST",
  "LINKEDIN",
  "XIAOHONGSHU",
] as const satisfies readonly Platform[];

function getDefaultDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toInputDate(date);
}

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function getStatusLabel(status: CalendarStatusFilter) {
  return status === "ALL" ? "全部" : contentStatusLabels[status];
}

function getStatusVariant(
  status: ContentStatus,
): "default" | "secondary" | "outline" | "accent" {
  if (status === "PUBLISHED") return "default";
  if (status === "SCHEDULED") return "secondary";
  if (status === "DRAFT") return "outline";
  return "accent";
}

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(new Date(value));
}

function formatTimeOnly(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function sortPlans(plans: CalendarPlanItem[]) {
  return [...plans].sort(
    (a, b) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );
}

export function CalendarContent({
  items,
  generatedContents,
}: {
  items: CalendarPlanItem[];
  generatedContents: CalendarGeneratedContentOption[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [plans, setPlans] = useState(() => sortPlans(items));
  const [status, setStatus] = useState<CalendarStatusFilter>("ALL");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    plans[0] ? new Date(plans[0].scheduledAt) : new Date(),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState(
    generatedContents[0]?.id ?? "",
  );
  const selectedContent = useMemo(
    () =>
      generatedContents.find((content) => content.id === selectedContentId) ??
      generatedContents[0] ??
      null,
    [generatedContents, selectedContentId],
  );
  const [plannedDate, setPlannedDate] = useState(getDefaultDate);
  const [plannedTime, setPlannedTime] = useState("10:00");
  const [platform, setPlatform] = useState<Platform>(
    selectedContent?.platforms[0] ?? "XIAOHONGSHU",
  );
  const [topic, setTopic] = useState(selectedContent?.title ?? "");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const visiblePlans = useMemo(
    () =>
      status === "ALL"
        ? plans
        : plans.filter((item) => item.status === status),
    [plans, status],
  );

  const plannedDates = useMemo(
    () => plans.map((item) => new Date(item.scheduledAt)),
    [plans],
  );

  const selectedMonthPlans = useMemo(() => {
    const activeDate = selectedDate ?? new Date();
    const monthKey = getMonthKey(activeDate);
    return plans.filter((plan) => getMonthKey(new Date(plan.scheduledAt)) === monthKey);
  }, [plans, selectedDate]);

  function handleContentChange(contentId: string) {
    const content = generatedContents.find((item) => item.id === contentId);
    setSelectedContentId(contentId);
    setTopic(content?.title ?? "");
    setPlatform(content?.platforms[0] ?? "XIAOHONGSHU");
  }

  function notifySuccess(message: string) {
    setSuccessMessage(message);
    showToast({ type: "success", title: "操作成功", description: message });
  }

  function notifyError(title: string, message: string) {
    setFormError(message);
    showToast({ type: "error", title, description: message });
  }

  async function handleCreateCalendarItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!selectedContent) {
      setFormError("请先保存至少一条生成内容，再加入内容日历。");
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch("/api/calendar-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generatedContentId: selectedContent.id,
          plannedDate,
          plannedTime,
          platform,
          topic,
          notes,
        }),
      });
      const data = await parseApiPayload(response);

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, "创建内容日历项失败。"));
      }

      const item = data.item as Omit<
        CalendarPlanItem,
        "generatedContentTitle"
      > & {
        generatedContent?: { title: string } | null;
      };

      const nextPlan: CalendarPlanItem = {
        id: item.id,
        title: item.title,
        description: item.description,
        platform: item.platform,
        contentType: item.contentType,
        status: item.status,
        scheduledAt: item.scheduledAt,
        publishedAt: item.publishedAt,
        ownerName: item.ownerName,
        notes: item.notes,
        generatedContentId: item.generatedContentId,
        generatedContentTitle:
          item.generatedContent?.title ?? selectedContent.title,
      };

      setPlans((current) => sortPlans([...current, nextPlan]));
      setSelectedDate(new Date(nextPlan.scheduledAt));
      setDialogOpen(false);
      setNotes("");
      notifySuccess("已加入内容日历。");
      router.refresh();
    } catch (error) {
      notifyError(
        "创建失败",
        error instanceof Error ? error.message : "创建内容日历项失败。",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleStatusChange(itemId: string, nextStatus: ContentStatus) {
    setUpdatingItemId(itemId);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/calendar-items/${itemId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await parseApiPayload(response);

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, "更新日历状态失败。"));
      }

      setPlans((current) =>
        current.map((plan) =>
          plan.id === itemId
            ? {
                ...plan,
                status: nextStatus,
                publishedAt:
                  nextStatus === "PUBLISHED"
                    ? (data.item?.publishedAt ?? new Date().toISOString())
                    : null,
              }
            : plan,
        ),
      );
      notifySuccess(
        nextStatus === "PUBLISHED"
          ? "已标记为发布，并同步更新内容与关联素材状态。"
          : "日历状态已更新。",
      );
      router.refresh();
    } catch (error) {
      notifyError(
        "更新失败",
        error instanceof Error ? error.message : "更新日历状态失败。",
      );
    } finally {
      setUpdatingItemId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">内容日历管理</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            用内容库里的 GeneratedContent 创建排期，并在发布后同步更新内容和素材状态。
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={generatedContents.length === 0}>
              <Plus className="size-4" />
              加入日历
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>加入内容日历</DialogTitle>
              <DialogDescription>
                选择一条已保存内容，设置发布时间、平台和内容主题。
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCreateCalendarItem}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-medium md:col-span-2">
                  选择内容
                  <Select
                    value={selectedContent?.id ?? ""}
                    onValueChange={handleContentChange}
                    disabled={generatedContents.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择内容库中的生成内容" />
                    </SelectTrigger>
                    <SelectContent>
                      {generatedContents.map((content) => (
                        <SelectItem key={content.id} value={content.id}>
                          {content.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="space-y-2 text-sm font-medium">
                  发布日期
                  <Input
                    type="date"
                    value={plannedDate}
                    onChange={(event) => setPlannedDate(event.target.value)}
                    required
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  发布时间
                  <Input
                    type="time"
                    value={plannedTime}
                    onChange={(event) => setPlannedTime(event.target.value)}
                    required
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  平台
                  <Select
                    value={platform}
                    onValueChange={(value) => setPlatform(value as Platform)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {platformOptions.map((item) => (
                        <SelectItem key={item} value={item}>
                          {platformLabels[item]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="space-y-2 text-sm font-medium">
                  内容主题
                  <Input
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    placeholder="例如：新品上市预热"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm font-medium md:col-span-2">
                  备注
                  <Textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="可填写发布注意事项、素材使用要求或协作说明。"
                    rows={4}
                  />
                </label>
              </div>
              {selectedContent ? (
                <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">
                    {selectedContent.title}
                  </div>
                  <div className="mt-1 line-clamp-2">
                    {selectedContent.body}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {contentTypeLabels[selectedContent.type]}
                    </Badge>
                    <Badge variant="secondary">
                      {selectedContent.assets.length} 个关联素材
                    </Badge>
                  </div>
                </div>
              ) : null}
              {formError ? (
                <p className="text-sm text-destructive">{formError}</p>
              ) : null}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  取消
                </Button>
                <Button type="submit" disabled={isCreating || !selectedContent}>
                  {isCreating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  创建排期
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {successMessage ? (
        <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
          <CheckCircle2 className="size-4" />
          {successMessage}
        </div>
      ) : null}
      {formError && !dialogOpen ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {formError}
        </div>
      ) : null}

      {plans.length === 0 ? (
        <div className="rounded-md border border-dashed bg-muted/30 p-8 text-center">
          <p className="text-sm font-medium">
            把生成的内容加入日历，规划接下来一周的发布。
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {generatedContents.length > 0
              ? "点击加入日历，为已保存内容设置发布日期、时间和平台。"
              : "先在 Content Studio 保存一条内容，再回到这里创建发布计划。"}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
        <Card className="self-start">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" />
              月历视图
            </CardTitle>
            <CardDescription>查看当月排期分布和计划密度。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => setSelectedDate(date)}
              defaultMonth={selectedDate}
              modifiers={{
                planned: plannedDates,
              }}
              modifiersClassNames={{
                planned: "border border-primary/50 bg-primary/5",
              }}
            />
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">本月计划</span>
                <Badge variant="secondary">{selectedMonthPlans.length} 条</Badge>
              </div>
              {selectedMonthPlans.length > 0 ? (
                <div className="space-y-2">
                  {selectedMonthPlans.slice(0, 5).map((plan) => (
                    <div
                      key={plan.id}
                      className="rounded-md border px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate font-medium">{plan.title}</span>
                        <Badge variant={getStatusVariant(plan.status)}>
                          {contentStatusLabels[plan.status]}
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatDateOnly(plan.scheduledAt)} ·{" "}
                        {formatTimeOnly(plan.scheduledAt)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  {plans.length === 0
                    ? "把生成的内容加入日历，规划接下来一周的发布。"
                    : "当前月份还没有内容计划。"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>列表视图</CardTitle>
                <CardDescription>
                  管理发布日期、发布平台、内容主题和执行状态。
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-muted-foreground" />
                <Select
                  value={status}
                  onValueChange={(value) =>
                    setStatus(value as CalendarStatusFilter)
                  }
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusFilters.map((item) => (
                      <SelectItem key={item} value={item}>
                        {getStatusLabel(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {visiblePlans.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>日期</TableHead>
                      <TableHead>时间</TableHead>
                      <TableHead>平台</TableHead>
                      <TableHead>内容标题</TableHead>
                      <TableHead>主题</TableHead>
                      <TableHead>状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visiblePlans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDateOnly(plan.scheduledAt)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="size-3.5 text-muted-foreground" />
                            {formatTimeOnly(plan.scheduledAt)}
                          </span>
                        </TableCell>
                        <TableCell>{platformLabels[plan.platform]}</TableCell>
                        <TableCell className="min-w-48">
                          <div className="font-medium">
                            {plan.generatedContentTitle ?? "未关联内容"}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {contentTypeLabels[plan.contentType]}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-44">
                          <div className="font-medium">{plan.title}</div>
                          {plan.notes ? (
                            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {plan.notes}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={plan.status}
                            onValueChange={(value) =>
                              handleStatusChange(plan.id, value as ContentStatus)
                            }
                            disabled={updatingItemId === plan.id}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((item) => (
                                <SelectItem key={item} value={item}>
                                  {contentStatusLabels[item]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {plan.status === "PUBLISHED" ? (
                            <div className="mt-2 text-xs text-muted-foreground">
                              已同步素材为已使用
                            </div>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-8 text-center">
                <div className="text-sm font-medium">
                  {plans.length === 0
                    ? "把生成的内容加入日历，规划接下来一周的发布。"
                    : "暂无匹配计划"}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {plans.length === 0
                    ? "创建第一条排期后，它会出现在列表视图和月历视图中。"
                    : "可以切换状态筛选，或从内容库添加新的排期。"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
