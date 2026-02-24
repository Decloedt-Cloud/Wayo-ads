import { Langfuse } from "langfuse";

function getLangfuseConfig() {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const baseUrl = process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com';

  if (!publicKey || !secretKey) {
    console.warn('[Langfuse] Missing environment variables - Langfuse will be disabled');
    return null;
  }

  return {
    publicKey,
    secretKey,
    baseUrl,
  };
}

const langfuseConfig = getLangfuseConfig();

export const langfuse = langfuseConfig
  ? new Langfuse({
      publicKey: langfuseConfig.publicKey,
      secretKey: langfuseConfig.secretKey,
      baseUrl: langfuseConfig.baseUrl,
    })
  : null;

export function isLangfuseEnabled(): boolean {
  return langfuse !== null;
}

export function getLangfuse() {
  if (!langfuse) {
    throw new Error('Langfuse is not configured. Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY');
  }
  return langfuse;
}

export async function safeFlush(): Promise<void> {
  if (langfuse) {
    await langfuse.flushAsync();
  }
}
