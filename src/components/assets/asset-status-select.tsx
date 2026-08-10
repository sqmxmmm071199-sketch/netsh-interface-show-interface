"use client";

import { useState } from "react";
import type { AssetStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast-provider";
import { getApiErrorMessage, parseApiPayload } from "@/lib/client-api";
import { assetStatusLabels } from "@/lib/labels";

const assetStatusOptions = ["UNUSED", "USED", "ARCHIVED"] as const satisfies readonly AssetStatus[];

export function AssetStatusSelect({
  assetId,
  status,
}: {
  assetId: string;
  status: AssetStatus;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [value, setValue] = useState<AssetStatus>(status);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleChange(nextStatus: AssetStatus) {
    setValue(nextStatus);
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/assets/${assetId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await parseApiPayload(response);

      if (!response.ok) {
        throw new Error(getApiErrorMessage(payload, "素材状态更新失败。"));
      }

      setMessage("状态已更新");
      showToast({ type: "success", title: "状态已更新" });
      router.refresh();
    } catch (error) {
      setValue(status);
      const message = error instanceof Error ? error.message : "素材状态更新失败。";
      setMessage(message);
      showToast({ type: "error", title: "状态更新失败", description: message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-w-0 space-y-1">
      <Select
        value={value}
        onValueChange={(nextStatus) => handleChange(nextStatus as AssetStatus)}
        disabled={isSaving}
      >
        <SelectTrigger className="h-8 w-full min-w-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {assetStatusOptions.map((item) => (
            <SelectItem key={item} value={item}>
              {assetStatusLabels[item]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {message ? (
        <p className="text-xs text-muted-foreground">{message}</p>
      ) : null}
    </div>
  );
}
