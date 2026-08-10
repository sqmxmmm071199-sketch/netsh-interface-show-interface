import { AssetStatus, AssetType } from "@prisma/client";
import {
  Archive,
  CheckCircle2,
  File,
  FileImage,
  FileText,
  Film,
  PackageOpen,
} from "lucide-react";
import Link from "next/link";
import { AssetAnalyzeButton } from "@/components/assets/asset-analyze-button";
import { AssetStatusSelect } from "@/components/assets/asset-status-select";
import { AssetUploadDialog } from "@/components/assets/asset-upload-dialog";
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
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  assetStatusLabels,
  assetTypeLabels,
  contentStatusLabels,
  formatDate,
  platformLabels,
} from "@/lib/labels";
import { getAssetsData } from "@/services/db/current-workspace";

export const dynamic = "force-dynamic";

type AssetsPageProps = {
  searchParams?: Promise<{
    status?: string;
  }>;
};

type AssetsData = NonNullable<Awaited<ReturnType<typeof getAssetsData>>["data"]>;
type AssetBatchItem = AssetsData["assetBatches"][number];
type BatchAssetItem = AssetBatchItem["assets"][number];
type AssetUsageContent = BatchAssetItem["generatedContents"][number];

const statusFilters = [
  { label: "全部", value: null, href: "/assets" },
  { label: "未使用", value: AssetStatus.UNUSED, href: "/assets?status=UNUSED" },
  { label: "已使用", value: AssetStatus.USED, href: "/assets?status=USED" },
  {
    label: "已归档",
    value: AssetStatus.ARCHIVED,
    href: "/assets?status=ARCHIVED",
  },
] as const;

function parseAssetStatus(value?: string) {
  if (
    value === AssetStatus.UNUSED ||
    value === AssetStatus.USED ||
    value === AssetStatus.ARCHIVED
  ) {
    return value;
  }

  return null;
}

function getAssetStatusVariant(status: AssetStatus) {
  if (status === AssetStatus.USED) return "default";
  if (status === AssetStatus.ARCHIVED) return "outline";
  return "secondary";
}

function AssetIcon({
  type,
  status,
}: {
  type: AssetType;
  status: AssetStatus;
}) {
  if (status === AssetStatus.ARCHIVED) return <Archive className="size-5" />;
  if (type === AssetType.IMAGE) return <FileImage className="size-5" />;
  if (type === AssetType.VIDEO) return <Film className="size-5" />;
  if (type === AssetType.TEXT) return <FileText className="size-5" />;
  return <File className="size-5" />;
}

function getAssetFileName(asset: BatchAssetItem) {
  return asset.fileName ?? asset.title;
}

function getAssetFileType(asset: BatchAssetItem) {
  return asset.fileType ?? asset.mimeType ?? assetTypeLabels[asset.type];
}

function getAssetDescription(asset: BatchAssetItem) {
  return asset.aiDescription ?? asset.description ?? "暂无 AI 描述。";
}

function isPublishedUsage(content: AssetUsageContent) {
  return (
    content.status === "PUBLISHED" ||
    content.calendarItems.some((item) => item.status === "PUBLISHED")
  );
}

function getUsageSummary(contents: AssetUsageContent[]) {
  const publishedContents = contents.filter(isPublishedUsage);

  if (publishedContents.length > 0) {
    return {
      label: "已发布使用",
      variant: "default" as const,
      isPublished: true,
    };
  }

  if (contents.length > 0) {
    return {
      label: "已用于草稿",
      variant: "secondary" as const,
      isPublished: false,
    };
  }

  return {
    label: "未被内容使用",
    variant: "outline" as const,
    isPublished: false,
  };
}

function InlineEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-md border border-dashed bg-muted/30 p-8 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function AssetTile({ asset }: { asset: BatchAssetItem }) {
  const usage = getUsageSummary(asset.generatedContents);

  return (
    <div className="grid min-h-[28rem] min-w-0 grid-rows-[auto_1fr] overflow-hidden rounded-md border bg-background">
      <div className="flex min-w-0 items-start justify-between gap-3 border-b bg-muted/35 p-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground">
            <AssetIcon type={asset.type} status={asset.status} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {getAssetFileName(asset)}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {assetTypeLabels[asset.type]} · {getAssetFileType(asset)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <Badge variant={getAssetStatusVariant(asset.status)}>
            {assetStatusLabels[asset.status]}
          </Badge>
          <Badge variant={usage.variant}>{usage.label}</Badge>
        </div>
      </div>

      <div className="flex min-w-0 flex-col justify-between gap-4 p-4">
        <div className="min-w-0 space-y-4">
          <div className="flex min-w-0 flex-wrap gap-2">
            {asset.tags.length > 0 ? (
              asset.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="max-w-full break-words">
                  {tag}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">暂无标签</span>
            )}
          </div>

          <p className="break-words text-sm leading-6 text-muted-foreground">
            {getAssetDescription(asset)}
          </p>

          <div className="grid min-w-0 gap-2 break-words text-xs text-muted-foreground">
            {asset.productName ? <p>产品：{asset.productName}</p> : null}
            {asset.scene ? <p>场景：{asset.scene}</p> : null}
            {asset.visualStyle ? <p>风格：{asset.visualStyle}</p> : null}
            {asset.suggestedUse ? (
              <p>建议用途：{asset.suggestedUse}</p>
            ) : null}
            {asset.recommendedPlatforms.length > 0 ? (
              <p>推荐平台：{asset.recommendedPlatforms.join("，")}</p>
            ) : null}
          </div>

          <Separator />

          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium">内容使用情况</span>
              <Badge
                variant={usage.isPublished ? "default" : "outline"}
                className="shrink-0"
              >
                {usage.isPublished ? "已发布：是" : "已发布：否"}
              </Badge>
            </div>

            {asset.generatedContents.length > 0 ? (
              <div className="min-w-0 space-y-2">
                {asset.generatedContents.slice(0, 4).map((content) => (
                  <div key={content.id} className="min-w-0 rounded-md border px-3 py-2">
                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {content.title}
                        </p>
                        <p className="mt-1 break-words text-xs text-muted-foreground">
                          {content.platforms
                            .map((platform) => platformLabels[platform])
                            .join("，") || "未设置平台"}
                        </p>
                      </div>
                      <Badge
                        variant={
                          isPublishedUsage(content) ? "default" : "secondary"
                        }
                        className="shrink-0"
                      >
                        {isPublishedUsage(content)
                          ? "已发布"
                          : contentStatusLabels[content.status]}
                      </Badge>
                    </div>
                  </div>
                ))}
                {asset.generatedContents.length > 4 ? (
                  <p className="text-xs text-muted-foreground">
                    还有 {asset.generatedContents.length - 4} 条内容使用了该素材。
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                暂无生成内容关联该素材。
              </div>
            )}
          </div>
        </div>

        <div className="grid min-w-0 gap-3">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              手动修改素材状态
            </p>
            <AssetStatusSelect assetId={asset.id} status={asset.status} />
          </div>
          <AssetAnalyzeButton assetId={asset.id} />
        </div>
      </div>
    </div>
  );
}

function AssetBatchSection({ batch }: { batch: AssetBatchItem }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PackageOpen className="size-4 text-primary" />
              {batch.name}
            </CardTitle>
            <CardDescription className="mt-2">
              {batch.description ?? "暂无批次说明。"}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{batch._count.assets} 个素材</Badge>
            <Badge variant="outline">{batch.source ?? "未填写来源"}</Badge>
            <Badge variant="outline">更新于 {formatDate(batch.updatedAt)}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {batch.assets.length > 0 ? (
          <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {batch.assets.map((asset) => (
              <AssetTile key={asset.id} asset={asset} />
            ))}
          </div>
        ) : (
          <InlineEmptyState
            title="当前筛选下没有素材"
            description="可以切换筛选条件，或上传新的素材批次。"
          />
        )}
      </CardContent>
    </Card>
  );
}

function AssetStatusFilters({
  activeStatus,
  total,
}: {
  activeStatus: AssetStatus | null;
  total: number;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium">素材状态筛选</p>
        <p className="mt-1 text-sm text-muted-foreground">
          当前视图共 {total} 个素材，发布后的内容会自动把关联素材标记为已使用。
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((filter) => (
          <Button
            key={filter.href}
            asChild
            size="sm"
            variant={activeStatus === filter.value ? "default" : "outline"}
          >
            <Link href={filter.href}>{filter.label}</Link>
          </Button>
        ))}
      </div>
    </div>
  );
}

export default async function AssetsPage({ searchParams }: AssetsPageProps) {
  const params = await searchParams;
  const activeStatus = parseAssetStatus(params?.status);
  const result = await getAssetsData(activeStatus);
  const data = result.data;

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Assets"
          title="素材库"
          description="创建素材批次，上传图片、视频、PDF、文档和文本资料。"
          action={<AssetUploadDialog />}
        />
        <EmptyState
          title="暂无素材数据"
          description={
            result.error ??
            "请先执行 seed，或为当前 workspace 创建素材。"
          }
          action={<AssetUploadDialog />}
        />
      </div>
    );
  }

  const totalAssetCount = data.assetBatches.reduce(
    (count, batch) => count + batch._count.assets,
    0,
  );
  const visibleBatches = data.assetBatches.filter(
    (batch) => batch.assets.length > 0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Assets"
        title={`${data.workspace.name} 素材库`}
        description="按批次管理素材文件，追踪素材是否进入草稿、是否随内容发布，并支持手动调整状态。"
        action={<AssetUploadDialog />}
      />

      {totalAssetCount === 0 ? (
        <EmptyState
          title="上传第一批产品素材，AI 会帮你整理和打标签。"
          description="可以先上传产品图、场景图、PDF、视频或文本资料，后续内容生成会优先参考这些素材。"
          action={<AssetUploadDialog />}
        />
      ) : null}

      {totalAssetCount > 0 ? (
        <>
          <AssetStatusFilters
            activeStatus={activeStatus}
            total={data.assets.length}
          />

          <Card>
            <CardHeader>
              <CardTitle>素材批次列表</CardTitle>
              <CardDescription>
                来自 AssetBatch，数量展示批次内全部素材；下方卡片会应用当前状态筛选。
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.assetBatches.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>批次名称</TableHead>
                      <TableHead>说明</TableHead>
                      <TableHead>来源</TableHead>
                      <TableHead className="text-right">数量</TableHead>
                      <TableHead>更新时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.assetBatches.map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-medium">
                          {batch.name}
                        </TableCell>
                        <TableCell className="max-w-md truncate">
                          {batch.description ?? "未填写"}
                        </TableCell>
                        <TableCell>{batch.source ?? "未填写"}</TableCell>
                        <TableCell className="text-right">
                          {batch._count.assets}
                        </TableCell>
                        <TableCell>{formatDate(batch.updatedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <InlineEmptyState
                  title="暂无素材批次"
                  description="点击上传素材创建第一个批次。"
                />
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            {visibleBatches.length > 0 ? (
              visibleBatches.map((batch) => (
                <AssetBatchSection key={batch.id} batch={batch} />
              ))
            ) : (
              <div className="rounded-md border border-dashed bg-card p-10 text-center">
                <CheckCircle2 className="mx-auto mb-3 size-8 text-muted-foreground" />
                <p className="text-sm font-medium">当前筛选下暂无素材</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  可以切换状态筛选，或上传新素材继续沉淀内容资产。
                </p>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
