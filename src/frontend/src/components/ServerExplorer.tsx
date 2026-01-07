import { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { ServerConnection } from '../types';
import { VscFolder, VscTable, VscEye } from 'react-icons/vsc';
import { Database, Server, Lock, LockOpen } from 'lucide-react';
import './ServerExplorer.css';

interface TreeNode {
  type: 'server' | 'catalog' | 'schema' | 'table';
  name: string;
  serverId: string;
  catalog?: string;
  schema?: string;
  tableType?: string;
  children?: TreeNode[];
  isExpanded?: boolean;
  isLoading?: boolean;
}

interface ServerExplorerProps {
  onAddServer: () => void;
  onTableSelect?: (serverId: string, catalog: string, schema: string, table: string) => void;
}

export function ServerExplorer({ onAddServer, onTableSelect }: ServerExplorerProps) {
  const { state, disconnectServer, getServerCatalogs, getServerSchemas, getServerTables } = useApp();
  // Store tree state per server
  const [serverTrees, setServerTrees] = useState<Record<string, TreeNode>>({});

  const toggleNode = useCallback(async (
    serverId: string,
    path: string[], // path to the node, e.g., ['catalog1', 'schema1']
    node: TreeNode
  ) => {
    const updateTree = (tree: TreeNode, pathIndex: number): TreeNode => {
      // If we're at the target node
      if (pathIndex === path.length) {
        // Toggle expansion
        if (node.isExpanded) {
          return { ...tree, isExpanded: false };
        }
        // Need to load children
        return { ...tree, isLoading: true };
      }

      // Navigate to the correct child
      if (!tree.children) return tree;
      const childName = path[pathIndex];
      return {
        ...tree,
        children: tree.children.map(child =>
          child.name === childName ? updateTree(child, pathIndex + 1) : child
        ),
      };
    };

    // If collapsing, just toggle
    if (node.isExpanded) {
      setServerTrees(prev => ({
        ...prev,
        [serverId]: updateTree(prev[serverId] || { type: 'server', name: '', serverId, isExpanded: true }, 0),
      }));
      return;
    }

    // Set loading state
    setServerTrees(prev => ({
      ...prev,
      [serverId]: updateTree(prev[serverId] || { type: 'server', name: '', serverId }, 0),
    }));

    try {
      let children: TreeNode[] = [];

      if (node.type === 'server') {
        console.log('Fetching catalogs for server:', serverId);
        const catalogs = await getServerCatalogs(serverId);
        console.log('Received catalogs:', catalogs);
        // Filter out system and temp catalogs
        const filteredCatalogs = catalogs.filter(
          cat => cat !== 'system' && cat !== 'temp'
        );
        children = filteredCatalogs.map(cat => ({
          type: 'catalog' as const,
          name: cat,
          serverId,
          catalog: cat,
        }));
      } else if (node.type === 'catalog') {
        console.log('Fetching schemas for catalog:', node.catalog);
        const schemas = await getServerSchemas(serverId, node.catalog);
        console.log('Received schemas:', schemas);
        children = schemas.map(s => ({
          type: 'schema' as const,
          name: s.schema,
          serverId,
          catalog: s.catalog,
          schema: s.schema,
        }));
      } else if (node.type === 'schema') {
        console.log('Fetching tables for schema:', node.schema);
        const tables = await getServerTables(serverId, node.catalog, node.schema);
        console.log('Received tables:', tables);
        children = tables.map(t => ({
          type: 'table' as const,
          name: t.name,
          serverId,
          catalog: t.catalog,
          schema: t.schema,
          tableType: t.type,
        }));
      }

      // Update tree with children
      const updateWithChildren = (tree: TreeNode, pathIndex: number): TreeNode => {
        if (pathIndex === path.length) {
          return { ...tree, children, isExpanded: true, isLoading: false };
        }
        if (!tree.children) return tree;
        const childName = path[pathIndex];
        return {
          ...tree,
          children: tree.children.map(child =>
            child.name === childName ? updateWithChildren(child, pathIndex + 1) : child
          ),
        };
      };

      setServerTrees(prev => ({
        ...prev,
        [serverId]: updateWithChildren(
          prev[serverId] || { type: 'server', name: '', serverId },
          0
        ),
      }));
    } catch (error) {
      console.error('Failed to load children:', error);
      // Clear loading state
      const clearLoading = (tree: TreeNode, pathIndex: number): TreeNode => {
        if (pathIndex === path.length) {
          return { ...tree, isLoading: false, isExpanded: true, children: [] };
        }
        if (!tree.children) return tree;
        const childName = path[pathIndex];
        return {
          ...tree,
          children: tree.children.map(child =>
            child.name === childName ? clearLoading(child, pathIndex + 1) : child
          ),
        };
      };
      setServerTrees(prev => ({
        ...prev,
        [serverId]: clearLoading(prev[serverId] || { type: 'server', name: '', serverId }, 0),
      }));
    }
  }, [getServerCatalogs, getServerSchemas, getServerTables]);

  const handleTableClick = (node: TreeNode) => {
    if (node.type === 'table' && node.catalog && node.schema && onTableSelect) {
      onTableSelect(node.serverId, node.catalog, node.schema, node.name);
    }
  };

  const handleDisconnect = async (server: ServerConnection, e: React.MouseEvent) => {
    e.stopPropagation();
    await disconnectServer(server.id);
    // Clean up tree state
    setServerTrees(prev => {
      const next = { ...prev };
      delete next[server.id];
      return next;
    });
  };

  const renderNode = (node: TreeNode, level: number, path: string[]) => {
    const hasChildren = node.type !== 'table';
    const isExpanded = node.isExpanded || false;
    const isLoading = node.isLoading || false;
    const children = node.children || [];

    const getIcon = () => {
      switch (node.type) {
        case 'server': return <Server className="node-icon-svg icon-server" size={16} />;
        case 'catalog': return <Database className="node-icon-svg icon-catalog" size={16} />;
        case 'schema': return <VscFolder className="node-icon-svg icon-schema" />;
        case 'table': return node.tableType === 'VIEW'
          ? <VscEye className="node-icon-svg icon-view" />
          : <VscTable className="node-icon-svg icon-table" />;
        default: return <VscTable className="node-icon-svg" />;
      }
    };

    const nodePath = node.type === 'server' ? [] : [...path, node.name];

    return (
      <div key={`${node.type}-${node.name}`} className="tree-node">
        <div
          className={`tree-node-content ${node.type} ${node.type === 'table' ? 'clickable' : ''}`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleNode(node.serverId, nodePath, node);
            }
            if (node.type === 'table') {
              handleTableClick(node);
            }
          }}
        >
          {hasChildren && (
            <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
              {isLoading ? <span className="loading-spinner">⟳</span> : '▶'}
            </span>
          )}
          <span className="node-icon">{getIcon()}</span>
          <span className="node-name">{node.name}</span>
          {node.type === 'table' && node.tableType === 'VIEW' && (
            <span className="node-badge">VIEW</span>
          )}
        </div>
        {isExpanded && children.length > 0 && (
          <div className="tree-children">
            {children.map(child => renderNode(child, level + 1, nodePath))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="server-explorer">
      <div className="explorer-header">
        <span className="explorer-title">Attached Servers</span>
        <button className="btn btn-ghost btn-icon" onClick={onAddServer} title="Add Server">
          +
        </button>
      </div>
      <div className="server-list">
        {state.servers.length === 0 ? (
          <div className="empty-state">
            <p>No servers attached</p>
            <button className="btn btn-primary btn-sm" onClick={onAddServer}>
              Add Server
            </button>
          </div>
        ) : (
          state.servers.map(server => {
            const tree = serverTrees[server.id] || {
              type: 'server' as const,
              name: server.name,
              serverId: server.id,
            };
            const isExpanded = tree.isExpanded || false;
            const isLoading = tree.isLoading || false;
            const children = tree.children || [];

            return (
              <div key={server.id} className="server-group">
                <div
                  className="server-item"
                  onClick={() => toggleNode(server.id, [], {
                    type: 'server',
                    name: server.name,
                    serverId: server.id,
                    isExpanded,
                    isLoading,
                    children,
                  })}
                >
                  <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
                    {isLoading ? <span className="loading-spinner">⟳</span> : '▶'}
                  </span>
                  <Server className="node-icon-svg icon-server" size={16} />
                  {/* TLS status icon */}
                  {server.useTls ? (
                    <span title={server.skipTlsVerify ? 'TLS enabled (certificate not verified)' : 'TLS enabled (certificate verified)'}>
                      <Lock
                        className={`tls-icon ${server.skipTlsVerify ? 'tls-warning' : 'tls-secure'}`}
                        size={12}
                      />
                    </span>
                  ) : (
                    <span title="Connection is not encrypted (insecure)">
                      <LockOpen
                        className="tls-icon tls-insecure"
                        size={12}
                      />
                    </span>
                  )}
                  <span className="server-status-dot" data-status={server.status}></span>
                  <span className="server-name">{server.name}</span>
                  <button
                    className="server-disconnect btn btn-ghost btn-icon"
                    onClick={e => handleDisconnect(server, e)}
                    title="Disconnect"
                  >
                    ×
                  </button>
                </div>
                {isExpanded && (
                  <div className="server-children">
                    {children.map(node => renderNode(node, 1, []))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
