import type { AiPrompt } from "@/types/ai";

export type RiskLevel = "low" | "medium" | "high";

export type ComplianceIssue = {
  text: string;
  reason: string;
  suggestion: string;
};

export type ComplianceCheckResult = {
  riskLevel: RiskLevel;
  issues: ComplianceIssue[];
  overallSuggestion: string;
};

export type ComplianceCheckPromptInput = {
  content: {
    title: string;
    hook: string;
    body: string;
    hashtags: string[];
    cta: string;
    visualSuggestion?: string;
    platformNotes?: string;
  };
  platform: string;
  platformLabel: string;
  contentType: string;
  contentTypeLabel: string;
  brandProfile?: unknown;
  forbiddenWords: string[];
  forbiddenClaims: string[];
};

const complianceIssueSchema = {
  type: "object",
  additionalProperties: false,
  required: ["text", "reason", "suggestion"],
  properties: {
    text: { type: "string" },
    reason: { type: "string" },
    suggestion: { type: "string" },
  },
};

const complianceCheckSchema = {
  type: "object",
  additionalProperties: false,
  required: ["riskLevel", "issues", "overallSuggestion"],
  properties: {
    riskLevel: {
      type: "string",
      enum: ["low", "medium", "high"],
    },
    issues: {
      type: "array",
      items: complianceIssueSchema,
    },
    overallSuggestion: { type: "string" },
  },
};

export function buildComplianceCheckPrompt(
  input: ComplianceCheckPromptInput,
): AiPrompt {
  return {
    system:
      "你是品牌营销内容合规检查助手。你会识别夸大承诺、敏感领域表达、禁用词和平台格式风险。必须输出 JSON，不要输出 Markdown、解释文字或代码块。你不是法律顾问，只提供运营发布前的表达风险提示。",
    user: JSON.stringify(
      {
        task: "检查一条社媒营销内容是否存在合规或平台表达风险。",
        riskDimensions: [
          "是否包含绝对化承诺，例如 100% effective、guaranteed、best、cure、risk-free。",
          "是否包含夸大效果或无法证实的营销表达。",
          "是否涉及医疗、金融、健康、减肥、保健品等敏感表达。",
          "是否包含 BrandProfile 中的 forbiddenWords 或 forbiddenClaims。",
          "是否有平台风格或格式风险，例如不符合目标平台内容语气、标题过度承诺、CTA 过硬。",
        ],
        riskLevelGuidance: {
          low: "未发现明显风险，或只有轻微格式建议。",
          medium: "存在可修改的表达风险，需要发布前调整。",
          high: "存在明显禁用词、敏感领域、绝对化承诺或高风险夸大表达，需要谨慎使用。",
        },
        requiredOutputShape: {
          riskLevel: "low | medium | high",
          issues: [
            {
              text: "存在风险的原文",
              reason: "风险原因",
              suggestion: "替代表达",
            },
          ],
          overallSuggestion: "整体建议",
        },
        input,
        outputLanguage: "zh-CN",
      },
      null,
      2,
    ),
    jsonSchema: {
      name: "compliance_check",
      description: "营销内容合规检查结果。",
      schema: complianceCheckSchema,
      strict: true,
    },
  };
}
