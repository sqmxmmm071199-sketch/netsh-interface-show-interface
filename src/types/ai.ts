export type AiJsonSchema = {
  name: string;
  description?: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type AiPrompt = {
  system: string;
  user: string;
  jsonSchema?: AiJsonSchema;
};

export type GenerateJsonResult<T> = {
  data: T;
  raw: string;
  parsed: boolean;
  error?: string;
};
