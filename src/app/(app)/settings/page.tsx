import { SettingsContent } from "@/components/settings/settings-content";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { requireCurrentWorkspace } from "@/lib/auth/current-workspace";
import { getAiProviderLabel } from "@/services/ai";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const current = await requireCurrentWorkspace();

  if (!current.data?.workspace) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Settings"
          title="工作区设置"
          description="管理团队、通知、AI 能力和品牌工作区偏好。"
        />
        <EmptyState
          title="暂无可用品牌空间"
          description={current.error ?? "请先创建品牌空间，再进入设置页。"}
        />
      </div>
    );
  }

  return (
    <SettingsContent
      workspace={{
        name: current.data.workspace.name,
        slug: current.data.workspace.slug,
      }}
      aiProviderLabel={getAiProviderLabel()}
    />
  );
}
