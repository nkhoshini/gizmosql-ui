import { ServerConnection } from '../types';
import './ServerSelectModal.css';

interface ServerSelectModalProps {
  servers: ServerConnection[];
  onSelect: (serverId: string) => void;
  onCancel: () => void;
}

export function ServerSelectModal({ servers, onSelect, onCancel }: ServerSelectModalProps) {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div className="server-select-overlay" onClick={handleBackdropClick}>
      <div className="server-select-modal">
        <div className="server-select-header">
          <h3>Select a Server</h3>
          <p>Choose which server to run this query on:</p>
        </div>
        <div className="server-select-list">
          {servers.map(server => (
            <button
              key={server.id}
              className="server-select-item"
              onClick={() => onSelect(server.id)}
            >
              <span className="server-select-dot" data-status={server.status}></span>
              <span className="server-select-name">{server.name}</span>
              <span className="server-select-host">{server.host}:{server.port}</span>
            </button>
          ))}
        </div>
        <div className="server-select-footer">
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
