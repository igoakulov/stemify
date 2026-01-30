"use client";

import "@assistant-ui/react-markdown/styles/dot.css";

import {
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
  useIsMarkdownCodeBlock,
} from "@assistant-ui/react-markdown";
import { CheckIcon, CopyIcon } from "lucide-react";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { memo, useState, type FC } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const MarkdownText = memo(function MarkdownText() {
  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      preprocess={normalize_latex_delimiters}
      className="aui-md"
      components={components}
    />
  );
});

const CodeHeader: FC<{ language?: string; code?: string }> = ({ language, code }) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();

  return (
    <div className="mt-2.5 flex items-center justify-between rounded-t-lg border border-white/5 border-b-0 bg-white/3 px-3 py-1.5 text-xs">
      <span className="font-medium text-secondary lowercase">{language ?? ""}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        aria-label="Copy code"
        onClick={() => {
          if (!code || isCopied) return;
          copyToClipboard(code);
        }}
      >
        {!isCopied ? <CopyIcon className="h-3.5 w-3.5" /> : <CheckIcon className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
};

function useCopyToClipboard({ copiedDuration = 2500 }: { copiedDuration?: number } = {}) {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = (value: string) => {
    if (!value) return;
    void navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), copiedDuration);
    });
  };

  return { isCopied, copyToClipboard };
}

function normalize_latex_delimiters(input: string): string {
  return (
    input
      // \( ... \) -> $...$
      .replace(/\\{1,2}\(([\s\S]*?)\\{1,2}\)/g, (_, content) => `$${String(content).trim()}$`)
      // \[ ... \] -> $$...$$
      .replace(/\\{1,2}\[([\s\S]*?)\\{1,2}\]/g, (_, content) => `$$${String(content).trim()}$$`)
  );
}

const components = memoizeMarkdownComponents({
  p: ({ className, ...props }) => (
    <p className={cn("my-2.5 leading-normal first:mt-0 last:mb-0", className)} {...props} />
  ),
  ul: ({ className, ...props }) => (
    <ul className={cn("my-2 ml-4 list-disc marker:text-muted [&>li]:mt-1", className)} {...props} />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={cn("my-2 ml-4 list-decimal marker:text-muted [&>li]:mt-1", className)}
      {...props}
    />
  ),
  a: ({ className, ...props }) => (
    <a className={cn("text-white underline underline-offset-2 hover:text-white/80", className)} {...props} />
  ),
  pre: ({ className, ...props }) => (
    <pre
      className={cn(
        "overflow-x-auto rounded-t-none rounded-b-lg border border-white/5 border-t-0 bg-white/3 p-3 text-xs leading-relaxed",
        className,
      )}
      {...props}
    />
  ),
  code: function Code({ className, ...props }) {
    const isCodeBlock = useIsMarkdownCodeBlock();
    return (
      <code
        className={cn(
          !isCodeBlock &&
            "rounded-md border border-white/5 bg-white/5 px-1.5 py-0.5 font-mono text-[0.85em]",
          className,
        )}
        {...props}
      />
    );
  },
  CodeHeader,
});
