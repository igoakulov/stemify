"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Undo2, Redo2, Copy, Check, Code2, AlertCircle } from "lucide-react";

import { SceneCodeEditor } from "@/components/SceneCodeEditor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useSceneEditorStore,
  set_validation_error,
} from "@/lib/scene/editor_store";
import { pretty_print_scene_code, format_scene_code, remove_comments } from "@/lib/scene/comments";
import { validate_scene_code } from "@/lib/chat/scene_apply";

type SceneEditorPanelProps = {
  className?: string;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  fullSceneCode: string;
  selectedObjectId: string | null;
  breadcrumbs: string[];
  onBreadcrumbClick: (id: string) => void;
  onSceneCodeChange: (code: string) => void;
  onApplySceneCode?: (code: string) => void;
};

const DEBOUNCE_MS = 500;

export function SceneEditorPanel({
  className,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  fullSceneCode,
  selectedObjectId,
  breadcrumbs,
  onBreadcrumbClick,
  onSceneCodeChange,
  onApplySceneCode,
}: SceneEditorPanelProps) {
  const validationError = useSceneEditorStore((s) => s.validationError);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const breadcrumbsRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isObjectMode = selectedObjectId !== null;

  // Initialize localCode with pretty-printed code on mount
  const [localCode, setLocalCode] = useState(() => {
    if (isObjectMode) {
      const objectCode = extractObjectCode(fullSceneCode, selectedObjectId!);
      const method = extractMethodName(objectCode);
      return pretty_print_scene_code(objectCode, method);
    }
    return pretty_print_scene_code(fullSceneCode);
  });

  // Track last synced code to detect external changes
  const lastSyncedCodeRef = useRef(fullSceneCode);

  // Sync when fullSceneCode changes externally (e.g., code applied from chat)
  // Re-inject comments since it's a new scene
  useEffect(() => {
    if (fullSceneCode !== lastSyncedCodeRef.current) {
      lastSyncedCodeRef.current = fullSceneCode;
      
      // Strip existing comments first to prevent stacking
      const cleanedCode = remove_comments(fullSceneCode);
      
      let newCode: string;
      if (isObjectMode && selectedObjectId) {
        const objectCode = extractObjectCode(cleanedCode, selectedObjectId);
        const method = extractMethodName(objectCode);
        newCode = pretty_print_scene_code(objectCode, method);
      } else {
        newCode = pretty_print_scene_code(cleanedCode);
      }
      
      // Use raf to avoid synchronous setState in effect
      window.requestAnimationFrame(() => {
        setLocalCode(newCode);
      });
    }
  }, [fullSceneCode, isObjectMode, selectedObjectId]);

  const validateAndApply = useCallback(
    (code: string) => {
      if (!code.trim()) {
        set_validation_error(null);
        onSceneCodeChange(code);
        return;
      }

      const result = validate_scene_code(code);
      if (!result.ok) {
        set_validation_error(result.error ?? "Invalid scene code");
        onSceneCodeChange(code);
        return;
      }

      set_validation_error(null);
      // Format code after successful validation (no comment injection)
      const formattedCode = format_scene_code(code);
      setLocalCode(formattedCode);
      
      // Strip comments before saving to prevent stacking
      const cleanCode = remove_comments(formattedCode);
      onSceneCodeChange(cleanCode);
      onApplySceneCode?.(cleanCode);
    },
    [onSceneCodeChange, onApplySceneCode]
  );

  const handleCodeChange = useCallback(
    (value: string) => {
      setLocalCode(value);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        validateAndApply(value);
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

  const handleCopy = useCallback(async () => {
    let codeToCopy: string;
    if (isObjectMode && selectedObjectId) {
      const objectCode = extractObjectCode(localCode, selectedObjectId);
      const method = extractMethodName(objectCode);
      codeToCopy = pretty_print_scene_code(objectCode, method);
    } else {
      codeToCopy = pretty_print_scene_code(localCode);
    }

    await navigator.clipboard.writeText(codeToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [isObjectMode, selectedObjectId, localCode]);

  // Calculate line offset and filtered code for object view
  // Note: localCode already has comments injected on initial load via useState initializer
  // After that, it's raw code (user edits) or formatted code (after validation)
  const displayCode = useMemo(() => {
    if (isObjectMode && selectedObjectId) {
      const objectCode = extractObjectCode(localCode, selectedObjectId);
      if (objectCode) {
        // Find the starting line of the object in the full code
        const fullLines = localCode.split("\n");
        const objectCodeLines = objectCode.split("\n");
        const firstLine = objectCodeLines[0];
        const firstLineTrimmed = firstLine?.trim();
        const methodPrefix = firstLineTrimmed?.split('(')[0];
        
        let startIdx = -1;
        for (let i = 0; i < fullLines.length; i++) {
          if (fullLines[i].trim() === firstLineTrimmed || 
              (fullLines[i].includes(selectedObjectId) && methodPrefix && fullLines[i].includes(methodPrefix))) {
            startIdx = i;
            break;
          }
        }
        
        return {
          displayCode: objectCode,
          lineNumberOffset: startIdx >= 0 ? startIdx : 0,
        };
      }
    }
    
    // Scene view - show all code
    return {
      displayCode: localCode,
      lineNumberOffset: 0,
    };
  }, [isObjectMode, selectedObjectId, localCode]);

  const showCopyButton = isHovered || isFocused;

  return (
    <div className={cn("flex h-full flex-col overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-white/5 shrink-0">
        <Button
          variant="toolbar"
          size="icon"
          className="h-6 w-6"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="toolbar"
          size="icon"
          className="h-6 w-6"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </Button>

        {breadcrumbs.length > 0 && (
          <div 
            ref={breadcrumbsRef}
            className="flex items-center gap-1 text-xs text-white/60 overflow-x-auto scrollbar-hide"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {breadcrumbs.map((id, index) => (
              <span 
                key={id} 
                className="flex items-center gap-1 shrink-0"
                style={{ scrollSnapAlign: 'center' }}
              >
                {index > 0 && <span className="text-white/30">›</span>}
                <button
                  data-id={id}
                  className={cn(
                    "hover:text-white shrink-0 px-1",
                    id === selectedObjectId && "text-amber-400"
                  )}
                  onClick={() => onBreadcrumbClick(id)}
                >
                  {id}
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex-1" />

        {validationError && (
          <div className="flex items-center gap-1 text-xs text-red-400">
            <AlertCircle className="h-3 w-3" />
          </div>
        )}
      </div>

      {/* Editor area */}
      <div 
        className="flex-1 overflow-hidden relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isObjectMode && !selectedObjectId ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-sm text-white/50">
            <Code2 className="mb-2 h-8 w-8 text-white/20" />
            <p className="mb-1">Click an object in the scene</p>
            <p className="text-xs">to inspect and edit it.</p>
          </div>
        ) : (
          <SceneCodeEditor
            value={displayCode.displayCode}
            onChange={handleCodeChange}
            error={validationError}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            lineNumberOffset={displayCode.lineNumberOffset}
          />
        )}
        
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
    </div>
  );
}

function extractObjectCode(sceneCode: string, objectId: string): string {
  // Check if this is a tooltip: or label: prefixed ID
  const isTooltip = objectId.startsWith('tooltip:');
  const isLabel = objectId.startsWith('label:');
  const actualId = isTooltip ? objectId.slice(8) : isLabel ? objectId.slice(6) : objectId;

  // Find all object start positions
  const starts: number[] = [];
  const regex = /^scene\.\w+\s*\(/gm;
  let match;

  while ((match = regex.exec(sceneCode)) !== null) {
    starts.push(match.index);
  }

  // If tooltip: or label: prefix, only search for addTooltip/addLabel
  if (isTooltip || isLabel) {
    const targetMethod = isTooltip ? 'addTooltip' : 'addLabel';
    for (let i = 0; i < starts.length; i++) {
      const start = starts[i];
      const end = starts[i + 1] !== undefined ? starts[i + 1] : sceneCode.length;
      const snippet = sceneCode.slice(start, end);

      const methodMatch = snippet.match(/^scene\.(\w+)\s*\(/);
      const methodName = methodMatch ? methodMatch[1] : null;

      if (methodName !== targetMethod) continue;

      const idPattern = new RegExp(`id:\\s*["\']${actualId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["\']`);
      if (idPattern.test(snippet)) {
        return extractWithBraceCounting(sceneCode, start);
      }
    }
    return "";
  }

  // Find the main object (any scene.addX call except addTooltip/addLabel)
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = starts[i + 1] !== undefined ? starts[i + 1] : sceneCode.length;
    const snippet = sceneCode.slice(start, end);

    const methodMatch = snippet.match(/^scene\.(\w+)\s*\(/);
    const methodName = methodMatch ? methodMatch[1] : null;

    // Skip addTooltip and addLabel - show main object code
    if (methodName === 'addTooltip' || methodName === 'addLabel') continue;

    const idPattern = new RegExp(`id:\\s*["\']${actualId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["\']`);
    if (idPattern.test(snippet)) {
      return extractWithBraceCounting(sceneCode, start);
    }
  }

  // Fall back to addTooltip or addLabel if no main object found
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = starts[i + 1] !== undefined ? starts[i + 1] : sceneCode.length;
    const snippet = sceneCode.slice(start, end);

    const methodMatch = snippet.match(/^scene\.(\w+)\s*\(/);
    const methodName = methodMatch ? methodMatch[1] : null;

    if (methodName !== 'addTooltip' && methodName !== 'addLabel') continue;

    const idPattern = new RegExp(`id:\\s*["\']${actualId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["\']`);
    if (idPattern.test(snippet)) {
      return extractWithBraceCounting(sceneCode, start);
    }
  }

  return "";
}

function extractWithBraceCounting(code: string, startIndex: number): string {
  let braceDepth = 0;
  let foundFirstBrace = false;
  let parenDepth = 1; // We start after scene.addX(

  for (let i = startIndex; i < code.length; i++) {
    const char = code[i];

    if (char === '(' && !foundFirstBrace) {
      parenDepth++;
    } else if (char === ')' && !foundFirstBrace) {
      parenDepth--;
      if (parenDepth === 0) {
        return code.slice(startIndex, i + 1).trim();
      }
    } else if (char === '{') {
      braceDepth++;
      foundFirstBrace = true;
    } else if (char === '}') {
      braceDepth--;
      if (foundFirstBrace && braceDepth === 0) {
        // Look for closing paren and optional semicolon
        let j = i + 1;
        while (j < code.length && /\s/.test(code[j])) j++;
        if (j < code.length && code[j] === ')') {
          j++;
          if (j < code.length && code[j] === ';') j++;
          return code.slice(startIndex, j).trim();
        }
        return code.slice(startIndex, i + 1).trim();
      }
    }
  }

  return code.slice(startIndex).trim();
}

function extractMethodName(code: string): string {
  const match = code.match(/scene\.(\w+)\s*\(/);
  return match ? match[1] : "";
}


