import { z } from "zod";
import { replyScenarioLabels } from "@/lib/prompts/reply-assistant";

const replyScenarios = Object.keys(replyScenarioLabels) as [
  keyof typeof replyScenarioLabels,
  ...(keyof typeof replyScenarioLabels)[],
];

export const replyAssistantFormSchema = z.object({
  customerMessage: z
    .string()
    .trim()
    .min(2, "请填写客户评论或私信。")
    .max(2000, "客户消息最多 2000 字。"),
  scenario: z.enum(replyScenarios),
});

export type ReplyAssistantFormValues = z.infer<typeof replyAssistantFormSchema>;
