import { useState } from 'react';
import { useApp } from '../context/AppContext';
import './NotebookExplorer.css';

export function NotebookExplorer() {
  const { state, createNotebook, deleteNotebook, renameNotebook, setActiveNotebook } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = () => {
    createNotebook();
  };

  const handleStartRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const handleFinishRename = (id: string) => {
    if (editName.trim()) {
      renameNotebook(id, editName.trim());
    }
    setEditingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (state.notebooks.length > 1) {
      deleteNotebook(id);
    }
  };

  return (
    <div className="notebook-explorer">
      <div className="explorer-header">
        <span className="explorer-title">Notebooks</span>
        <button className="btn btn-ghost btn-icon" onClick={handleCreate} title="New Notebook">
          +
        </button>
      </div>
      <div className="notebook-list">
        {state.notebooks.map(notebook => (
          <div
            key={notebook.id}
            className={`notebook-item ${notebook.id === state.activeNotebookId ? 'active' : ''}`}
            onClick={() => setActiveNotebook(notebook.id)}
          >
            <span className="notebook-icon">📓</span>
            {editingId === notebook.id ? (
              <input
                type="text"
                className="notebook-name-input"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={() => handleFinishRename(notebook.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleFinishRename(notebook.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                autoFocus
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span
                className="notebook-name"
                onDoubleClick={() => handleStartRename(notebook.id, notebook.name)}
              >
                {notebook.name}
              </span>
            )}
            {state.notebooks.length > 1 && (
              <button
                className="notebook-delete btn btn-ghost btn-icon"
                onClick={e => handleDelete(notebook.id, e)}
                title="Delete Notebook"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
