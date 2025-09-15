// CoCode Monaco Editor Component

import { useRef, useEffect } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import { getTheme } from '@/theme/theme';
import { inferLanguageFromExtension } from '@/lib/encoding';

export interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  filename?: string;
  readOnly?: boolean;
  onSave?: () => void;
  navigateToLine?: number;
}

export function MonacoEditor({
  value,
  onChange,
  language,
  filename,
  readOnly = false,
  onSave,
  navigateToLine
}: MonacoEditorProps) {
  const editorRef = useRef<any>(null);
  const currentTheme = getTheme();

  // Infer language from filename if not provided
  const editorLanguage = language || (filename ? inferLanguageFromExtension(filename) : 'plaintext');

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Configure Monaco themes
    monaco.editor.defineTheme('cocode-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A737D', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'F97583' },
        { token: 'string', foreground: '9ECBFF' },
        { token: 'number', foreground: '79B8FF' },
        { token: 'type', foreground: 'B392F0' },
        { token: 'function', foreground: 'B392F0' },
        { token: 'variable', foreground: 'E1E4E8' },
      ],
      colors: {
        'editor.background': '#0D1117',
        'editor.foreground': '#E1E4E8',
        'editor.lineHighlightBackground': '#161B22',
        'editor.selectionBackground': '#264F78',
        'editor.inactiveSelectionBackground': '#3A3D41',
        'editorCursor.foreground': '#E1E4E8',
        'editorWhitespace.foreground': '#484F58',
        'editorLineNumber.foreground': '#484F58',
        'editorLineNumber.activeForeground': '#E1E4E8',
      }
    });

    monaco.editor.defineTheme('cocode-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A737D', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'D73A49' },
        { token: 'string', foreground: '032F62' },
        { token: 'number', foreground: '005CC5' },
        { token: 'type', foreground: '6F42C1' },
        { token: 'function', foreground: '6F42C1' },
        { token: 'variable', foreground: '24292E' },
      ],
      colors: {
        'editor.background': '#FFFFFF',
        'editor.foreground': '#24292E',
        'editor.lineHighlightBackground': '#F6F8FA',
        'editor.selectionBackground': '#0366D625',
        'editor.inactiveSelectionBackground': '#E1E4E8',
        'editorCursor.foreground': '#24292E',
        'editorWhitespace.foreground': '#D1D5DA',
        'editorLineNumber.foreground': '#959DA5',
        'editorLineNumber.activeForeground': '#24292E',
      }
    });

    // Set theme based on current theme
    const monacoTheme = currentTheme === 'dark' ? 'cocode-dark' : 'cocode-light';
    monaco.editor.setTheme(monacoTheme);

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave?.();
    });

    // Configure editor options
    editor.updateOptions({
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Consolas, Monaco, "Courier New", monospace',
      lineHeight: 20,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      automaticLayout: true,
      tabSize: 2,
      insertSpaces: true,
      renderWhitespace: 'selection',
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        indentation: true,
      },
    });
  };

  const handleEditorChange: OnChange = (newValue) => {
    if (newValue !== undefined) {
      onChange(newValue);
    }
  };

  // Update theme when it changes
  useEffect(() => {
    if (editorRef.current) {
      const monaco = (window as any).monaco;
      if (monaco) {
        const monacoTheme = currentTheme === 'dark' ? 'cocode-dark' : 'cocode-light';
        monaco.editor.setTheme(monacoTheme);
      }
    }
  }, [currentTheme]);

  // Navigate to specific line when requested
  useEffect(() => {
    if (editorRef.current && navigateToLine && navigateToLine > 0) {
      editorRef.current.revealLineInCenter(navigateToLine);
      editorRef.current.setPosition({ lineNumber: navigateToLine, column: 1 });
      editorRef.current.focus();
    }
  }, [navigateToLine]);

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        language={editorLanguage}
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          theme: currentTheme === 'dark' ? 'cocode-dark' : 'cocode-light',
        }}
        loading={
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
          </div>
        }
      />
    </div>
  );
}
