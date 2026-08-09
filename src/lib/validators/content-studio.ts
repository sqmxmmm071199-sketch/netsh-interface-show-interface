import { ContentType, Platform } from "@prisma/client";
import { z } from "zod";

export const contentGenerationFormSchema = z.object({
  platform: z.nativeEnum(Platform),
  contentType: z.nativeEnum(ContentType),
  marketingGoal: z.string().trim().min(2, "请填写营销目标。").max(300),
  selectedAssets: z.array(z.string().min(1)).max(12).default([]),
  tone: z.string().trim().max(120).default(""),
  numberOfVariants: z.coerce.number().int().min(1).max(5).default(3),
  extraInstructions: z.string().trim().max(1000).default(""),
});

export const generatedContentVariantSchema = z.object({
  title: z.string().trim().min(1).max(160),
  hook: z.string().trim().min(1).max(500),
  body: z.string().trim().min(1).max(5000),
  hashtags: z.array(z.string().trim().min(1).max(80)).max(16).default([]),
  cta: z.string().trim().min(1).max(500),
  visualSuggestion: z.string().trim().min(1).max(1000),
  platformNotes: z.string().trim().min(1).max(1000),
});

export const complianceCheckResultSchema = z.object({
  riskLevel: z.enum(["low", "medium", "high"]),
  issues: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(500),
        reason: z.string().trim().min(1).max(1000),
        suggestion: z.string().trim().min(1).max(1000),
      }),
    )
    .max(20)
    .default([]),
  overallSuggestion: z.string().trim().min(1).max(1500),
});

export const generatedContentVariantWithComplianceSchema =
  generatedContentVariantSchema.extend({
    complianceCheck: complianceCheckResultSchema.optional(),
  });

export const saveGeneratedContentSchema = contentGenerationFormSchema.extend({
  variant: generatedContentVariantWithComplianceSchema,
});

export const updateGeneratedContentSchema = z.object({
  title: z.string().trim().min(1, "请填写标题。").max(160),
  body: z.string().trim().min(1, "请填写正文。").max(5000),
});

export const addGeneratedContentToCalendarSchema = z.object({
  scheduledAt: z.string().trim().min(1, "请选择排期时间。"),
  notes: z.string().trim().max(1000).default(""),
  ownerName: z.string().trim().max(80).default(""),
});

export type ContentGenerationFormValues = z.infer<
  typeof contentGenerationFormSchema
>;
export type GeneratedContentVariantValues = z.infer<
  typeof generatedContentVariantWithComplianceSchema
>;
