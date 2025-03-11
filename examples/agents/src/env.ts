export const OPENAI_API_KEY = assertNonNull(
  process.env.OPENAI_API_KEY,
  "OPENAI_API_KEY is required",
);

export const DEFAULT_CHAT_MODEL = "gpt-4o-mini";

function assertNonNull(value: string | undefined, message: string): string {
  if (!value) throw new Error(message);
  return value;
}
