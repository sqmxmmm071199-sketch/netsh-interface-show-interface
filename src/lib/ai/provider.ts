export type AiProvider = "openai" | "deepseek" | "mock";

export type AiProviderPublicStatus = {
  provider: AiProvider;
  label: string;
  model: string;
  configured: boolean;
  apiKeyEnvName: string | null;
  baseUrl: string | null;
  configurationMode: "environment";
};

export const defaultOpenAIModel = "gpt-5.5";
export const defaultDeepSeekModel = "deepseek-chat";
export const defaultDeepSeekBaseURL = "https://api.deepseek.com";

export function getAiProvider(): AiProvider {
  const configuredProvider = process.env.AI_PROVIDER?.toLowerCase();

  if (configuredProvider === "deepseek") return "deepseek";
  if (configuredProvider === "openai") return "openai";
  if (configuredProvider === "mock") return "mock";
  if (process.env.DEEPSEEK_API_KEY && !process.env.OPENAI_API_KEY) {
    return "deepseek";
  }

  return "openai";
}

export function getAiProviderLabel(provider = getAiProvider()) {
  if (provider === "deepseek") return "DeepSeek";
  if (provider === "mock") return "Mock";
  return "OpenAI";
}

export function getAiProviderModel(provider = getAiProvider()) {
  if (provider === "deepseek") {
    return process.env.DEEPSEEK_MODEL || defaultDeepSeekModel;
  }

  if (provider === "mock") return "mock-local";

  return process.env.OPENAI_MODEL || defaultOpenAIModel;
}

export function getAiProviderApiKeyEnvName(provider = getAiProvider()) {
  if (provider === "deepseek") return "DEEPSEEK_API_KEY";
  if (provider === "openai") return "OPENAI_API_KEY";
  return null;
}

export function isAiProviderConfigured(provider = getAiProvider()) {
  if (provider === "mock") return true;
  if (provider === "deepseek") return Boolean(process.env.DEEPSEEK_API_KEY);
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getAiProviderBaseUrl(provider = getAiProvider()) {
  if (provider === "deepseek") {
    return process.env.DEEPSEEK_BASE_URL || defaultDeepSeekBaseURL;
  }

  return null;
}

export function getAiProviderPublicStatus(): AiProviderPublicStatus {
  const provider = getAiProvider();

  return {
    provider,
    label: getAiProviderLabel(provider),
    model: getAiProviderModel(provider),
    configured: isAiProviderConfigured(provider),
    apiKeyEnvName: getAiProviderApiKeyEnvName(provider),
    baseUrl: getAiProviderBaseUrl(provider),
    configurationMode: "environment",
  };
}
