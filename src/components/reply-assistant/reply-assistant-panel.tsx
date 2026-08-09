"use client";

import { FormEvent, useState } from "react";
import {
  Clipboard,
  Loader2,
  MessageSquareReply,
  Send,
  ShieldAlert,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import { getApiErrorMessage, parseApiPayload } from "@/lib/client-api";
import {
  replyScenarioLabels,
  type ReplyScenario,
  type ReplySuggestion,
} from "@/lib/prompts/reply-assistant";

const scenarioOptions = Object.entries(replyScenarioLabels) as Array<
  [ReplyScenario, string]
>;

type NoticeState = {
  type: "success" | "error";
  message: string;
} | null;

function CopyButton({ text, label = "复制" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={handleCopy}>
      <Clipboard className="size-4" />
      {copied ? "已复制" : label}
    </Button>
  );
}

export function ReplyAssistantPanel() {
  const { showToast } = useToast();
  const [customerMessage, setCustomerMessage] = useState("");
  const [scenario, setScenario] = useState<ReplyScenario>("GENERAL_INQUIRY");
  const [suggestion, setSuggestion] = useState<ReplySuggestion | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    setIsGenerating(true);

    try {
      const response = await fetch("/api/reply-assistant/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerMessage,
          scenario,
        }),
      });
      const payload = await parseApiPayload(response);

      if (!response.ok) {
        throw new Error(getApiErrorMessage(payload, "生成回复建议失败。"));
      }

      setSuggestion(payload.suggestion);
      const message =
        typeof payload.message === "string" ? payload.message : "回复建议已生成。";
      setNotice({ type: "success", message });
      showToast({ type: "success", title: "回复建议已生成", description: message });
    } catch (error) {
      const message = error instanceof Error ? error.message : "生成回复建议失败。";
      setNotice({ type: "error", message });
      showToast({ type: "error", title: "生成失败", description: message });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <Card className="self-start">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareReply className="size-4 text-primary" />
            回复配置
          </CardTitle>
          <CardDescription>
            输入客户评论或私信，选择场景后生成品牌口径回复建议。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
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

            <label className="space-y-2 text-sm font-medium">
              回复场景
              <Select
                value={scenario}
                onValueChange={(value) => setScenario(value as ReplyScenario)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {scenarioOptions.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="space-y-2 text-sm font-medium">
              客户评论或私信
              <Textarea
                value={customerMessage}
                onChange={(event) => setCustomerMessage(event.target.value)}
                placeholder="例如：你们这个产品真的适合敏感肌吗？有没有保证效果？"
                rows={9}
                required
              />
            </label>

            <Button
              className="w-full"
              type="submit"
              disabled={isGenerating || customerMessage.trim().length < 2}
            >
              {isGenerating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              生成回复建议
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>建议回复</CardTitle>
              <CardDescription>
                结果只作为回复草稿，不会连接或发送到真实社媒后台。
              </CardDescription>
            </div>
            <Badge variant="secondary">{replyScenarioLabels[scenario]}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {suggestion ? (
            <>
              <div className="rounded-md border bg-background p-4">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">主回复</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      语气：{suggestion.tone}
                    </p>
                  </div>
                  <CopyButton text={suggestion.suggestedReply} label="复制主回复" />
                </div>
                <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                  {suggestion.suggestedReply}
                </p>
              </div>

              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ShieldAlert className="size-4" />
                  风险提醒
                </div>
                <p className="mt-2 text-sm leading-6">{suggestion.riskNotes}</p>
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-sm font-medium">其他版本</p>
                {suggestion.alternativeReplies.map((reply, index) => (
                  <div key={`${reply}-${index}`} className="rounded-md border p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <Badge variant="outline">版本 {index + 1}</Badge>
                      <CopyButton text={reply} />
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                      {reply}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-md border border-dashed p-10 text-center">
              <MessageSquareReply className="mx-auto mb-3 size-8 text-muted-foreground" />
              <p className="text-sm font-medium">还没有回复建议</p>
              <p className="mt-2 text-sm text-muted-foreground">
                填写客户消息并选择回复场景后，AI 会根据品牌档案和品牌记忆生成建议。
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
