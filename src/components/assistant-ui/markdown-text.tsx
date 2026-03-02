"use client";

import "@assistant-ui/react-markdown/styles/dot.css";

import {
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
  useIsMarkdownCodeBlock,
} from "@assistant-ui/react-markdown";
import { useMessage } from "@assistant-ui/react";
import { CheckIcon, CopyIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { memo, useState, useEffect, useRef, useMemo, type FC, type ReactNode, type ComponentProps, createContext, useContext } from "react";

import { cn } from "@/lib/utils";
import { get_error_context, subscribe_banner, get_banner } from "@/lib/chat/banner";

const KATEX_SELECT_STYLE = (
  <style>{`
    .katex, .katex *, .katex-element {
      user-select: text !important;
      -webkit-user-select: text !important;
    }
  `}</style>
);

interface StreamingContextValue {
  isStreamingThisMessage: boolean;
  codeBlockIndex: number;
  isFirstCodeBlock: boolean;
  mode: "ask" | "build" | "fix" | undefined;
}

const StreamingContext = createContext<StreamingContextValue>({
  isStreamingThisMessage: false,
  codeBlockIndex: 0,
  isFirstCodeBlock: true,
  mode: undefined,
});

export function useStreamingContext() {
  return useContext(StreamingContext);
}

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

// Collapsible code block component
const CollapsibleCodeBlock: FC<{ children: ReactNode; className?: string }> = memo(({ children, className }) => {
  const { isStreamingThisMessage, mode } = useStreamingContext();
  const codeText = extractCodeText(children);

  // Transform escape sequences
  const formattedCode = codeText
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\n\n+/g, "\n");

  // Each code block has its own independent collapse state, default collapsed
  const [isCollapsed, setIsCollapsed] = useState(true);
  const lineCount = formattedCode ? formattedCode.split('\n').length : 0;
  // Always show toggle if there are enough lines OR during streaming to maintain collapse state
  const shouldShowToggle = lineCount > 3 || isStreamingThisMessage;
  const shouldCollapse = shouldShowToggle && isCollapsed;

  const { isCopied, copyToClipboard } = useCopyToClipboard();

  // Determine label based on whether this contains scene.* method calls
  const isSceneCode = /scene\.\w+/.test(codeText);
  const label = isSceneCode ? "scene code" : "code";

  // Helper to strip markdown fences for comparison
  const stripFences = (text: string) => {
    return text.replace(/^```(?:\w+)?\n?/, '').replace(/```$/, '').trim();
  };

  // Track error/warning state from banner
  const [bannerState, setBannerState] = useState<{ type: string; message: string | null }>({ type: "", message: null });

  useEffect(() => {
    const unsubscribe = subscribe_banner(() => {
      const ctx = get_error_context();
      const banner = get_banner();
      // Check if invalid_json contains this code block's content (full response includes code block)
      const normalizedCode = stripFences(codeText);
      if (ctx && ctx.invalid_json && normalizedCode && ctx.invalid_json.includes(normalizedCode) && banner) {
        setBannerState({ type: banner.type, message: ctx.error_message || null });
      } else {
        setBannerState({ type: "", message: null });
      }
    });
    return unsubscribe;
  }, [codeText]);

  const isError = bannerState.type === "error";

  // Animation: only animate blocks in BUILD/FIX mode containing scene code
  // Use formattedCode since after extraction it contains the pure scene JS
  const isSceneBlock = formattedCode.includes('scene.');
  const isBuildOrFix = mode === "build" || mode === "fix";
  const shouldStream = isStreamingThisMessage && isSceneBlock && isBuildOrFix;

  // Autoscroll during streaming - scroll ALL code blocks (not just scene)
  const codeBlockRef = useRef<HTMLDivElement>(null);
  const wasStreamingRef = useRef(false);
  
  useEffect(() => {
    // Scroll to bottom during streaming
    if (isStreamingThisMessage && codeBlockRef.current) {
      requestAnimationFrame(() => {
        if (codeBlockRef.current) {
          codeBlockRef.current.scrollTop = codeBlockRef.current.scrollHeight;
        }
      });
    }
    
    // Scroll to top when this block's streaming completes
    if (wasStreamingRef.current && !isStreamingThisMessage && codeBlockRef.current) {
      requestAnimationFrame(() => {
        if (codeBlockRef.current) {
          codeBlockRef.current.scrollTop = 0;
        }
      });
    }
    
    wasStreamingRef.current = isStreamingThisMessage;
  }, [codeText, isStreamingThisMessage]);

  return (
    <div className={cn(
      "relative pointer-events-none overflow-hidden my-3",
      shouldStream && "streaming-code-block",
      isError && "border border-red-500/30 rounded-2xl shadow-[0_0_10px_rgba(239,68,68,0.5)]"
    )}>
      {/* Inline header - renders immediately with content */}
      <div className="flex items-center justify-between rounded-t-2xl border border-white/5 border-b-0 bg-white/3 px-3 py-1.5 text-xs pointer-events-auto">
        <span className="font-medium text-secondary lowercase">{label}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-white/50 hover:text-white transition-colors"
            aria-label="Copy code"
            onClick={() => {
              if (!formattedCode || isCopied) return;
              copyToClipboard(formattedCode);
            }}
          >
            {!isCopied ? <CopyIcon className="h-3.5 w-3.5" /> : <CheckIcon className="h-3.5 w-3.5" />}
          </button>
          {shouldShowToggle && (
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
      <div 
        ref={codeBlockRef}
        className={cn(
          "relative overflow-auto rounded-t-none rounded-b-2xl border border-white/5 border-t-0 bg-white/3 pointer-events-auto",
          shouldCollapse && "max-h-[5.5rem]",
          className,
        )}
      >
        <pre className="p-3 text-xs leading-relaxed select-text">
          {formattedCode}
        </pre>
        {shouldCollapse && !isStreamingThisMessage && (
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-zinc-900/50 to-transparent rounded-b-2xl pointer-events-none" />
        )}
      </div>
    </div>
  );
});

CollapsibleCodeBlock.displayName = "CollapsibleCodeBlock";

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
    <p className={cn("my-3 leading-normal first:mt-0 last:mb-0 select-text", className)} {...props} />
  ),
  ul: ({ className, ...props }) => (
    <ul className={cn("my-3 ml-4 list-disc marker:text-muted [&>li]:mt-1 select-text", className)} {...props} />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={cn("my-3 ml-4 list-decimal marker:text-muted [&>li]:mt-1 select-text", className)}
      {...props}
    />
  ),
  li: ({ className, ...props }) => (
    <li className={cn("select-text", className)} {...props} />
  ),
  a: ({ className, ...props }) => (
    <a className={cn("text-white underline underline-offset-2 hover:text-white/80 select-text", className)} {...props} />
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

function PreComponent({ className, children }: ComponentProps<"pre">) {
  return (
    <CollapsibleCodeBlock className={className}>
      {children}
    </CollapsibleCodeBlock>
  );
}
PreComponent.displayName = "PreComponent";

export const MarkdownText = memo(function MarkdownText() {
  // Message-specific status - only this message's streaming state
  const status = useMessage((m) => m.status);
  const isStreamingThisMessage = status?.type === "running";

  // Get mode from message metadata
  const mode = useMessage(
    (m) => m.metadata?.custom?.stemify_mode as "ask" | "build" | "fix" | undefined,
  );

  const contextValue = useMemo<StreamingContextValue>(
    () => ({
      isStreamingThisMessage,
      codeBlockIndex: 0,
      isFirstCodeBlock: true,
      mode,
    }),
    [isStreamingThisMessage, mode],
  );

  return (
    <StreamingContext.Provider value={contextValue}>
      <>
        {KATEX_SELECT_STYLE}
        <MarkdownTextPrimitive
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          preprocess={normalize_latex_delimiters}
          className="aui-md select-text"
          components={{
            ...components,
            pre: PreComponent,
          }}
        />
      </>
    </StreamingContext.Provider>
  );
});
