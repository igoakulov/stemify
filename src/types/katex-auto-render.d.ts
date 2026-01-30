declare module "katex/contrib/auto-render" {
  export type RenderMathInElementOptions = {
    delimiters?: Array<{
      left: string;
      right: string;
      display: boolean;
    }>;
    ignoredTags?: string[];
    ignoredClasses?: string[];
    errorCallback?: (msg: string, err: unknown) => void;
    macros?: Record<string, string>;
    throwOnError?: boolean;
  };

  export default function renderMathInElement(
    element: HTMLElement,
    options?: RenderMathInElementOptions,
  ): void;
}
