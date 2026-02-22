const DANGEROUS_GLOBALS: readonly string[] = [
  "fetch",
  "XMLHttpRequest",
  "localStorage",
  "sessionStorage",
  "importScripts",
  "eval",
] as const;

const savedGlobals = new Map<string, unknown>();

function saveAndClearGlobals(): void {
  for (const name of DANGEROUS_GLOBALS) {
    try {
      // @ts-expect-error - dynamic global access
      const value = globalThis[name];
      savedGlobals.set(name, value);
      
      // Use defineProperty to properly override getters like localStorage
      Object.defineProperty(globalThis, name, {
        value: undefined,
        writable: true,
        configurable: true,
      });
    } catch {
      // ignore - some globals may not exist
    }
  }
}

function restoreGlobals(): void {
  for (const [name, value] of savedGlobals) {
    // @ts-expect-error - restore to global scope
    globalThis[name] = value;
  }
  savedGlobals.clear();
}

export function execute_in_sandbox<T>(fn: () => T): T {
  saveAndClearGlobals();

  try {
    return fn();
  } finally {
    restoreGlobals();
  }
}
