import { ReplyAssistantPanel } from "@/components/reply-assistant/reply-assistant-panel";
import { PageHeader } from "@/components/layout/page-header";

export const dynamic = "force-dynamic";

export default function ReplyAssistantPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reply Assistant"
        title="评论 / 私信回复建议"
        description="输入客户评论或私信，生成一条可复制的品牌口径回复。MVP 阶段不连接真实社媒后台。"
      />

      <ReplyAssistantPanel />
    </div>
  );
}
