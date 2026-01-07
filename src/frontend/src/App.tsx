import { useState, useCallback } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { NotebookExplorer } from './components/NotebookExplorer';
import { ServerExplorer } from './components/ServerExplorer';
import { NotebookView } from './components/NotebookView';
import { ResultSchema } from './components/ResultSchema';
import { AddServerDialog } from './components/AddServerDialog';
import { TableDetails } from './components/TableDetails';
import { Cell } from './types';
import gizmosqlLogo from './assets/gizmosql-logo.png';
import './App.css';

interface SelectedTable {
  serverId: string;
  catalog: string;
  schema: string;
  tableName: string;
}

function AppContent() {
  const { state, toggleTheme, updateCellServer, executeCell } = useApp();
  const [showAddServer, setShowAddServer] = useState(false);
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
  const [selectedTable, setSelectedTable] = useState<SelectedTable | null>(null);
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(260);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(280);
  const [tableDetailsHeight, setTableDetailsHeight] = useState(280);
  const [pendingExecuteCellId, setPendingExecuteCellId] = useState<string | null>(null);

  const handleTableSelect = useCallback((serverId: string, catalog: string, schema: string, tableName: string) => {
    console.log('Table selected:', serverId, catalog, schema, tableName);
    setSelectedTable({ serverId, catalog, schema, tableName });
  }, []);

  const handleRequestConnection = useCallback((cellId: string) => {
    console.log('Connection requested for cell:', cellId);
    setPendingExecuteCellId(cellId);
    setShowAddServer(true);
  }, []);

  const handleServerConnected = useCallback(() => {
    setShowAddServer(false);

    // After server is added, the context will have the new server
    // We need to wait for the state update, then associate cells and execute
    if (pendingExecuteCellId) {
      // Use setTimeout to allow state to update with new server
      setTimeout(() => {
        const newServer = state.servers[state.servers.length - 1];
        if (newServer) {
          // Associate all cells in the active notebook with the new server
          const activeNotebook = state.notebooks.find(n => n.id === state.activeNotebookId);
          if (activeNotebook) {
            activeNotebook.cells.forEach(cell => {
              if (!cell.serverId) {
                updateCellServer(activeNotebook.id, cell.id, newServer.id);
              }
            });
          }

          // Execute the pending cell
          if (activeNotebook) {
            const pendingCell = activeNotebook.cells.find(c => c.id === pendingExecuteCellId);
            if (pendingCell) {
              // Need another timeout to let the server assignment complete
              setTimeout(() => {
                executeCell(activeNotebook.id, pendingExecuteCellId);
              }, 50);
            }
          }
        }
        setPendingExecuteCellId(null);
      }, 100);
    }
  }, [pendingExecuteCellId, state.servers, state.notebooks, state.activeNotebookId, updateCellServer, executeCell]);

  const handleResizeLeft = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftSidebarWidth;

    const onMouseMove = (e: MouseEvent) => {
      const newWidth = startWidth + (e.clientX - startX);
      setLeftSidebarWidth(Math.max(200, Math.min(400, newWidth)));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [leftSidebarWidth]);

  const handleResizeRight = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightSidebarWidth;

    const onMouseMove = (e: MouseEvent) => {
      const newWidth = startWidth - (e.clientX - startX);
      setRightSidebarWidth(Math.max(200, Math.min(400, newWidth)));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [rightSidebarWidth]);

  const handleResizeTableDetails = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = tableDetailsHeight;

    const onMouseMove = (e: MouseEvent) => {
      const newHeight = startHeight - (e.clientY - startY);
      setTableDetailsHeight(Math.max(150, Math.min(500, newHeight)));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [tableDetailsHeight]);

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <a href="https://gizmodata.com/gizmosql" target="_blank" rel="noopener noreferrer">
            <img src={gizmosqlLogo} alt="GizmoSQL" className="header-logo" />
          </a>
          <span className="header-title">GizmoSQL UI</span>
        </div>
        <div className="header-right">
          <button
            className="btn btn-ghost btn-icon theme-toggle"
            onClick={toggleTheme}
            title={`Switch to ${state.theme === 'light' ? 'dark' : 'light'} theme`}
          >
            {state.theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button
            className="btn btn-primary connect-btn"
            onClick={() => setShowAddServer(true)}
          >
            Connect to GizmoSQL Server
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="app-body">
        {/* Left sidebar */}
        <aside className="sidebar sidebar-left" style={{ width: leftSidebarWidth }}>
          <div className="sidebar-top">
            <NotebookExplorer />
            <ServerExplorer
              onAddServer={() => setShowAddServer(true)}
              onTableSelect={handleTableSelect}
            />
          </div>
          <div className="table-details-wrapper" style={{ height: tableDetailsHeight }}>
            <div className="vertical-resizer" onMouseDown={handleResizeTableDetails} />
            <TableDetails
              serverId={selectedTable?.serverId || null}
              catalog={selectedTable?.catalog || null}
              schema={selectedTable?.schema || null}
              tableName={selectedTable?.tableName || null}
            />
          </div>
          <div className="sidebar-resizer" onMouseDown={handleResizeLeft} />
        </aside>

        {/* Main area */}
        <main className="main-content">
          <NotebookView onCellSelect={setSelectedCell} onRequestConnection={handleRequestConnection} />
        </main>

        {/* Right sidebar */}
        <aside className="sidebar sidebar-right" style={{ width: rightSidebarWidth }}>
          <div className="sidebar-resizer left" onMouseDown={handleResizeRight} />
          <ResultSchema cell={selectedCell} />
        </aside>
      </div>

      {/* Add Server Dialog */}
      {showAddServer && (
        <AddServerDialog
          onClose={() => {
            setShowAddServer(false);
            setPendingExecuteCellId(null);
          }}
          onSuccess={handleServerConnected}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
