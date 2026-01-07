import { useState, FormEvent } from 'react';
import { useApp } from '../context/AppContext';
import gizmosqlLogo from '../assets/gizmosql-logo.png';
import './AddServerDialog.css';

interface AddServerDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AddServerDialog({ onClose, onSuccess }: AddServerDialogProps) {
  const { connectServer } = useApp();
  const [name, setName] = useState('');
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState(31337);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [useTls, setUseTls] = useState(true);
  const [skipTlsVerify, setSkipTlsVerify] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    setError(null);

    try {
      await connectServer(
        {
          host,
          port,
          username: username || undefined,
          password: password || undefined,
          useTls,
          skipTlsVerify,
        },
        name || `${host}:${port}`
      );
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="dialog-overlay" onMouseDown={handleBackdropClick}>
      <div className="dialog" onMouseDown={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <img src={gizmosqlLogo} alt="GizmoSQL" className="dialog-logo" />
          <h2>Add GizmoSQL Server</h2>
          <button className="dialog-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="dialog-form">
          {error && (
            <div className="dialog-error">
              <span className="error-icon">⚠</span>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name">Display Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My GizmoSQL Server (optional)"
            />
          </div>

          <div className="form-row">
            <div className="form-group flex-2">
              <label htmlFor="host">Host</label>
              <input
                type="text"
                id="host"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="localhost"
                required
              />
            </div>
            <div className="form-group flex-1">
              <label htmlFor="port">Port</label>
              <input
                type="number"
                id="port"
                value={port}
                onChange={(e) => setPort(parseInt(e.target.value) || 31337)}
                placeholder="31337"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label htmlFor="username">Username <span className="required">*</span></label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
              />
            </div>
            <div className="form-group flex-1">
              <label htmlFor="password">Password <span className="required">*</span></label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>
          </div>

          <div className="form-row checkbox-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={useTls}
                onChange={(e) => setUseTls(e.target.checked)}
              />
              <span>Use TLS</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={skipTlsVerify}
                onChange={(e) => setSkipTlsVerify(e.target.checked)}
                disabled={!useTls}
              />
              <span>Skip TLS Verification</span>
            </label>
          </div>

          <div className="dialog-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isConnecting || !host || !username || !password}
            >
              {isConnecting ? (
                <>
                  <span className="spinner"></span>
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
