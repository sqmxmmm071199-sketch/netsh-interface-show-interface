"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { getApiErrorMessage, parseApiPayload } from "@/lib/client-api";

type NoticeState = {
  type: "success" | "error";
  message: string;
} | null;

export function AssetAnalyzeButton({ assetId }: { assetId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);

  async function handleAnalyze() {
    setNotice(null);
    setIsAnalyzing(true);

    try {
      const response = await fetch(`/api/assets/${assetId}/analyze`, {
        method: "POST",
      });
      const payload = await parseApiPayload(response);

      if (!response.ok) {
        const message = getApiErrorMessage(payload, "AI 分析失败，请稍后再试。");
        setNotice({ type: "error", message });
        showToast({ type: "error", title: "AI 分析失败", description: message });
        return;
      }

      const message =
        typeof payload.message === "string" ? payload.message : "素材 AI 分析已完成。";
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
    <div className="min-w-0 space-y-2">
      <Button
        className="w-full min-w-0"
        type="button"
        variant="secondary"
        disabled={isAnalyzing}
        onClick={handleAnalyze}
      >
        {isAnalyzing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Sparkles className="size-4" />
        )}
        AI 分析
      </Button>
      {notice ? (
        <p
          className={`text-xs leading-5 ${
            notice.type === "success" ? "text-emerald-700" : "text-destructive"
          }`}
        >
          {notice.message}
        </p>
      ) : null}
    </div>
  );
}
