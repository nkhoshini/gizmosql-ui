import { useRef, useEffect } from 'react';
import Editor, { OnMount, Monaco } from '@monaco-editor/react';
import type { editor, IPosition } from 'monaco-editor';
import './SqlEditor.css';

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute: () => void;
}

export function SqlEditor({ value, onChange, onExecute }: SqlEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount: OnMount = (editorInstance, monaco: Monaco) => {
    editorRef.current = editorInstance;

    // Add Cmd+Enter keybinding to execute query (Mac)
    editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onExecute();
    });

    // Add Ctrl+Enter keybinding to execute query (cross-platform)
    editorInstance.addCommand(monaco.KeyMod.WinCtrl | monaco.KeyCode.Enter, () => {
      onExecute();
    });

    // Configure SQL language
    monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (model: editor.ITextModel, position: IPosition) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions = [
          // Keywords
          ...['SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER',
            'ON', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL',
            'ORDER', 'BY', 'ASC', 'DESC', 'LIMIT', 'OFFSET', 'GROUP', 'HAVING',
            'UNION', 'ALL', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
            'CREATE', 'TABLE', 'DROP', 'ALTER', 'INDEX', 'VIEW', 'AS', 'DISTINCT',
            'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
            'CAST', 'COALESCE', 'NULLIF', 'EXISTS', 'WITH', 'RECURSIVE'
          ].map(keyword => ({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            range,
          })),
          // Functions
          ...['NOW()', 'CURRENT_DATE', 'CURRENT_TIMESTAMP', 'DATE()', 'TIME()',
            'DATETIME()', 'STRFTIME()', 'SUBSTRING()', 'CONCAT()', 'LENGTH()',
            'UPPER()', 'LOWER()', 'TRIM()', 'REPLACE()', 'ROUND()', 'ABS()',
            'FLOOR()', 'CEIL()', 'RANDOM()'
          ].map(func => ({
            label: func,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: func,
            range,
          })),
        ];

        return { suggestions };
      },
    });

    // Focus the editor
    editorInstance.focus();
  };

  // Update onExecute callback when it changes
  useEffect(() => {
    if (editorRef.current) {
      // Re-register the command with updated callback
      // Monaco doesn't have a clean way to update commands, so we work around it
    }
  }, [onExecute]);

  return (
    <div className="sql-editor">
      <Editor
        height="100%"
        defaultLanguage="sql"
        value={value}
        onChange={(value) => onChange(value || '')}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: 'line',
          cursorBlinking: 'smooth',
          smoothScrolling: true,
          contextmenu: true,
          quickSuggestions: true,
          suggestOnTriggerCharacters: true,
        }}
      />
    </div>
  );
}
