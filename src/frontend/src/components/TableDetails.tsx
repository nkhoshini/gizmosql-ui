import { useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useApp } from '../context/AppContext';
import './TableDetails.css';

interface TableDetailsProps {
  serverId: string | null;
  catalog: string | null;
  schema: string | null;
  tableName: string | null;
}

interface ColumnSummary {
  column_name: string;
  column_type: string;
  min: string | null;
  max: string | null;
  approx_unique: number | null;
  avg: string | null;
  std: string | null;
  q25: string | null;
  q50: string | null;
  q75: string | null;
  count: number | null;
  null_percentage: string | null;
}

interface PreviewData {
  columns: Array<{ name: string; type: string }>;
  rows: Array<Record<string, unknown>>;
}

type TabType = 'summary' | 'preview' | 'definition';
type SortType = 'original' | 'type' | 'name';

export function TableDetails({ serverId, catalog, schema, tableName }: TableDetailsProps) {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState<ColumnSummary[]>([]);
  const [rowCount, setRowCount] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [ddl, setDdl] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [sortBy, setSortBy] = useState<SortType>('original');
  const [showTypes, setShowTypes] = useState(true);
  const [showDistributions, setShowDistributions] = useState(true);

  const server = serverId ? state.servers.find(s => s.id === serverId) : null;

  // Escape SQL string values
  const escapeString = (str: string): string => {
    return str.replace(/'/g, "''");
  };

  // Fetch table summary
  const fetchSummary = useCallback(async () => {
    if (!server || !catalog || !schema || !tableName) return;

    setLoading(true);
    setError(null);

    try {
      const quotedTable = `"${catalog}"."${schema}"."${tableName}"`;
      const sql = `SUMMARIZE ${quotedTable}`;

      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': server.sessionId,
        },
        body: JSON.stringify({ sessionId: server.sessionId, sql }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch table summary');
      }

      const data = await response.json();

      const summaries: ColumnSummary[] = data.rows.map((row: Record<string, unknown>) => ({
        column_name: row.column_name as string,
        column_type: normalizeType(row.column_type as string),
        min: row.min as string | null,
        max: row.max as string | null,
        approx_unique: row.approx_unique as number | null,
        avg: row.avg as string | null,
        std: row.std as string | null,
        q25: row.q25 as string | null,
        q50: row.q50 as string | null,
        q75: row.q75 as string | null,
        count: row.count as number | null,
        null_percentage: row.null_percentage as string | null,
      }));

      setColumns(summaries);
      if (summaries.length > 0 && summaries[0].count !== null) {
        setRowCount(summaries[0].count);
      }
    } catch (err) {
      console.error('Failed to fetch table summary:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch summary');
    } finally {
      setLoading(false);
    }
  }, [server, catalog, schema, tableName]);

  // Fetch preview data
  const fetchPreview = useCallback(async () => {
    if (!server || !catalog || !schema || !tableName) return;

    setLoading(true);
    setError(null);

    try {
      const quotedTable = `"${catalog}"."${schema}"."${tableName}"`;
      const sql = `SELECT * FROM ${quotedTable} LIMIT 100`;

      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': server.sessionId,
        },
        body: JSON.stringify({ sessionId: server.sessionId, sql }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch preview');
      }

      const data = await response.json();
      setPreviewData({
        columns: data.columns,
        rows: data.rows,
      });
    } catch (err) {
      console.error('Failed to fetch preview:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch preview');
    } finally {
      setLoading(false);
    }
  }, [server, catalog, schema, tableName]);

  // Fetch DDL
  const fetchDDL = useCallback(async () => {
    if (!server || !catalog || !schema || !tableName) return;

    setLoading(true);
    setError(null);

    try {
      const sql = `SELECT sql FROM duckdb_tables() WHERE database_name = '${escapeString(catalog)}' AND schema_name = '${escapeString(schema)}' AND table_name = '${escapeString(tableName)}'`;

      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': server.sessionId,
        },
        body: JSON.stringify({ sessionId: server.sessionId, sql }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch DDL');
      }

      const data = await response.json();
      if (data.rows.length > 0 && data.rows[0].sql) {
        setDdl(data.rows[0].sql as string);
      } else {
        setDdl(null);
      }
    } catch (err) {
      console.error('Failed to fetch DDL:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch DDL');
    } finally {
      setLoading(false);
    }
  }, [server, catalog, schema, tableName]);

  // Load data when table changes or tab changes
  useEffect(() => {
    if (!serverId || !catalog || !schema || !tableName) {
      setColumns([]);
      setRowCount(null);
      setPreviewData(null);
      setDdl(null);
      return;
    }

    if (activeTab === 'summary') {
      fetchSummary();
    } else if (activeTab === 'preview') {
      if (!previewData) fetchPreview();
    } else if (activeTab === 'definition') {
      if (!ddl) fetchDDL();
    }
  }, [serverId, catalog, schema, tableName, activeTab, fetchSummary, fetchPreview, fetchDDL, previewData, ddl]);

  // Reset data when table changes
  useEffect(() => {
    setPreviewData(null);
    setDdl(null);
    setActiveTab('summary');
  }, [serverId, catalog, schema, tableName]);

  // Normalize type names
  const normalizeType = (type: string): string => {
    const typeMap: Record<string, string> = {
      'Utf8': 'VARCHAR', 'utf8': 'VARCHAR', 'LargeUtf8': 'VARCHAR',
      'Int8': 'TINYINT', 'Int16': 'SMALLINT', 'Int32': 'INTEGER', 'Int64': 'BIGINT',
      'UInt8': 'UTINYINT', 'UInt16': 'USMALLINT', 'UInt32': 'UINTEGER', 'UInt64': 'UBIGINT',
      'Float32': 'FLOAT', 'Float64': 'DOUBLE', 'Boolean': 'BOOLEAN',
      'Date32': 'DATE', 'Date64': 'DATE', 'Timestamp': 'TIMESTAMP',
    };
    return typeMap[type] || type;
  };

  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '-';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getTypeIcon = (type: string): string => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('int') || lowerType.includes('decimal') || lowerType.includes('float') ||
        lowerType.includes('double') || lowerType.includes('numeric')) return '123';
    if (lowerType.includes('varchar') || lowerType.includes('char') || lowerType.includes('text') ||
        lowerType.includes('string')) return 'T';
    if (lowerType.includes('date') || lowerType.includes('time') || lowerType.includes('timestamp')) return 'D';
    if (lowerType.includes('bool')) return 'B';
    return '?';
  };

  const getTypeClass = (type: string): string => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('int') || lowerType.includes('decimal') || lowerType.includes('float') ||
        lowerType.includes('double') || lowerType.includes('numeric')) return 'type-number';
    if (lowerType.includes('varchar') || lowerType.includes('char') || lowerType.includes('text') ||
        lowerType.includes('string')) return 'type-string';
    if (lowerType.includes('date') || lowerType.includes('time') || lowerType.includes('timestamp')) return 'type-date';
    if (lowerType.includes('bool')) return 'type-bool';
    return 'type-other';
  };

  const getSortedColumns = (): ColumnSummary[] => {
    const sorted = [...columns];
    if (sortBy === 'name') {
      sorted.sort((a, b) => a.column_name.localeCompare(b.column_name));
    } else if (sortBy === 'type') {
      sorted.sort((a, b) => a.column_type.localeCompare(b.column_type));
    }
    return sorted;
  };

  const copyDDL = () => {
    if (ddl) {
      navigator.clipboard.writeText(ddl);
    }
  };

  const copyColumnNames = () => {
    const names = columns.map(c => c.column_name).join(', ');
    navigator.clipboard.writeText(names);
  };

  const formatCellValue = (value: unknown): string => {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  if (!tableName) {
    return (
      <div className="table-details empty">
        <p>Select a table to view details</p>
      </div>
    );
  }

  return (
    <div className="table-details">
      <div className="table-details-header">
        <div className="table-details-title">
          <span className="table-icon">▦</span>
          <span className="table-name">{tableName}</span>
        </div>
        <div className="table-details-meta">
          {rowCount !== null && (
            <span className="table-row-count">{formatNumber(rowCount)} rows</span>
          )}
          <button
            className="btn btn-ghost btn-icon options-btn"
            onClick={() => setShowOptions(!showOptions)}
            title="Options"
          >
            ⋮
          </button>
        </div>

        {showOptions && (
          <div className="options-menu">
            <button onClick={() => { fetchSummary(); setShowOptions(false); }}>
              ↻ Refresh table summary
            </button>
            <button onClick={() => { copyColumnNames(); setShowOptions(false); }}>
              📋 Copy column names to clipboard
            </button>
            <div className="options-divider" />
            <button onClick={() => setSortBy('original')} className={sortBy === 'original' ? 'active' : ''}>
              {sortBy === 'original' && '✓ '}Sort columns by original position
            </button>
            <button onClick={() => setSortBy('type')} className={sortBy === 'type' ? 'active' : ''}>
              {sortBy === 'type' && '✓ '}Sort columns by type
            </button>
            <button onClick={() => setSortBy('name')} className={sortBy === 'name' ? 'active' : ''}>
              {sortBy === 'name' && '✓ '}Sort columns by name
            </button>
            <div className="options-divider" />
            <button onClick={() => setShowTypes(!showTypes)}>
              {showTypes && '✓ '}Show types
            </button>
            <button onClick={() => setShowDistributions(!showDistributions)}>
              {showDistributions && '✓ '}Show distributions
            </button>
            <div className="options-divider" />
            <button onClick={() => setShowOptions(false)}>
              ✕ Close
            </button>
          </div>
        )}
      </div>

      <div className="table-details-tabs">
        <button
          className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          Summary
        </button>
        <button
          className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          Preview
        </button>
        <button
          className={`tab-btn ${activeTab === 'definition' ? 'active' : ''}`}
          onClick={() => setActiveTab('definition')}
        >
          Definition
        </button>
      </div>

      <div className="table-details-content">
        {loading && (
          <div className="table-details-loading">
            <span className="loading-spinner">⟳</span>
            Loading...
          </div>
        )}

        {error && (
          <div className="table-details-error">
            {error}
          </div>
        )}

        {!loading && !error && activeTab === 'summary' && (
          <div className="table-details-columns">
            {/* Column headers */}
            <div className="table-column-header">
              <span className="column-header-icon"></span>
              <span className="column-header-name">Column</span>
              {showTypes && (
                <span className="column-header-type">Type</span>
              )}
              {showDistributions && (
                <span className="column-header-stat">NDV</span>
              )}
            </div>
            {getSortedColumns().map((col, idx) => (
              <div key={idx} className="table-column-item">
                <span className={`column-type-icon ${getTypeClass(col.column_type)}`}>
                  {getTypeIcon(col.column_type)}
                </span>
                <span className="column-name">{col.column_name}</span>
                {showTypes && (
                  <span className="column-type-label">{col.column_type}</span>
                )}
                {showDistributions && (
                  <span className="column-stat">
                    {col.approx_unique !== null ? formatNumber(col.approx_unique) : '-'}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && !error && activeTab === 'preview' && previewData && (
          <div className="preview-table-container">
            <table className="preview-table">
              <thead>
                <tr>
                  {previewData.columns.map((col, idx) => (
                    <th key={idx}>
                      <span className={`column-type-icon small ${getTypeClass(col.type)}`}>
                        {getTypeIcon(col.type)}
                      </span>
                      {col.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.rows.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {previewData.columns.map((col, colIdx) => (
                      <td key={colIdx}>{formatCellValue(row[col.name])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="preview-footer">
              {previewData.columns.length} columns, {previewData.rows.length} rows shown
            </div>
          </div>
        )}

        {!loading && !error && activeTab === 'definition' && (
          <div className="ddl-container">
            {ddl ? (
              <>
                <div className="ddl-editor">
                  <Editor
                    height="100%"
                    defaultLanguage="sql"
                    value={ddl}
                    theme={state.theme === 'dark' ? 'vs-dark' : 'light'}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 12,
                      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                      lineNumbers: 'off',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      wordWrap: 'on',
                      padding: { top: 8, bottom: 8 },
                      renderLineHighlight: 'none',
                      scrollbar: { vertical: 'auto', horizontal: 'auto' },
                      overviewRulerLanes: 0,
                      hideCursorInOverviewRuler: true,
                      overviewRulerBorder: false,
                      folding: false,
                      glyphMargin: false,
                      lineDecorationsWidth: 0,
                      lineNumbersMinChars: 0,
                    }}
                  />
                </div>
                <div className="ddl-footer">
                  <button className="btn btn-secondary btn-sm" onClick={copyDDL}>
                    📋 Copy DDL
                  </button>
                </div>
              </>
            ) : (
              <div className="ddl-empty">No DDL available for this table</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
