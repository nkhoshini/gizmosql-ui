import { useRef, useEffect, useCallback, useState } from 'react';
import Editor, { OnMount, Monaco } from '@monaco-editor/react';
import type { editor, IPosition } from 'monaco-editor';
import { useApp } from '../context/AppContext';
import { Cell as CellType } from '../types';
import { ResultsTable } from './ResultsTable';
import { ServerSelectModal } from './ServerSelectModal';
import './Cell.css';

interface CellProps {
  notebookId: string;
  cell: CellType;
  isActive: boolean;
  onActivate: () => void;
  onAddCellBelow: () => void;
  onRequestConnection?: (cellId: string) => void;
}

export function Cell({ notebookId, cell, isActive, onActivate, onAddCellBelow, onRequestConnection }: CellProps) {
  const { state, updateCellSql, updateCellServer, executeCell, removeCell, fetchCellPage } = useApp();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showServerSelect, setShowServerSelect] = useState(false);
  const [pendingExecute, setPendingExecute] = useState(false);
  // Use ref to avoid stale closure in Monaco actions
  const executeRef = useRef<() => void>(() => {});

  const handleExecute = useCallback(() => {
    // Auto-activate this cell when executing so right pane updates
    onActivate();

    console.log('Executing cell:', cell.id, 'serverId:', cell.serverId, 'servers:', state.servers.length);
    console.log('onRequestConnection available:', !!onRequestConnection);

    // Check if the cell's server still exists (could be stale from previous session)
    const serverExists = cell.serverId && state.servers.some(s => s.id === cell.serverId);
    console.log('serverExists:', serverExists);

    // If no server selected or server no longer exists
    if (!cell.serverId || !serverExists) {
      console.log('No valid server, checking what to do...');

      // Clear stale server ID if it no longer exists
      if (cell.serverId && !serverExists) {
        console.log('Clearing stale server ID');
        updateCellServer(notebookId, cell.id, null);
      }

      // If no servers connected, request connection
      if (state.servers.length === 0) {
        console.log('No servers connected, requesting connection...');
        if (onRequestConnection) {
          console.log('Calling onRequestConnection');
          onRequestConnection(cell.id);
        } else {
          console.log('onRequestConnection is not defined!');
        }
        return;
      }
      // If only one server, auto-select it
      if (state.servers.length === 1) {
        updateCellServer(notebookId, cell.id, state.servers[0].id);
        // Execute after state update
        setTimeout(() => executeCell(notebookId, cell.id), 0);
        return;
      }
      // If multiple servers, show selection modal
      if (state.servers.length > 1) {
        setShowServerSelect(true);
        return;
      }
      return;
    }

    executeCell(notebookId, cell.id);
  }, [executeCell, notebookId, cell.id, cell.serverId, state.servers, updateCellServer, onRequestConnection, onActivate]);

  const handleServerSelect = (serverId: string) => {
    updateCellServer(notebookId, cell.id, serverId);
    setShowServerSelect(false);
    setPendingExecute(true);
  };

  // Execute when server is selected and state has updated
  useEffect(() => {
    if (pendingExecute && cell.serverId) {
      setPendingExecute(false);
      executeCell(notebookId, cell.id);
    }
  }, [pendingExecute, cell.serverId, executeCell, notebookId, cell.id]);

  // Keep the ref updated
  useEffect(() => {
    executeRef.current = handleExecute;
  }, [handleExecute]);

  // Handle keyboard shortcut at the container level as fallback
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Enter or Ctrl+Enter or Shift+Enter
      if ((e.metaKey || e.ctrlKey || e.shiftKey) && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        console.log('Keyboard shortcut triggered');
        executeRef.current();
      }
    };

    container.addEventListener('keydown', handleKeyDown, true);
    return () => container.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  const handleEditorDidMount: OnMount = (editorInstance, monaco: Monaco) => {
    editorRef.current = editorInstance;

    // Add Ctrl+Enter / Cmd+Enter action to execute query
    editorInstance.addAction({
      id: 'execute-query',
      label: 'Execute Query',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      ],
      precondition: undefined,
      keybindingContext: undefined,
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.5,
      run: () => {
        console.log('Monaco action triggered');
        executeRef.current();
      },
    });

    // Also add Shift+Enter as alternative
    editorInstance.addAction({
      id: 'execute-query-shift',
      label: 'Execute Query (Shift+Enter)',
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyCode.Enter,
      ],
      run: () => {
        console.log('Monaco Shift+Enter action triggered');
        executeRef.current();
      },
    });

    // SQL autocomplete
    monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (model: editor.ITextModel, position: IPosition) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER',
          'ON', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL',
          'ORDER', 'BY', 'ASC', 'DESC', 'LIMIT', 'OFFSET', 'GROUP', 'HAVING',
          'UNION', 'ALL', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
          'CREATE', 'TABLE', 'DROP', 'ALTER', 'INDEX', 'VIEW', 'AS', 'DISTINCT',
          'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'];

        return {
          suggestions: keywords.map(kw => ({
            label: kw,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: kw,
            range,
          })),
        };
      },
    });
  };

  // Focus editor when cell becomes active
  useEffect(() => {
    if (isActive && editorRef.current) {
      editorRef.current.focus();
    }
  }, [isActive]);

  const selectedServer = state.servers.find(s => s.id === cell.serverId);
  // Allow execution if there's SQL - the handler will prompt for connection if needed
  const canExecute = !!cell.sql.trim() && !cell.isExecuting;

  return (
    <div
      ref={containerRef}
      className={`cell ${isActive ? 'active' : ''}`}
      onClick={onActivate}
    >
      <div className="cell-header">
        <div className="cell-header-left">
          <button
            className="btn btn-primary btn-sm execute-btn"
            onClick={handleExecute}
            disabled={!canExecute}
          >
            {cell.isExecuting ? (
              <>
                <span className="spinner"></span>
                Running...
              </>
            ) : (
              <>▶ Run</>
            )}
          </button>
          {cell.result && (
            <span className="cell-stats">
              {cell.result.rowCount} row{cell.result.rowCount !== 1 ? 's' : ''} • {cell.result.executionTimeMs}ms
            </span>
          )}
        </div>
        <div className="cell-header-right">
          <select
            className="server-select"
            value={cell.serverId || ''}
            onChange={e => updateCellServer(notebookId, cell.id, e.target.value || null)}
            onClick={e => e.stopPropagation()}
          >
            <option value="">Select server...</option>
            {state.servers.map(server => (
              <option key={server.id} value={server.id}>
                {server.name}
              </option>
            ))}
          </select>
          <button
            className="btn btn-ghost btn-icon"
            onClick={e => { e.stopPropagation(); onAddCellBelow(); }}
            title="Add cell below"
          >
            +
          </button>
          <button
            className="btn btn-ghost btn-icon"
            onClick={e => { e.stopPropagation(); removeCell(notebookId, cell.id); }}
            title="Delete cell"
          >
            ×
          </button>
        </div>
      </div>

      <div className="cell-editor">
        <Editor
          height="100px"
          defaultLanguage="sql"
          value={cell.sql}
          onChange={(value) => updateCellSql(notebookId, cell.id, value || '')}
          onMount={handleEditorDidMount}
          theme={state.theme === 'dark' ? 'vs-dark' : 'light'}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            padding: { top: 8, bottom: 8 },
            renderLineHighlight: 'none',
            scrollbar: { vertical: 'hidden', horizontal: 'auto' },
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 3,
          }}
        />
      </div>

      {cell.error && (
        <div className="cell-error">
          <span className="error-icon">⚠</span>
          {cell.error}
        </div>
      )}

      {cell.result && !cell.error && (
        <div className="cell-result">
          <ResultsTable
            result={cell.result}
            maxHeight={300}
            onPageChange={(page) => fetchCellPage(notebookId, cell.id, page)}
            isLoading={cell.isExecuting}
          />
        </div>
      )}

      {!selectedServer && state.servers.length === 0 && (
        <div className="cell-hint">
          Connect to a server to run queries
        </div>
      )}

      {showServerSelect && (
        <ServerSelectModal
          servers={state.servers}
          onSelect={handleServerSelect}
          onCancel={() => setShowServerSelect(false)}
        />
      )}
    </div>
  );
}
