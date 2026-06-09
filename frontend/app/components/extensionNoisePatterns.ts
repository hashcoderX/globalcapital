export const EXTENSION_NOISE_PATTERNS: RegExp[] = [
  /enable copy/i,
  /\be\.c\.p\b/i,
  /ecp_regular/i,
  /enable_product/i,
  /aggressive_mode/i,
  /a listener indicated an asynchronous response by returning true/i,
  /message channel closed before a response was received/i,
  /could not establish connection\. receiving end does not exist/i,
  /runtime\.lasterror/i,
  /extension context invalidated/i,
  /chrome-extension:\/\//i,
  /fdprocessedid/i,
  /hydration mismatch/i,
];

export function isExtensionNoise(value: unknown): boolean {
  const message =
    value instanceof Error
      ? `${value.message} ${value.stack ?? ''}`
      : typeof value === 'string'
        ? value
        : value && typeof value === 'object' && typeof (value as { message?: unknown }).message === 'string'
          ? String((value as { message: string }).message)
          : String(value ?? '');

  const normalized = message.toLowerCase();
  return EXTENSION_NOISE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function argsLookLikeExtensionNoise(args: unknown[]): boolean {
  const text = args
    .map((arg) => {
      if (arg instanceof Error) return `${arg.message} ${arg.stack ?? ''}`;
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg ?? '');
    })
    .join(' ');

  return EXTENSION_NOISE_PATTERNS.some((pattern) => pattern.test(text));
}
