import { useState, FormEvent } from 'react';
import { api } from '../api';
import gizmosqlLogo from '../assets/gizmosql-logo.png';
import gizmodataLogo from '../assets/gizmodata-logo.png';
import './ConnectionDialog.css';

interface ConnectionDialogProps {
  onConnect: (host: string, port: number) => void;
}

export function ConnectionDialog({ onConnect }: ConnectionDialogProps) {
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
      await api.connect({
        host,
        port,
        username: username || undefined,
        password: password || undefined,
        useTls,
        skipTlsVerify,
      });
      onConnect(host, port);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="connection-dialog-overlay">
      <div className="connection-dialog">
        <div className="connection-dialog-header">
          <img src={gizmosqlLogo} alt="GizmoSQL" className="dialog-logo" />
          <h1>GizmoSQL UI</h1>
          <p className="dialog-subtitle">Connect to your GizmoSQL server</p>
        </div>

        <form onSubmit={handleSubmit} className="connection-form">
          {error && (
            <div className="connection-error">
              <span className="error-icon">&#x26A0;</span>
              {error}
            </div>
          )}

          <div className="form-row">
            <div className="form-group flex-2">
              <label htmlFor="host">Host / URI</label>
              <input
                type="text"
                id="host"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="localhost or server.example.com"
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
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="form-group flex-1">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Optional"
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
              <span className="checkbox-text">Use TLS</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={skipTlsVerify}
                onChange={(e) => setSkipTlsVerify(e.target.checked)}
                disabled={!useTls}
              />
              <span className="checkbox-text">Skip TLS Verification</span>
            </label>
          </div>

          <button
            type="submit"
            className="connect-button"
            disabled={isConnecting || !host}
          >
            {isConnecting ? (
              <>
                <span className="spinner"></span>
                Connecting...
              </>
            ) : (
              'Connect to GizmoSQL'
            )}
          </button>
        </form>

        <div className="connection-dialog-footer">
          <span>Powered by</span>
          <img src={gizmodataLogo} alt="GizmoData" className="footer-logo" />
        </div>
      </div>
    </div>
  );
}
