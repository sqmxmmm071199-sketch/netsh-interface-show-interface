export type AppLanguage = "zh-CN" | "en-US";

export const languageCookieName = "yunque_language";

export const languageOptions: Array<{
  value: AppLanguage;
  label: string;
  nativeLabel: string;
}> = [
  { value: "zh-CN", label: "Chinese", nativeLabel: "中文" },
  { value: "en-US", label: "English", nativeLabel: "English" },
];

export function normalizeLanguage(value: unknown): AppLanguage {
  return value === "en-US" ? "en-US" : "zh-CN";
}

export const i18nCopy = {
  "zh-CN": {
    appName: "云雀营销助手",
    appTagline: "品牌内容工作区",
    workspaceMode: "Workspace 模式",
    workspaceModeDescription: "数据会按当前品牌空间隔离。",
    currentWorkspace: "当前品牌空间",
    noWorkspace: "尚未创建品牌空间",
    openNavigation: "打开导航",
    closeNavigation: "关闭导航",
    selectWorkspace: "选择品牌空间",
    newWorkspace: "新建空间",
    newBrandWorkspace: "新建品牌空间",
    currentUser: "当前用户",
    notLoggedIn: "未登录",
    workspaceSettings: "工作区设置",
    signOut: "退出登录",
    switchSuccess: "品牌空间已切换",
    switchFailed: "切换失败",
    switchFailedDescription: "工作区切换失败。",
    nav: {
      dashboard: "工作台",
      brandProfile: "品牌档案",
      assets: "素材库",
      contentStudio: "内容生成",
      calendar: "内容日历",
      insights: "运营建议",
      replyAssistant: "回复助手",
      settings: "设置",
    },
    settings: {
      eyebrow: "设置",
      title: "工作区设置",
      description: "管理团队、通知、AI 能力和品牌工作区偏好。",
      basicsTitle: "基础信息",
      basicsDescription: "修改当前品牌空间名称、URL 标识和界面语言。",
      workspaceName: "工作区名称",
      workspaceSlug: "URL 标识",
      slugHelp: "只能使用小写字母、数字和连字符；保存后会用于识别该品牌空间。",
      interfaceLanguage: "界面语言",
      save: "保存设置",
      saving: "正在保存...",
      saveSuccess: "设置已保存",
      saveFailed: "保存失败",
      nameRequired: "请填写至少 2 个字符的工作区名称。",
      languageSaved: "语言偏好已保存。",
      teamTitle: "团队成员",
      teamDescription: "MVP 阶段先保留当前 Owner，后续可邀请运营、设计和品牌负责人协作。",
      aiTitle: "AI 配置",
      aiDescription: "当前 AI 能力由环境变量配置，可在部署环境切换 OpenAI 或 DeepSeek。",
      notificationTitle: "通知偏好",
      notificationDescription: "MVP 阶段先使用站内提示；后续可接入邮件、飞书或 Slack 提醒。",
      configured: "已配置",
      planned: "待扩展",
      localPreference: "本地偏好",
    },
  },
  "en-US": {
    appName: "Skylark Marketing Assistant",
    appTagline: "Brand Content Workspace",
    workspaceMode: "Workspace Mode",
    workspaceModeDescription: "Data is isolated by the current brand workspace.",
    currentWorkspace: "Current workspace",
    noWorkspace: "No brand workspace yet",
    openNavigation: "Open navigation",
    closeNavigation: "Close navigation",
    selectWorkspace: "Select workspace",
    newWorkspace: "New workspace",
    newBrandWorkspace: "New brand workspace",
    currentUser: "Current user",
    notLoggedIn: "Not signed in",
    workspaceSettings: "Workspace settings",
    signOut: "Sign out",
    switchSuccess: "Workspace switched",
    switchFailed: "Switch failed",
    switchFailedDescription: "Failed to switch workspace.",
    nav: {
      dashboard: "Dashboard",
      brandProfile: "Brand Profile",
      assets: "Assets",
      contentStudio: "Content Studio",
      calendar: "Calendar",
      insights: "Insights",
      replyAssistant: "Reply Assistant",
      settings: "Settings",
    },
    settings: {
      eyebrow: "Settings",
      title: "Workspace Settings",
      description: "Manage team, notifications, AI capabilities, and workspace preferences.",
      basicsTitle: "Basic Information",
      basicsDescription: "Edit the current workspace name, URL slug, and interface language.",
      workspaceName: "Workspace name",
      workspaceSlug: "URL slug",
      slugHelp: "Use lowercase letters, numbers, and hyphens only.",
      interfaceLanguage: "Interface language",
      save: "Save settings",
      saving: "Saving...",
      saveSuccess: "Settings saved",
      saveFailed: "Save failed",
      nameRequired: "Please enter a workspace name with at least 2 characters.",
      languageSaved: "Language preference saved.",
      teamTitle: "Team Members",
      teamDescription: "MVP keeps the current owner. Invitations for operators, designers, and brand leads can be added later.",
      aiTitle: "AI Configuration",
      aiDescription: "AI is configured through environment variables. Deployments can switch between OpenAI and DeepSeek.",
      notificationTitle: "Notification Preferences",
      notificationDescription: "MVP uses in-app feedback first. Email, Feishu, or Slack reminders can be added later.",
      configured: "Configured",
      planned: "Planned",
      localPreference: "Local preference",
    },
  },
} as const;

export function getI18nCopy(language: AppLanguage) {
  return i18nCopy[language];
}
