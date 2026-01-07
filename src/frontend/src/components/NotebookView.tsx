import { useState, useCallback, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Cell } from './Cell';
import { Cell as CellType } from '../types';
import './NotebookView.css';

interface NotebookViewProps {
  onCellSelect: (cell: CellType | null) => void;
  onRequestConnection?: (cellId: string) => void;
}

export function NotebookView({ onCellSelect, onRequestConnection }: NotebookViewProps) {
  const { state, addCell, createNotebook, renameNotebook } = useApp();
  const [activeCellId, setActiveCellId] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const activeNotebook = state.notebooks.find(n => n.id === state.activeNotebookId);

  const handleCellActivate = useCallback((cell: CellType) => {
    setActiveCellId(cell.id);
    onCellSelect(cell);
  }, [onCellSelect]);

  const handleAddCell = useCallback((afterCellId?: string) => {
    if (activeNotebook) {
      const newCell = addCell(activeNotebook.id, afterCellId);
      setActiveCellId(newCell.id);
      onCellSelect(newCell);
    }
  }, [activeNotebook, addCell, onCellSelect]);

  const startEditingName = () => {
    if (activeNotebook) {
      setEditingName(activeNotebook.name);
      setIsEditingName(true);
    }
  };

  const saveNotebookName = () => {
    if (activeNotebook && editingName.trim()) {
      renameNotebook(activeNotebook.id, editingName.trim());
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveNotebookName();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
    }
  };

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Create initial notebook if none exists
  if (state.notebooks.length === 0) {
    return (
      <div className="notebook-view empty">
        <div className="empty-notebook-prompt">
          <h2>Welcome to GizmoSQL UI</h2>
          <p>Create a notebook to start writing SQL queries</p>
          <button className="btn btn-primary" onClick={() => createNotebook()}>
            Create Notebook
          </button>
        </div>
      </div>
    );
  }

  if (!activeNotebook) {
    return (
      <div className="notebook-view empty">
        <p>Select a notebook from the sidebar</p>
      </div>
    );
  }

  return (
    <div className="notebook-view">
      <div className="notebook-header">
        {isEditingName ? (
          <input
            ref={nameInputRef}
            type="text"
            className="notebook-title-input"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onBlur={saveNotebookName}
            onKeyDown={handleNameKeyDown}
          />
        ) : (
          <>
            <h1 className="notebook-title">{activeNotebook.name}</h1>
            <button
              className="btn btn-ghost btn-icon edit-name-btn"
              onClick={startEditingName}
              title="Edit notebook name"
            >
              ✎
            </button>
          </>
        )}
      </div>

      <div className="notebook-cells">
        {activeNotebook.cells.map((cell) => (
          <Cell
            key={cell.id}
            notebookId={activeNotebook.id}
            cell={cell}
            isActive={cell.id === activeCellId}
            onActivate={() => handleCellActivate(cell)}
            onAddCellBelow={() => handleAddCell(cell.id)}
            onRequestConnection={onRequestConnection}
          />
        ))}

        {/* Add Cell button immediately after the last cell */}
        <button
          className="btn btn-ghost add-cell-bottom"
          onClick={() => handleAddCell()}
        >
          + Add Cell
        </button>
      </div>
    </div>
  );
}
