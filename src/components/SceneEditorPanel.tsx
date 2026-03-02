"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileStack, Copy, Check, Code2, AlertCircle, AlertTriangle, ChevronLeft, ChevronRight, Crosshair, X } from "lucide-react";
import type { OnMount } from "@monaco-editor/react";
import type { Monaco } from "@monaco-editor/react";

import { SceneCodeEditor } from "@/components/SceneCodeEditor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useSceneEditorStore,
  set_validation_error,
  set_validation_errors,
  set_warnings,
  dismiss_warning,
  next_error,
  prev_error,
} from "@/lib/scene/editor_store";
import { append_docs, strip_docs, get_docs_marker, format_scene_code } from "@/lib/scene/inline_docs";
import { validate_scene_code, type ValidationError as ValidationErrorType } from "@/lib/scene/validation";
import { SCENE_ROOT_ID } from "@/lib/scene/constants";

type ObjectRange = {
  id: string;
  method: string;
  startLine: number;
  endLine: number;
};

type SceneEditorPanelProps = {
  className?: string;
  sceneId?: string;
  currentVersionId?: string | null;
  versionCount?: number;
  fullSceneCode: string;
  selectedObjectId: string | null;
  breadcrumbs: string[];
  onBreadcrumbClick: (id: string, index: number) => void;
  update_scene_code_editor: (code: string) => void;
  update_scene_code_storage?: (code: string) => void;
  onApplySceneCode?: (code: string) => void;
  onUserEditApplied?: () => void;
  isOpen?: boolean;
  onToggle?: () => void;
  onOpen?: () => void;
  validationError?: string | null;
};

const DEBOUNCE_MS = 500;

export function SceneEditorPanel({
  className,
  sceneId,
  currentVersionId,
  versionCount = 0,
  fullSceneCode,
  selectedObjectId,
  breadcrumbs,
  onBreadcrumbClick,
  update_scene_code_editor,
  update_scene_code_storage,
  onApplySceneCode,
  onUserEditApplied,
  isOpen = true,
  onToggle,
  onOpen,
  validationError: validationErrorProp,
}: SceneEditorPanelProps) {
  const storeValidationError = useSceneEditorStore((s) => s.validationError);
  const storeValidationErrors = useSceneEditorStore((s) => s.validationErrors);
  const storeCurrentErrorIndex = useSceneEditorStore((s) => s.currentErrorIndex);
  const storeWarnings = useSceneEditorStore((s) => s.warnings);
  const storeDismissedWarnings = useSceneEditorStore((s) => s.dismissedWarnings);
  const validationError = validationErrorProp ?? storeValidationError;
  const validationErrors: ValidationErrorType[] = storeValidationErrors;
  const currentErrorIndex = storeCurrentErrorIndex;
  const warnings = storeWarnings;
  const dismissedWarnings = storeDismissedWarnings;
  const activeWarnings = warnings.filter(w => !dismissedWarnings.has(w));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const breadcrumbsRef = useRef<HTMLDivElement>(null);
  const errorPanelRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const prevVersionIdRef = useRef<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [errorPanelScrolled, setErrorPanelScrolled] = useState({ left: false, right: false });

  const selectedObjectIdRef = useRef(selectedObjectId);

  const handleEditorMount = useCallback((editor: Parameters<OnMount>[0], monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  }, []);

  // Listen for focus-editor events
  useEffect(() => {
    const handleFocusEditor = () => {
      editorRef.current?.focus();
    };
    window.addEventListener("stemify:focus-editor", handleFocusEditor);
    return () => window.removeEventListener("stemify:focus-editor", handleFocusEditor);
  }, []);

  // Parse object line ranges for folding (stops at docs marker)
  const parseObjectLineRanges = useCallback((code: string): ObjectRange[] => {
    const ranges: ObjectRange[] = [];
    const docsMarker = get_docs_marker();
    const markerIndex = code.indexOf(docsMarker);
    const codeToParse = markerIndex === -1 ? code : code.slice(0, markerIndex);

    const lines = codeToParse.split("\n");
    const methodRegex = /scene\.(\w+)\s*\(\s*\{/;
    
    let currentStart = -1;
    let currentMethod: string | null = null;
    let currentId: string | null = null;
    let braceDepth = 0;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      
      if (currentStart === -1) {
        const match = line.match(methodRegex);
        if (match) {
          currentStart = lineIndex + 1; // 1-indexed
          currentMethod = match[1];
          braceDepth = 1;
          // Try to extract id from this or following lines
          const idMatch = line.match(/id\s*:\s*["']([^"']+)["']/);
          if (idMatch) {
            currentId = idMatch[1];
          }
        }
      } else {
        // Count braces
        for (const char of line) {
          if (char === "{") braceDepth++;
          else if (char === "}") {
            braceDepth--;
            if (braceDepth === 0) {
              // Found end of object
              if (currentId && currentMethod) {
                ranges.push({
                  id: currentId,
                  method: currentMethod,
                  startLine: currentStart,
                  endLine: lineIndex + 1,
                });
              }
              currentStart = -1;
              currentMethod = null;
              currentId = null;
              break;
            }
          }
        }
        // Look for id if not found yet
        if (!currentId && currentStart !== -1) {
          const idMatch = line.match(/id\s*:\s*["']([^"']+)["']/);
          if (idMatch) {
            currentId = idMatch[1];
          }
        }
      }
    }

    return ranges;
  }, []);

  // Unfold all regions
  const unfold = useCallback(() => {
    if (!editorRef.current) return;
    editorRef.current.trigger('unfold', 'editor.unfoldAll', {});
  }, []);

  // Fold all objects except specified ones
  const foldExcept = useCallback((exceptIds: string[]) => {
    if (!editorRef.current) return;
    const model = editorRef.current.getModel();
    if (!model) return;

    const ranges = parseObjectLineRanges(model.getValue());
    
    // Fold all objects EXCEPT the ones in exceptIds
    const linesToFold = ranges
      .filter(({ id }) => !exceptIds.includes(id))
      .map(({ startLine }) => startLine - 1); // Convert to 0-based

    if (linesToFold.length > 0) {
      editorRef.current.trigger('fold', 'editor.fold', { selectionLines: linesToFold });
    }
  }, [parseObjectLineRanges]);

  // Apply folding when selection changes
  useEffect(() => {
    if (!editorRef.current) return;
    const editor = editorRef.current;

    if (selectedObjectId && selectedObjectId !== SCENE_ROOT_ID) {
      // First unfold all to reset any previous state
      unfold();
      
      // Then fold all except selected - this keeps nested folds intact
      // For tooltip selection, fold everything except the tooltip's code
      setTimeout(() => {
        const isTooltipSelection = selectedObjectId.startsWith("tooltip:");
        const foldId = isTooltipSelection 
          ? selectedObjectId.slice(8) 
          : selectedObjectId;
        foldExcept([foldId]);
      }, 50);
      
      // Scroll to start of selected object after fold/unfold completes
      // Use setTimeout to ensure Monaco has processed the fold/unfold operations
      setTimeout(() => {
        const model = editor.getModel();
        if (!model) return;
        
        const ranges = parseObjectLineRanges(model.getValue());
        const isTooltipSelection = selectedObjectId.startsWith("tooltip:");
        const effectiveId = isTooltipSelection 
          ? selectedObjectId.slice(8) 
          : selectedObjectId;
        
        const selectedRange = isTooltipSelection
          ? ranges.find(r => r.id === effectiveId && r.method === "tooltip")
          : ranges.find(r => r.id === effectiveId);
        
        if (selectedRange) {
          const targetTop = editor.getTopForLineNumber(selectedRange.startLine);
          editor.setScrollPosition({ scrollTop: targetTop });
        }
      }, 100);
    } else {
      unfold();
      // Scroll to top when showing full scene
      setTimeout(() => {
        const targetTop = editor.getTopForLineNumber(1);
        editor.setScrollPosition({ scrollTop: targetTop });
      }, 100);
    }
  }, [selectedObjectId, unfold, foldExcept, parseObjectLineRanges]);
  
  const scrollBreadcrumbsToView = useCallback((activeId: string | null, breadcrumbs: string[], prevId: string | null) => {
    if (!breadcrumbsRef.current) return;
    
    const container = breadcrumbsRef.current;
    
    if (!activeId) {
      container.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }
    
    const effectiveId = activeId === SCENE_ROOT_ID ? "scene" : activeId;
    const activeButton = container.querySelector(`button[data-id="${effectiveId}"]`);
    if (!activeButton) return;

    const buttonRect = activeButton.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Determine direction from previous selection
    const currentIndex = breadcrumbs.indexOf(effectiveId);
    const prevIndex = prevId ? breadcrumbs.indexOf(prevId === SCENE_ROOT_ID ? "scene" : prevId) : -1;
    
    // Going towards root: index decreases, prefer left edge (inline: 'start')
    // Going towards leaf: index increases, prefer right edge (inline: 'end')
    let shouldScroll = false;
    let inlineAlign: 'start' | 'center' | 'end' | 'nearest' = 'nearest';
    
    if (prevIndex === -1 || currentIndex === -1) {
      shouldScroll = buttonRect.left < containerRect.left || buttonRect.right > containerRect.right;
    } else if (currentIndex < prevIndex) {
      // Going towards root - prefer left edge
      shouldScroll = buttonRect.left < containerRect.left;
      inlineAlign = 'start';
    } else if (currentIndex > prevIndex) {
      // Going towards leaf - prefer right edge
      shouldScroll = buttonRect.right > containerRect.right;
      inlineAlign = 'end';
    } else {
      shouldScroll = buttonRect.left < containerRect.left || buttonRect.right > containerRect.right;
    }
    
    if (shouldScroll) {
      activeButton.scrollIntoView({ 
        block: 'nearest', 
        inline: inlineAlign,
        behavior: 'smooth'
      });
    }
  }, []);

  // Scroll breadcrumbs into view when selection changes
  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      const prevId = selectedObjectIdRef.current;
      selectedObjectIdRef.current = selectedObjectId;
      scrollBreadcrumbsToView(selectedObjectId, breadcrumbs, prevId);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [selectedObjectId, breadcrumbs, scrollBreadcrumbsToView]);

  // Initialize localCode - add docs only if no version yet (zero state)
  // When version exists, useEffect will handle trimming and adding docs on version change
  const [localCode, setLocalCode] = useState(() => {
    if (!currentVersionId) {
      // No version yet - show docs (zero state)
      return append_docs("");
    }
    // Version exists - return as-is, useEffect will add docs on version change
    return fullSceneCode;
  });

// Sync when scene or version changes
  // Triggers when switching scenes or versions - updates editor with correct code
  // NOTE: We intentionally exclude fullSceneCode from dependencies to avoid
  // resetting folding state when user edits code (which updates scene code in storage)
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const prevVersionId = prevVersionIdRef.current;
    const currVersionId = currentVersionId ?? null;
    
    // Skip only if NEITHER previous nor current has a version
    // Run for: null → non-null (first load) or non-null → non-null (version/sceneload)
    if (!prevVersionId && !currVersionId) {
      prevVersionIdRef.current = currVersionId;
      return;
    }
    
    // Clear validation errors when scene/version changes
    set_validation_error(null);
    set_validation_errors([]);
    
    // Strip existing docs, format, then append fresh docs
    const stripped = strip_docs(fullSceneCode);
    const formatted = format_scene_code(stripped);
    const codeWithDocs = append_docs(formatted);
    
    window.requestAnimationFrame(() => {
      // Preserve cursor position before setting new code
      const cursorPosition = editorRef.current?.getPosition();
      
      // Use setValue to replace code without creating undo history
      if (editorRef.current) {
        editorRef.current.setValue(codeWithDocs);
      }
      setLocalCode(codeWithDocs);
      
      // Restore cursor position after setting code
      if (cursorPosition && editorRef.current) {
        editorRef.current.setPosition(cursorPosition);
      }
    });
    
    prevVersionIdRef.current = currVersionId;
  }, [sceneId, currentVersionId]);

  const validateAndApply = useCallback(
    (code: string, isUserEdit: boolean = false) => {
      // Strip docs before validation and saving
      const rawCode = strip_docs(code);
      
      if (!rawCode.trim()) {
        set_validation_error(null);
        set_validation_errors([]);
        set_warnings([]);
        
        // In empty code - clear everything
        update_scene_code_editor("");
        update_scene_code_storage?.("");
        onApplySceneCode?.("");
        return;
      }

      const result = validate_scene_code(rawCode);
      if (!result.ok) {
        set_validation_error(result.errors.length > 0 ? result.errors[0].message : "Invalid scene code");
        set_validation_errors(result.errors);
        return;
      }

      set_validation_error(null);
      set_validation_errors([]);
      
      // Store warnings
      set_warnings(result.warnings);
      
      // Save RAW code (no docs) to storage and viewport
      update_scene_code_storage?.(rawCode);
      onApplySceneCode?.(rawCode);
      
      // Notify parent that user edit was applied (for version history)
      if (isUserEdit) {
        onUserEditApplied?.();
      }
      
      // Don't touch localCode - user sees their exact input
      // Docs will be added when version changes (LLM, reload, manual switch)
    },
    [update_scene_code_editor, update_scene_code_storage, onApplySceneCode, onUserEditApplied]
  );

  const handleCodeChange = useCallback(
    (value: string) => {
      setLocalCode(value);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        validateAndApply(value, true);
      }, DEBOUNCE_MS);
    },
    [validateAndApply]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const updateErrorPanelScrollState = useCallback(() => {
    if (!errorPanelRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = errorPanelRef.current;
    setErrorPanelScrolled({
      left: scrollLeft > 0,
      right: scrollLeft < scrollWidth - clientWidth - 1,
    });
  }, []);

  useEffect(() => {
    const panel = errorPanelRef.current;
    if (!panel) return;
    
    panel.addEventListener("scroll", updateErrorPanelScrollState);
    updateErrorPanelScrollState();
    
    return () => panel.removeEventListener("scroll", updateErrorPanelScrollState);
  }, [updateErrorPanelScrollState]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(localCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [localCode]);

  const handleGoToError = useCallback(() => {
    const error = validationErrors[currentErrorIndex];
    if (error?.line && editorRef.current) {
      editorRef.current.revealLineInCenter(error.line);
      editorRef.current.setPosition({ lineNumber: error.line, column: 1 });
      editorRef.current.focus();
    } else {
      editorRef.current?.focus();
    }
  }, [validationErrors, currentErrorIndex]);

  const showCopyButton = isHovered || isFocused;

  return (
    <div 
      className={cn("flex h-full flex-col overflow-hidden", className)}
      data-scene-editor-focused={isFocused}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-4 px-4 py-1 border-t border-b border-white/5 shrink-0">
        <div className="flex items-center -mx-1">
          <Button
            variant="toolbar"
            size="icon"
            className="h-7 w-7 relative"
            onClick={() => {
              if (sceneId) {
                window.dispatchEvent(new CustomEvent("stemify:open-version-history", { detail: { sceneId } }));
              }
            }}
            disabled={!sceneId}
            title="Versions"
          >
            <FileStack className="h-4 w-4" />
            {versionCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 flex items-center justify-center text-[10px] font-medium text-black bg-[var(--accent-primary)] rounded-full">
                {versionCount > 99 ? "99" : versionCount}
              </span>
            )}
          </Button>
        </div>

        <div className="relative flex-1 min-w-0">
          <div 
            ref={breadcrumbsRef}
            className="flex items-center gap-1 text-xs text-white/60 overflow-x-auto scrollbar-hide"
          >
            {breadcrumbs.map((id, index) => (
                <span 
                  key={id} 
                  className="flex items-center gap-1 shrink-0"
                >
                  {index > 0 && <span className="text-white/30">›</span>}
                  <button
                    data-id={id}
                    className={cn(
                      "hover:text-white shrink-0 px-1",
                      ((id === selectedObjectId) || (index === 0 && selectedObjectId === SCENE_ROOT_ID)) && "text-amber-400"
                    )}
                    onClick={() => {
                      // "scene" (index 0) - select scene to show full scene code
                      if (index === 0) {
                        onBreadcrumbClick(id, index);
                        onOpen?.();
                      } else if (id === selectedObjectId) {
                        onOpen?.();
                      } else {
                        onBreadcrumbClick(id, index);
                      }
                    }}
                  >
                    {id}
                  </button>
                </span>
            ))}
          </div>
        </div>

        {validationError && (
          <button
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
            onClick={() => {
              if (!isOpen) {
                onOpen?.();
              }
            }}
            title="View error"
          >
            <AlertCircle className="h-3 w-3" />
          </button>
        )}

        {/* Warning indicator - show when there are warnings but no errors */}
        {!validationError && activeWarnings.length > 0 && (
          <div className="flex items-center gap-1">
            {activeWarnings.map((warning, index) => (
              <div key={index} className="flex items-center gap-1 text-xs text-yellow-400">
                <button
                  className="flex items-center gap-1 hover:text-yellow-300 transition-colors"
                  onClick={() => {
                    if (!isOpen) {
                      onOpen?.();
                    }
                  }}
                  title={warning}
                >
                  <AlertTriangle className="h-3 w-3" />
                </button>
                <button
                  className="p-0.5 hover:bg-white/10 rounded transition-colors"
                  onClick={() => dismiss_warning(warning)}
                  title="Dismiss warning"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {onToggle && (
          <Button
            type="button"
            variant="toolbar"
            size="icon"
            className={`h-7 w-7 transition-all duration-200 relative ${
              isOpen
                ? "bg-white/10 text-amber-400 hover:bg-white/15"
                : "hover:bg-white/5"
            }`}
            onClick={onToggle}
            title="Scene Editor"
          >
            <Code2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Editor area */}
      <div 
        className={cn(
          "flex flex-col flex-1 overflow-hidden relative",
          isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        tabIndex={-1}
      >
        <div className="flex-1 min-h-0 relative">
          <SceneCodeEditor
            value={localCode}
            onChange={handleCodeChange}
            onEditorMount={handleEditorMount}
            error={validationError}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          
          {/* Floating copy button - only visible when hovered or focused */}
          <Button
            variant="toolbar"
            size="icon"
            className={cn(
              "absolute top-2 right-4 h-7 w-7 z-10 transition-opacity duration-200",
              showCopyButton ? "opacity-100" : "opacity-0"
            )}
            onClick={handleCopy}
            title="Copy code"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        
        {/* Error panel - below editor */}
        {validationErrors.length > 0 && (
          <div className="flex items-center gap-1 px-4 py-1 border-t border-b border-white/5 shrink-0">
            {/* Prev/Next - only visible when > 1 error */}
            {validationErrors.length > 1 && (
              <>
                <Button
                  variant="toolbar"
                  size="icon"
                  className="h-6 w-4"
                  onClick={() => prev_error()}
                  title="Previous error"
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="text-xs text-white/50 shrink-0 tabular-nums">
                  {currentErrorIndex + 1}/{validationErrors.length}
                </span>
                <Button
                  variant="toolbar"
                  size="icon"
                  className="h-6 w-4"
                  onClick={() => next_error()}
                  title="Next error"
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </>
            )}

            {/* Single error - counter with space to text */}
            {validationErrors.length === 1 && (
              <span className="text-xs text-white/50 shrink-0 tabular-nums">
                {currentErrorIndex + 1}/{validationErrors.length}
              </span>
            )}

            {/* Error text - scrollable */}
            <div className="flex-1 relative min-w-0 ml-2">
              <div
                ref={errorPanelRef}
                className="flex items-center overflow-x-auto scrollbar-hide text-xs text-red-400 whitespace-nowrap"
              >
                <span>
                  {validationErrors[currentErrorIndex]?.message}
                </span>
              </div>
              {/* Left fade */}
              {errorPanelScrolled.left && (
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[var(--main-black)] to-transparent pointer-events-none" />
              )}
              {/* Right fade */}
              {errorPanelScrolled.right && (
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[var(--main-black)] to-transparent pointer-events-none" />
              )}
            </div>

            {/* Go to error line */}
            <Button
              variant="toolbar"
              size="icon"
              className="h-6 w-6 shrink-0"
              title="Go to error"
              onClick={handleGoToError}
            >
              <Crosshair className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
