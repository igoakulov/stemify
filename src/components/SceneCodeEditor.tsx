"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import type { Monaco } from "@monaco-editor/react";

type SceneCodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  readOnly?: boolean;
  language?: string;
  lineNumberOffset?: number;
  onFocus?: () => void;
  onBlur?: () => void;
};

export function SceneCodeEditor({
  value,
  onChange,
  error,
  readOnly = false,
  language = "javascript",
  lineNumberOffset = 0,
  onFocus,
  onBlur,
}: SceneCodeEditorProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [mounted, setMounted] = useState(false);

  const handle_mount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setMounted(true);

    editor.updateOptions({
      links: true,
      cursorBlinking: "smooth",
      smoothScrolling: true,
      padding: { top: 8, bottom: 8 },
      folding: false,
      lineNumbers: lineNumberOffset > 0 
        ? (lineNumber: number) => String(lineNumber + lineNumberOffset)
        : "on",
      glyphMargin: false,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      wordWrap: "on",
      fontSize: 13,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      renderLineHighlight: "none",
      overviewRulerBorder: false,
      hideCursorInOverviewRuler: true,
      overviewRulerLanes: 0,
      scrollbar: {
        vertical: "auto",
        horizontal: "auto",
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8,
      },
    });

    // Wire up focus/blur handlers
    if (onFocus) {
      editor.onDidFocusEditorWidget(onFocus);
    }
    if (onBlur) {
      editor.onDidBlurEditorWidget(onBlur);
    }

    // Register color provider to preserve hex format
    monaco.languages.registerColorProvider(language, {
      provideColorPresentations: (_model: unknown, colorInfo: { color: { red: number; green: number; blue: number; alpha: number } }) => {
        const color = colorInfo.color;
        const red = Math.round(color.red * 255);
        const green = Math.round(color.green * 255);
        const blue = Math.round(color.blue * 255);
        const alpha = color.alpha;
        
        // Return hex format as primary presentation
        if (alpha < 1) {
          const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
          return [
            {
              label: `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}${alphaHex}`,
            }
          ];
        }
        
        return [
          {
            label: `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`,
          }
        ];
      },
      provideDocumentColors: () => null,
    });
  }, [lineNumberOffset, onFocus, onBlur, language]);

  const handle_change = useCallback(
    (value: string | undefined) => {
      onChange(value ?? "");
    },
    [onChange]
  );

  useEffect(() => {
    if (!editorRef.current || !mounted || !monacoRef.current) return;

    const model = editorRef.current.getModel();
    if (!model) return;

    if (error) {
      const markers: Parameters<typeof monacoRef.current.editor.setModelMarkers>[2] = [
        {
          severity: monacoRef.current.MarkerSeverity.Error,
          message: error,
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: model.getLineCount(),
          endColumn: model.getLineMaxColumn(model.getLineCount()),
        },
      ];
      monacoRef.current.editor.setModelMarkers(model, "scene-editor", markers);
    } else {
      monacoRef.current.editor.setModelMarkers(model, "scene-editor", []);
    }
  }, [error, mounted]);

  return (
    <div className="h-full w-full overflow-hidden rounded-lg border border-white/10 bg-zinc-900">
      <Editor
        height="100%"
        defaultLanguage={language}
        value={value}
        onChange={handle_change}
        onMount={handle_mount}
        theme="vs-dark"
        options={{
          readOnly,
          domReadOnly: readOnly,
        }}
        loading={
          <div className="flex h-full w-full items-center justify-center text-zinc-500">
            Loading editor...
          </div>
        }
      />
    </div>
  );
}
