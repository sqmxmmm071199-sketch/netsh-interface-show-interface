import {
  AssetStatus,
  AssetType,
  ContentStatus,
  ContentType,
  MemoryType,
  Platform,
} from "@prisma/client";

export const platformLabels: Record<Platform, string> = {
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  FACEBOOK: "Facebook",
  PINTEREST: "Pinterest",
  LINKEDIN: "LinkedIn",
  XIAOHONGSHU: "小红书",
};

export const assetTypeLabels: Record<AssetType, string> = {
  IMAGE: "图片",
  VIDEO: "视频",
  DOCUMENT: "文档",
  LINK: "链接",
  TEXT: "文本",
};

export const assetStatusLabels: Record<AssetStatus, string> = {
  UNUSED: "未使用",
  USED: "已使用",
  ARCHIVED: "已归档",
};

export const contentStatusLabels: Record<ContentStatus, string> = {
  DRAFT: "草稿",
  SCHEDULED: "已排期",
  PUBLISHED: "已发布",
  ARCHIVED: "已归档",
};

export const contentTypeLabels: Record<ContentType, string> = {
  POST: "单图帖",
  CAROUSEL: "轮播帖",
  SHORT_VIDEO_SCRIPT: "短视频脚本",
  STORY: "Story",
  AD_COPY: "广告文案",
};

export const memoryTypeLabels: Record<MemoryType, string> = {
  PREFERENCE: "偏好",
  BRAND_RULE: "品牌规则",
  PLATFORM_INSIGHT: "平台洞察",
  CONTENT_RULE: "内容规则",
  COMPLIANCE_RULE: "合规规则",
};

export function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function formatDate(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}
