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
  const overflowRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  const handle_mount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;
      setMounted(true);

      // Define custom theme - inherit: true keeps syntax highlighting, but override backgrounds with solid colors
      monaco.editor.defineTheme("stemify-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [],
        colors: {
          // Primary backgrounds - solid colors, no transparency
          "editor.background": "#09090b",
          "editor.lineHighlightBackground": "#2a2a2f",
          "editor.inactiveSelectionBackground": "#333338",
          "editor.selectionBackground": "#3a3a40",

          //"editorGutter.background": "#242429",

          // Line numbers
          "editorLineNumber.foreground": "#5a5a65",
          "editorLineNumber.activeForeground": "#fbbf24",

          // Widgets
          "editorWidget.background": "#242429",
          "editorWidget.border": "#3a3a40",

          // Scrollbars
          "scrollbar.background": "#1e1e22",
          "scrollbarSlider.background": "#3a3a4280",
          "scrollbarSlider.hoverBackground": "#4a4a55",
          "scrollbarSlider.activeBackground": "#5a5a65",

          // Minimap
          "minimap.background": "#242429",
          "minimapSlider.background": "#3a3a4260",
        },
      });
      monaco.editor.setTheme("stemify-dark");

      editor.updateOptions({
        links: true,
        cursorBlinking: "smooth",
        smoothScrolling: true,
        padding: { top: 8, bottom: 8 },
        folding: true,
        lineNumbers:
          lineNumberOffset > 0
            ? (lineNumber: number) => String(lineNumber + lineNumberOffset)
            : "on",
        glyphMargin: false,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: "on",
        fontSize: 13,
        fontFamily:
          "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        renderLineHighlight: "all",
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        overviewRulerLanes: 0,
        tabIndex: -1,
        accessibilitySupport: "off",
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

      // Defocus editor on Escape key
      editor.addCommand(monaco.KeyCode.Escape, () => {
        // Close any open widgets (like color picker)
        editor.getContribution("editor.contrib.widgetController")?. dispose();
        // Try to blur the editor
        const textarea = editor.getDomNode()?.querySelector("textarea") as HTMLElement | null;
        textarea?.blur();
        // Focus the body as fallback
        document.body.focus();
      });

      // Register color provider to preserve hex format
      monaco.languages.registerColorProvider(language, {
        provideColorPresentations: (
          _model: unknown,
          colorInfo: {
            color: { red: number; green: number; blue: number; alpha: number };
          },
        ) => {
          const color = colorInfo.color;
          const red = Math.round(color.red * 255);
          const green = Math.round(color.green * 255);
          const blue = Math.round(color.blue * 255);
          const alpha = color.alpha;

          // Return hex format as primary presentation
          if (alpha < 1) {
            const alphaHex = Math.round(alpha * 255)
              .toString(16)
              .padStart(2, "0");
            return [
              {
                label: `#${red.toString(16).padStart(2, "0")}${green.toString(16).padStart(2, "0")}${blue.toString(16).padStart(2, "0")}${alphaHex}`,
              },
            ];
          }

          return [
            {
              label: `#${red.toString(16).padStart(2, "0")}${green.toString(16).padStart(2, "0")}${blue.toString(16).padStart(2, "0")}`,
            },
          ];
        },
        provideDocumentColors: () => null,
      });
    },
    [lineNumberOffset, onFocus, onBlur, language],
  );

  const handle_change = useCallback(
    (value: string | undefined) => {
      onChange(value ?? "");
    },
    [onChange],
  );

  useEffect(() => {
    if (!editorRef.current || !mounted || !monacoRef.current) return;

    const model = editorRef.current.getModel();
    if (!model) return;

    if (error) {
      const markers: Parameters<
        typeof monacoRef.current.editor.setModelMarkers
      >[2] = [
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

  useEffect(() => {
    if (!mounted || !editorRef.current || !overflowRef.current) return;

    editorRef.current.updateOptions({
      overflowWidgetsDomNode: overflowRef.current,
    });
  }, [mounted]);

  return (
    <div className="h-full w-full bg-[var(--main-black)]">
      <Editor
        height="100%"
        defaultLanguage={language}
        value={value}
        onChange={handle_change}
        onMount={handle_mount}
        theme="vs-contrast-dark"
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
