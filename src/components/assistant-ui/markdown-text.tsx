"use client";

import "@assistant-ui/react-markdown/styles/dot.css";

import {
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
  useIsMarkdownCodeBlock,
  type CodeHeaderProps,
} from "@assistant-ui/react-markdown";
import { CheckIcon, CopyIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { memo, useState, useCallback, useEffect, type FC, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const KATEX_SELECT_STYLE = (
  <style>{`
    .katex, .katex *, .katex-element {
      user-select: text !important;
      -webkit-user-select: text !important;
    }
  `}</style>
);

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

// Global registry for collapse states
const collapseRegistry = new Map<string, boolean>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function notify() {
  listeners.forEach(listener => listener());
}

function getCollapseState(key: string): boolean {
  return collapseRegistry.get(key) ?? true;
}

function setCollapseState(key: string, value: boolean) {
  collapseRegistry.set(key, value);
  notify();
}

function useCollapseState(key: string): [boolean, (value: boolean) => void] {
  const [state, setState] = useState(() => getCollapseState(key));
  
  useEffect(() => {
    const unsubscribe = subscribe(() => {
      setState(getCollapseState(key));
    });
    return unsubscribe;
  }, [key]);

  const setCollapsed = useCallback((value: boolean) => {
    setCollapseState(key, value);
  }, [key]);

  return [state, setCollapsed];
}

// Helper to extract code text from children
function extractCodeText(children: ReactNode): string {
  if (!children) return '';
  
  if (Array.isArray(children)) {
    return children.map(extractCodeText).join('');
  }
  
  if (typeof children === 'string') {
    return children;
  }
  
  if (typeof children === 'number') {
    return String(children);
  }
  
  if (typeof children === 'object' && children !== null && 'props' in children) {
    const element = children as { props?: { children?: ReactNode } };
    return extractCodeText(element.props?.children);
  }
  
  return '';
}

// Generate a stable key from code content
function getCodeKey(code: string): string {
  return code.slice(0, 100);
}

// Assistant-UI compatible CodeHeader component with expand/collapse
const CodeHeader: FC<CodeHeaderProps> = ({ language, code }) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  const key = code ? getCodeKey(code) : '';
  const [isCollapsed, setIsCollapsed] = useCollapseState(key);
  const lineCount = code ? code.split('\n').length : 0;
  const showCollapse = lineCount > 3;

  return (
    <div className="flex items-center justify-between rounded-t-2xl border border-white/5 border-b-0 bg-white/3 px-3 py-1.5 text-xs">
      <span className="font-medium text-secondary lowercase">{language || "code"}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="text-white/50 hover:text-white transition-colors"
          aria-label="Copy code"
          onClick={() => {
            if (!code || isCopied) return;
            copyToClipboard(code);
          }}
        >
          {!isCopied ? <CopyIcon className="h-3.5 w-3.5" /> : <CheckIcon className="h-3.5 w-3.5" />}
        </button>
        {showCollapse && (
          <button
            type="button"
            className="text-white/50 hover:text-white transition-colors"
            aria-label={isCollapsed ? "Expand code" : "Collapse code"}
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronDownIcon className="h-3.5 w-3.5" />
            ) : (
              <ChevronUpIcon className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};

function normalize_latex_delimiters(input: string): string {
  return (
    input
      // \( ... \) -> $...$
      .replace(/\\{1,2}\(([\s\S]*?)\\{1,2}\)/g, (_, content) => `$${String(content).trim()}$`)
      // \[ ... \] -> $$...$$
      .replace(/\\{1,2}\[([\s\S]*?)\\{1,2}\]/g, (_, content) => `$$${String(content).trim()}$$`)
  );
}

// Collapsible code block component
const CollapsibleCodeBlock: FC<{ children: ReactNode; className?: string }> = ({ children, className }) => {
  const codeText = extractCodeText(children);
  const key = getCodeKey(codeText);
  const [isCollapsed] = useCollapseState(key);
  const lineCount = codeText.split('\n').length;
  const shouldShowToggle = lineCount > 3;
  const shouldCollapse = shouldShowToggle && isCollapsed;

  return (
    <div className="relative pointer-events-none">
      <div 
        className={cn(
          "overflow-auto rounded-t-none rounded-b-2xl border border-white/5 border-t-0 bg-white/3 pointer-events-auto",
          shouldCollapse && "max-h-[5.5rem]",
          className,
        )}
      >
        <pre className="p-3 text-xs leading-relaxed select-text">
          {children}
        </pre>
      </div>
      {shouldCollapse && (
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-zinc-900/50 to-transparent rounded-b-2xl pointer-events-none" />
      )}
    </div>
  );
};

const components = memoizeMarkdownComponents({
  p: ({ className, ...props }) => (
    <p className={cn("my-2.5 leading-normal first:mt-0 last:mb-0 select-text", className)} {...props} />
  ),
  ul: ({ className, ...props }) => (
    <ul className={cn("my-2 ml-4 list-disc marker:text-muted [&>li]:mt-1 select-text", className)} {...props} />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={cn("my-2 ml-4 list-decimal marker:text-muted [&>li]:mt-1 select-text", className)}
      {...props}
    />
  ),
  li: ({ className, ...props }) => (
    <li className={cn("select-text", className)} {...props} />
  ),
  a: ({ className, ...props }) => (
    <a className={cn("text-white underline underline-offset-2 hover:text-white/80 select-text", className)} {...props} />
  ),
  pre: ({ className, children }) => (
    <CollapsibleCodeBlock className={className}>
      {children}
    </CollapsibleCodeBlock>
  ),
  code: function Code({ className, ...props }) {
    const isCodeBlock = useIsMarkdownCodeBlock();
    return (
      <code
        className={cn(
          !isCodeBlock &&
            "rounded-md border border-white/5 bg-white/5 px-1.5 py-0.5 font-mono text-[0.85em] select-text",
          className,
        )}
        {...props}
      />
    );
  },
});

export const MarkdownText = memo(function MarkdownText() {
  return (
    <>
      {KATEX_SELECT_STYLE}
      <MarkdownTextPrimitive
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        preprocess={normalize_latex_delimiters}
        className="aui-md select-text"
        components={{
          ...components,
          CodeHeader,
        }}
      />
    </>
  );
});
