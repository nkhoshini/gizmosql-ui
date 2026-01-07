import { useState, useEffect, useCallback } from 'react';
import { api, TableInfo, SchemaInfo, ColumnInfo } from '../api';
import './SchemaTree.css';

interface SchemaTreeProps {
  onTableSelect: (catalog: string, schema: string, table: string) => void;
}

interface TreeNode {
  type: 'catalog' | 'schema' | 'table' | 'column';
  name: string;
  catalog?: string;
  schema?: string;
  table?: string;
  dataType?: string;
  tableType?: string;
  isExpanded?: boolean;
  children?: TreeNode[];
  isLoading?: boolean;
}

export function SchemaTree({ onTableSelect }: SchemaTreeProps) {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCatalogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const catalogs = await api.getCatalogs();
      // Filter out system and temp catalogs
      const filteredCatalogs = catalogs.filter(
        (catalog) => catalog !== 'system' && catalog !== 'temp'
      );
      setNodes(
        filteredCatalogs.map((catalog) => ({
          type: 'catalog' as const,
          name: catalog,
          isExpanded: false,
          children: [],
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load catalogs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  const loadSchemas = async (catalogNode: TreeNode) => {
    try {
      const schemas = await api.getSchemas(catalogNode.name);
      return schemas.map((s: SchemaInfo) => ({
        type: 'schema' as const,
        name: s.schema,
        catalog: catalogNode.name,
        isExpanded: false,
        children: [],
      }));
    } catch {
      return [];
    }
  };

  const loadTables = async (schemaNode: TreeNode) => {
    try {
      const tables = await api.getTables(schemaNode.catalog, schemaNode.name);
      return tables.map((t: TableInfo) => ({
        type: 'table' as const,
        name: t.name,
        catalog: schemaNode.catalog,
        schema: schemaNode.name,
        tableType: t.type,
        isExpanded: false,
        children: [],
      }));
    } catch {
      return [];
    }
  };

  const loadColumns = async (tableNode: TreeNode) => {
    try {
      const columns = await api.getColumns(
        tableNode.catalog,
        tableNode.schema,
        tableNode.name
      );
      return columns.map((c: ColumnInfo) => ({
        type: 'column' as const,
        name: c.name,
        dataType: c.type,
        catalog: tableNode.catalog,
        schema: tableNode.schema,
        table: tableNode.name,
      }));
    } catch {
      return [];
    }
  };

  const toggleNode = async (path: number[]) => {
    const updateNodes = async (
      nodes: TreeNode[],
      pathIndex: number
    ): Promise<TreeNode[]> => {
      return Promise.all(
        nodes.map(async (node, idx) => {
          if (idx === path[pathIndex]) {
            if (pathIndex === path.length - 1) {
              // This is the target node
              const newExpanded = !node.isExpanded;

              if (newExpanded && (!node.children || node.children.length === 0)) {
                // Load children
                node.isLoading = true;
                setNodes([...nodes]);

                let children: TreeNode[] = [];
                if (node.type === 'catalog') {
                  children = await loadSchemas(node);
                } else if (node.type === 'schema') {
                  children = await loadTables(node);
                } else if (node.type === 'table') {
                  children = await loadColumns(node);
                }

                return {
                  ...node,
                  isExpanded: newExpanded,
                  isLoading: false,
                  children,
                };
              }

              return { ...node, isExpanded: newExpanded };
            } else {
              // Recurse into children
              return {
                ...node,
                children: await updateNodes(node.children || [], pathIndex + 1),
              };
            }
          }
          return node;
        })
      );
    };

    const updatedNodes = await updateNodes(nodes, 0);
    setNodes(updatedNodes);
  };

  const handleTableClick = (node: TreeNode) => {
    if (node.type === 'table' && node.catalog && node.schema) {
      onTableSelect(node.catalog, node.schema, node.name);
    }
  };

  const renderNode = (node: TreeNode, path: number[], level: number) => {
    const hasChildren = node.type !== 'column';
    const isExpandable = hasChildren;

    const getIcon = () => {
      switch (node.type) {
        case 'catalog':
          return '🗄️';
        case 'schema':
          return '📁';
        case 'table':
          return node.tableType === 'VIEW' ? '👁️' : '📋';
        case 'column':
          return '•';
        default:
          return '📄';
      }
    };

    return (
      <div key={path.join('-')} className="tree-node">
        <div
          className={`tree-node-content ${node.type} ${
            node.type === 'table' ? 'clickable' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => {
            if (isExpandable) {
              toggleNode(path);
            }
            if (node.type === 'table') {
              handleTableClick(node);
            }
          }}
        >
          {isExpandable && (
            <span className={`expand-icon ${node.isExpanded ? 'expanded' : ''}`}>
              {node.isLoading ? (
                <span className="loading-spinner">⟳</span>
              ) : (
                '▶'
              )}
            </span>
          )}
          <span className="node-icon">{getIcon()}</span>
          <span className="node-name">{node.name}</span>
          {node.type === 'column' && node.dataType && (
            <span className="node-type">{node.dataType}</span>
          )}
          {node.type === 'table' && node.tableType === 'VIEW' && (
            <span className="node-badge">VIEW</span>
          )}
        </div>
        {node.isExpanded && node.children && (
          <div className="tree-children">
            {node.children.map((child, idx) =>
              renderNode(child, [...path, idx], level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="schema-tree">
      <div className="schema-tree-header">
        <span className="schema-tree-title">Schema Browser</span>
        <button
          className="refresh-button"
          onClick={loadCatalogs}
          title="Refresh"
        >
          ⟳
        </button>
      </div>

      <div className="schema-tree-content">
        {isLoading && (
          <div className="tree-loading">Loading schemas...</div>
        )}
        {error && <div className="tree-error">{error}</div>}
        {!isLoading && !error && nodes.length === 0 && (
          <div className="tree-empty">No catalogs found</div>
        )}
        {!isLoading &&
          !error &&
          nodes.map((node, idx) => renderNode(node, [idx], 0))}
      </div>
    </div>
  );
}
