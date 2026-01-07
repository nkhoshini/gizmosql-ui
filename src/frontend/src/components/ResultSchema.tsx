import { Cell } from '../types';
import './ResultSchema.css';

interface ResultSchemaProps {
  cell: Cell | null;
}

export function ResultSchema({ cell }: ResultSchemaProps) {
  if (!cell || !cell.result) {
    return (
      <div className="result-schema empty">
        <p>Run a query to see the result schema</p>
      </div>
    );
  }

  const { columns, rowCount } = cell.result;

  // Get type icon
  const getTypeIcon = (type: string): string => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('int') || lowerType.includes('decimal') || lowerType.includes('float') || lowerType.includes('double') || lowerType.includes('numeric')) {
      return '123';
    }
    if (lowerType.includes('varchar') || lowerType.includes('char') || lowerType.includes('text') || lowerType.includes('string')) {
      return 'T';
    }
    if (lowerType.includes('date') || lowerType.includes('time') || lowerType.includes('timestamp')) {
      return '📅';
    }
    if (lowerType.includes('bool')) {
      return '✓';
    }
    if (lowerType.includes('blob') || lowerType.includes('binary')) {
      return '📦';
    }
    if (lowerType.includes('json') || lowerType.includes('struct') || lowerType.includes('map')) {
      return '{}';
    }
    if (lowerType.includes('array') || lowerType.includes('list')) {
      return '[]';
    }
    return '?';
  };

  // Get type color
  const getTypeColor = (type: string): string => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('int') || lowerType.includes('decimal') || lowerType.includes('float') || lowerType.includes('double') || lowerType.includes('numeric')) {
      return 'type-number';
    }
    if (lowerType.includes('varchar') || lowerType.includes('char') || lowerType.includes('text') || lowerType.includes('string')) {
      return 'type-string';
    }
    if (lowerType.includes('date') || lowerType.includes('time') || lowerType.includes('timestamp')) {
      return 'type-date';
    }
    if (lowerType.includes('bool')) {
      return 'type-bool';
    }
    return 'type-other';
  };

  return (
    <div className="result-schema">
      <div className="schema-header">
        <div className="schema-stats">
          <span className="stat-value">{rowCount}</span>
          <span className="stat-label">Rows</span>
        </div>
        <div className="schema-stats">
          <span className="stat-value">{columns.length}</span>
          <span className="stat-label">Columns</span>
        </div>
      </div>

      <div className="schema-columns">
        <div className="columns-header">
          <span>Columns</span>
        </div>
        <div className="columns-list">
          {columns.map((col, idx) => (
            <div key={idx} className="column-item">
              <span className={`type-icon ${getTypeColor(col.type)}`}>
                {getTypeIcon(col.type)}
              </span>
              <div className="column-info">
                <span className="column-name">{col.name}</span>
                <span className="column-type">{col.type}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
