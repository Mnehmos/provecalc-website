/**
 * WorksheetCanvas - SMath-style Free-Form Grid Paper Canvas
 *
 * Features:
 * - Engineering paper grid background
 * - Free-form node positioning with drag & drop
 * - Grid snapping (20px default)
 * - Right-click context menu for adding nodes
 * - Click anywhere to insert
 */

import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { useDocumentStore, type NodeType, createResultNode, getResultNodePosition } from '../stores/documentStore';
import { logger } from '../utils/logger';
import { NodeRenderer } from './nodes/NodeRenderer';
import { InlineCanvasInput } from './InlineCanvasInput';
import { useCompute } from '../hooks/useCompute';
import { MathDisplay } from './MathDisplay';
import { formatSymbolLatex } from './nodes/nodeShared';
import { getEquationSolveExpression } from '../utils/mathParsing';
import { buildContributingNodeIds, getEquationVariables, getKnownSymbolSet, normalizeSolveUnit } from '../utils/solveContext';
import { parseText } from '../utils/textToNodeParser';
import type { WorksheetNode, NodePosition, EquationNode, GivenNode, ResultNode } from '../types/document';

interface Point {
  x: number;
  y: number;
}

interface ContextMenu {
  position: Point;
  visible: boolean;
}

const GRID_SIZE = 40; // 40px grid - matches CSS grid-size

// Snap a value to the nearest grid point
function snapToGrid(value: number, gridSize: number = GRID_SIZE): number {
  return Math.round(value / gridSize) * gridSize;
}

export function WorksheetCanvas() {
  const { document, selectedNodeId, selectNode, updateNodePosition, addNode, insertNode, updateNode, deleteNode, duplicateNode, undo, redo, verifyNode, isVerifying, updateDocumentName } = useDocumentStore();
  const canvasRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Drag state
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenu>({
    position: { x: 0, y: 0 },
    visible: false,
  });

  // Insert cursor position and inline input state
  const [insertCursor, setInsertCursor] = useState<Point | null>(null);
  const [inlineInputActive, setInlineInputActive] = useState(false);

  // Dark mode toggle
  const [darkPaper, setDarkPaper] = useState(false);

  // Node context menu state (when right-clicking on a node)
  const [nodeContextMenu, setNodeContextMenu] = useState<{
    position: Point;
    visible: boolean;
    nodeId: string | null;
    nodeType: string | null;
  }>({
    position: { x: 0, y: 0 },
    visible: false,
    nodeId: null,
    nodeType: null,
  });

  // Compute hook for solving
  const { solve } = useCompute();

  // State for solve in progress
  const [isSolving, setIsSolving] = useState(false);

  // Notification state for solve feedback
  const [notification, setNotification] = useState<{
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    visible: boolean;
  }>({ message: '', type: 'info', visible: false });

  // Auto-hide notification after 5 seconds (restart timer on new message)
  useEffect(() => {
    if (notification.visible) {
      const timer = setTimeout(() => {
        setNotification(n => ({ ...n, visible: false }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification.visible, notification.message]);

  // State for editing worksheet title
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Get solvable variables for the context menu equation
  const solvableVariables = useMemo(() => {
    if (!nodeContextMenu.visible || nodeContextMenu.nodeType !== 'equation' || !nodeContextMenu.nodeId) {
      return [];
    }

    const equationNode = document?.nodes.find(n => n.id === nodeContextMenu.nodeId) as EquationNode | undefined;
    if (!equationNode) return [];

    const allVariables = getEquationVariables(equationNode);
    const knownSymbols = getKnownSymbolSet(document);

    // Solvable = variables that are NOT already defined as Givens
    // But also show defined ones (user might want to re-solve)
    return allVariables.map(v => ({
      symbol: v,
      isDefined: knownSymbols.has(v),
    }));
  }, [nodeContextMenu, document]);

  // Handle "Solve for X" from context menu
  const handleSolveFor = useCallback(async (targetSymbol: string) => {
    if (!nodeContextMenu.nodeId || !document) return;

    setIsSolving(true);
    setNodeContextMenu({ ...nodeContextMenu, visible: false });

    try {
      const selectedNode = document.nodes.find(n => n.id === nodeContextMenu.nodeId);
      const overrideEquations =
        selectedNode?.type === 'equation'
          ? [getEquationSolveExpression(selectedNode)]
          : undefined;
      const result = await solve(targetSymbol, 'auto', overrideEquations);

      if (result.error) {
        logger.error('action', 'SolveFor failed', { error: result.error });
        setNotification({
          message: `Solve failed: ${result.error}`,
          type: 'error',
          visible: true,
        });
        return;
      }

      // Track system analysis status for notification
      let systemWarning: { message: string; type: 'warning' | 'info' } | null = null;
      if (result.systemAnalysis) {
        const { status, message } = result.systemAnalysis;
        if (status === 'under_determined') {
          systemWarning = { message: `Warning: ${message}`, type: 'warning' };
        } else if (status === 'over_determined') {
          systemWarning = { message: `Note: ${message}`, type: 'info' };
        }
      }

      // Find the equation and input symbols for provenance
      const equationNode = document.nodes.find(n => n.id === nodeContextMenu.nodeId);
      const allVariables = equationNode && equationNode.type === 'equation'
        ? getEquationVariables(equationNode)
        : [];
      const contributingNodeIds = buildContributingNodeIds(
        document,
        equationNode?.id,
        allVariables,
        targetSymbol,
      );

      // Create a new Result node with the computed value
      const computedValue = result.numericResult;
      if (typeof computedValue !== 'number' || !Number.isFinite(computedValue)) {
        setNotification({
          message: `Solve returned no numeric value for ${targetSymbol}`,
          type: 'warning',
          visible: true,
        });
        return;
      }
      const cleanUnit = normalizeSolveUnit(result.unit);

      // Position the new node avoiding overlaps
      const equationPos = equationNode?.position || { x: 100, y: 100 };
      const resultPos = getResultNodePosition(equationPos, document);

      const solveGoalNode = document.nodes.find(n => n.type === 'solve_goal' && n.target_symbol === targetSymbol);
      const newResultNode = createResultNode(
        targetSymbol, computedValue, cleanUnit,
        solveGoalNode?.id || '', result.symbolicResult, resultPos
      );
      newResultNode.provenance = {
        type: 'computed',
        from_nodes: contributingNodeIds,
        timestamp: new Date().toISOString(),
      };

      await insertNode(newResultNode);

      // Show notification with result (include system warning if present)
      const formattedValue = result.numericResult != null
        ? result.numericResult.toFixed(6).replace(/\.?0+$/, '')
        : '?';
      const solveMessage = `Solved: ${targetSymbol} = ${formattedValue}${cleanUnit ? ` ${cleanUnit}` : ''}`.trim();

      if (systemWarning) {
        // Combine system warning with solve result
        setNotification({
          message: `${systemWarning.message} — ${solveMessage}`,
          type: systemWarning.type,
          visible: true,
        });
      } else {
        setNotification({
          message: solveMessage,
          type: 'success',
          visible: true,
        });
      }
    } catch (e) {
      logger.error('action', 'SolveFor exception', { error: String(e) });
      setNotification({
        message: `Error: ${String(e)}`,
        type: 'error',
        visible: true,
      });
    } finally {
      setIsSolving(false);
    }
  }, [nodeContextMenu, document, solve, insertNode]);

  // Handle node update with reactive cascade for computed dependencies
  const handleNodeUpdate = useCallback(async (nodeId: string, updates: Partial<WorksheetNode>) => {
    // 1. Update the node first
    updateNode(nodeId, updates);

    // 2. Check if this is a source Given (not computed)
    const updatedNode = document?.nodes.find(n => n.id === nodeId);
    if (!updatedNode || updatedNode.type !== 'given') return;
    if (updatedNode.provenance?.type === 'computed') return; // Don't cascade from computed nodes

    // 3. Find all computed nodes that depend on this node (result or legacy computed given)
    const dependentComputedNodes = document?.nodes.filter(
      (n): n is GivenNode | ResultNode =>
        (n.type === 'result' || n.type === 'given') &&
        n.provenance?.type === 'computed' &&
        !!n.provenance.from_nodes?.includes(nodeId),
    ) || [];

    if (dependentComputedNodes.length === 0) return;

    logger.info('action', 'Cascade: re-solving dependents', {
      sourceSymbol: (updatedNode as GivenNode).symbol,
      dependentCount: dependentComputedNodes.length
    });

    // 4. Re-solve each dependent computed node
    for (const computedNode of dependentComputedNodes) {
      try {
        const result = await solve(computedNode.symbol, 'auto');
        if (result.error) {
          logger.error('action', 'Cascade: Failed to re-solve', {
            symbol: computedNode.symbol,
            error: result.error
          });
          continue;
        }

        const newValue = result.numericResult;
        if (typeof newValue !== 'number' || !Number.isFinite(newValue)) {
          logger.warn('action', 'Cascade: No numeric value returned; skipping update', {
            symbol: computedNode.symbol,
          });
          continue;
        }
        const newUnit = normalizeSolveUnit(result.unit);

        // Update the computed node in place (including solution metadata)
        if (computedNode.type === 'given') {
          updateNode(computedNode.id, {
            value: {
              value: newValue,
              unit: newUnit ? { expression: newUnit } : undefined,
            },
            solutionSteps: result.steps,
            symbolicForm: result.symbolicResult,
          } as Partial<GivenNode>);
        } else {
          updateNode(computedNode.id, {
            value: {
              value: newValue,
              unit: newUnit ? { expression: newUnit } : undefined,
            },
            symbolic_form: result.symbolicResult,
          } as Partial<ResultNode>);
        }

        logger.info('action', 'Cascade: Updated computed node', {
          symbol: computedNode.symbol,
          value: newValue,
          unit: newUnit,
          hasSteps: !!result.steps?.length,
        });
      } catch (e) {
        logger.error('action', 'Cascade: Exception re-solving', {
          symbol: computedNode.symbol,
          error: String(e)
        });
      }
    }
  }, [document, updateNode, solve]);

  // Helper: Find nearest node in a direction
  const findNearestNode = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!document || !selectedNodeId) return null;
    const currentNode = document.nodes.find(n => n.id === selectedNodeId);
    if (!currentNode?.position) return null;

    const { x: cx, y: cy } = currentNode.position;
    let bestNode: WorksheetNode | null = null;
    let bestDistance = Infinity;

    for (const node of document.nodes) {
      if (node.id === selectedNodeId || !node.position) continue;
      const { x, y } = node.position;

      // Check if node is in the right direction
      const dx = x - cx;
      const dy = y - cy;

      let isInDirection = false;
      switch (direction) {
        case 'up': isInDirection = dy < -10; break;
        case 'down': isInDirection = dy > 10; break;
        case 'left': isInDirection = dx < -10; break;
        case 'right': isInDirection = dx > 10; break;
      }

      if (!isInDirection) continue;

      // Calculate distance (prefer nodes more directly in line)
      const primaryDist = direction === 'up' || direction === 'down' ? Math.abs(dy) : Math.abs(dx);
      const secondaryDist = direction === 'up' || direction === 'down' ? Math.abs(dx) : Math.abs(dy);
      const distance = primaryDist + secondaryDist * 0.5;

      if (distance < bestDistance) {
        bestDistance = distance;
        bestNode = node;
      }
    }

    return bestNode;
  }, [document, selectedNodeId]);

  // Keyboard shortcuts: Undo, Redo, Delete, Arrow navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      // Arrow keys: Navigate between nodes or move selected node
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const direction = e.key.replace('Arrow', '').toLowerCase() as 'up' | 'down' | 'left' | 'right';

        if (e.ctrlKey && selectedNodeId && document) {
          // Ctrl+Arrow: Move selected node by grid step
          const node = document.nodes.find(n => n.id === selectedNodeId);
          if (node?.position) {
            const delta = { x: 0, y: 0 };
            switch (direction) {
              case 'up': delta.y = -GRID_SIZE; break;
              case 'down': delta.y = GRID_SIZE; break;
              case 'left': delta.x = -GRID_SIZE; break;
              case 'right': delta.x = GRID_SIZE; break;
            }
            updateNodePosition(selectedNodeId, {
              x: Math.max(0, node.position.x + delta.x),
              y: Math.max(0, node.position.y + delta.y),
            });
          }
        } else if (selectedNodeId) {
          // Arrow: Navigate to adjacent node
          const nearestNode = findNearestNode(direction);
          if (nearestNode) {
            selectNode(nearestNode.id);
          }
        } else if (document?.nodes.length) {
          // No selection: Select first node
          selectNode(document.nodes[0].id);
        }
        return;
      }

      // Tab: Cycle through nodes
      if (e.key === 'Tab' && document?.nodes.length) {
        e.preventDefault();
        const currentIndex = selectedNodeId
          ? document.nodes.findIndex(n => n.id === selectedNodeId)
          : -1;
        const nextIndex = e.shiftKey
          ? (currentIndex - 1 + document.nodes.length) % document.nodes.length
          : (currentIndex + 1) % document.nodes.length;
        selectNode(document.nodes[nextIndex].id);
        return;
      }

      // Undo: Ctrl+Z
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Redo: Ctrl+Y or Ctrl+Shift+Z
      else if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'Z')) {
        e.preventDefault();
        redo();
      }
      // Delete: Delete or Backspace
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        e.preventDefault();
        deleteNode(selectedNodeId);
      }
      // Duplicate: Ctrl+D
      else if (e.ctrlKey && e.key === 'd' && selectedNodeId) {
        e.preventDefault();
        duplicateNode(selectedNodeId);
      }
      // Escape: Deselect and close inline input
      else if (e.key === 'Escape') {
        selectNode(null);
        setContextMenu({ ...contextMenu, visible: false });
        setNodeContextMenu({ ...nodeContextMenu, visible: false });
        setInlineInputActive(false);
        setInsertCursor(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, deleteNode, duplicateNode, undo, redo, selectNode, contextMenu, nodeContextMenu, document, findNearestNode, updateNodePosition]);

  // Handle canvas click (deselect or set insert position)
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('canvas-viewport')) {
        selectNode(null);

        // Set insert cursor at clicked position (snapped to grid) and activate inline input
        const rect = viewportRef.current?.getBoundingClientRect();
        if (rect) {
          const x = snapToGrid(e.clientX - rect.left + (viewportRef.current?.scrollLeft || 0));
          const y = snapToGrid(e.clientY - rect.top + (viewportRef.current?.scrollTop || 0));
          setInsertCursor({ x, y });
          setInlineInputActive(true);
        }
      }

      // Close context menus on any click
      setContextMenu({ ...contextMenu, visible: false });
      setNodeContextMenu({ ...nodeContextMenu, visible: false });
    },
    [selectNode, contextMenu, nodeContextMenu]
  );

  // Handle right-click context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();

    // Close any active inline input
    setInlineInputActive(false);

    const rect = viewportRef.current?.getBoundingClientRect();
    if (rect) {
      const canvasX = snapToGrid(e.clientX - rect.left + (viewportRef.current?.scrollLeft || 0));
      const canvasY = snapToGrid(e.clientY - rect.top + (viewportRef.current?.scrollTop || 0));

      setContextMenu({
        position: { x: e.clientX, y: e.clientY },
        visible: true,
      });
      setInsertCursor({ x: canvasX, y: canvasY });
    }
  }, []);

  // Handle node click
  const handleNodeClick = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      selectNode(nodeId);
      setInsertCursor(null);
      setInlineInputActive(false);
    },
    [selectNode]
  );

  // Handle title click to start editing
  const handleTitleClick = useCallback(() => {
    if (document) {
      setEditingTitleValue(document.name);
      setIsEditingTitle(true);
      setTimeout(() => titleInputRef.current?.select(), 0);
    }
  }, [document]);

  // Handle title save
  const handleTitleSave = useCallback(() => {
    const trimmed = editingTitleValue.trim();
    if (trimmed && trimmed !== document?.name) {
      updateDocumentName(trimmed);
    }
    setIsEditingTitle(false);
  }, [editingTitleValue, document, updateDocumentName]);

  // Handle title input keydown
  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
    }
  }, [handleTitleSave]);

  // Handle right-click on node
  const handleNodeContextMenu = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      selectNode(nodeId);

      // Find the node type
      const node = document?.nodes.find(n => n.id === nodeId);
      const nodeType = node?.type || null;

      setNodeContextMenu({
        position: { x: e.clientX, y: e.clientY },
        visible: true,
        nodeId,
        nodeType,
      });
      setContextMenu({ ...contextMenu, visible: false });
    },
    [selectNode, contextMenu, document]
  );

  // Handle delete from node context menu
  const handleDeleteNode = useCallback(() => {
    if (nodeContextMenu.nodeId) {
      deleteNode(nodeContextMenu.nodeId);
    }
    setNodeContextMenu({ ...nodeContextMenu, visible: false });
  }, [nodeContextMenu, deleteNode]);

  // Handle duplicate from node context menu
  const handleDuplicateNode = useCallback(() => {
    if (nodeContextMenu.nodeId) {
      duplicateNode(nodeContextMenu.nodeId);
    }
    setNodeContextMenu({ ...nodeContextMenu, visible: false });
  }, [nodeContextMenu, duplicateNode]);

  // Handle verify from node context menu
  const handleVerifyNode = useCallback(() => {
    if (nodeContextMenu.nodeId) {
      verifyNode(nodeContextMenu.nodeId);
    }
    setNodeContextMenu({ ...nodeContextMenu, visible: false });
  }, [nodeContextMenu, verifyNode]);

  // Start dragging a node
  const handleNodeDragStart = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      // Don't start drag if clicking on interactive elements (inputs, buttons, etc.)
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      if (['input', 'textarea', 'select', 'button'].includes(tagName)) {
        return; // Let the input handle the click
      }

      e.preventDefault();
      e.stopPropagation();

      const node = document?.nodes.find((n) => n.id === nodeId);
      if (!node?.position) return;

      setDraggingNode(nodeId);
      setDragStart({ x: e.clientX, y: e.clientY });
      setDragOffset({ x: 0, y: 0 });
      selectNode(nodeId);
    },
    [document, selectNode]
  );

  // Handle mouse move during drag
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingNode) return;

      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;

      setDragOffset({
        x: snapToGrid(dx),
        y: snapToGrid(dy),
      });
    },
    [draggingNode, dragStart]
  );

  // End dragging
  const handleMouseUp = useCallback(() => {
    if (draggingNode && (dragOffset.x !== 0 || dragOffset.y !== 0)) {
      const node = document?.nodes.find((n) => n.id === draggingNode);
      if (node?.position) {
        const newPosition: NodePosition = {
          x: node.position.x + dragOffset.x,
          y: node.position.y + dragOffset.y,
        };
        updateNodePosition(draggingNode, newPosition);
      }
    }
    setDraggingNode(null);
    setDragOffset({ x: 0, y: 0 });
  }, [draggingNode, dragOffset, document, updateNodePosition]);

  // Global mouse up listener
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (draggingNode) {
        handleMouseUp();
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [draggingNode, handleMouseUp]);

  // Calculate node position for rendering (including drag offset)
  const getNodeStyle = useCallback(
    (node: WorksheetNode): React.CSSProperties => {
      const pos = node.position || { x: 20, y: 80 };
      const isDragging = draggingNode === node.id;

      return {
        left: pos.x + (isDragging ? dragOffset.x : 0),
        top: pos.y + (isDragging ? dragOffset.y : 0),
      };
    },
    [draggingNode, dragOffset]
  );

  // Handle adding nodes from context menu
  const handleAddNode = useCallback(
    (type: NodeType) => {
      if (insertCursor) {
        addNode(type, insertCursor);
      } else {
        addNode(type);
      }
      setContextMenu({ ...contextMenu, visible: false });
      setInsertCursor(null);
    },
    [insertCursor, contextMenu, addNode]
  );

  // Handle inline input submission (click-to-type)
  const handleInlineSubmit = useCallback(
    async (text: string) => {
      if (!insertCursor) return;
      try {
        const result = parseText(text, insertCursor);
        for (const node of result.nodes) {
          await insertNode(node);
        }
      } catch (e) {
        logger.error('action', 'Inline input: failed to create node', { error: String(e) });
      } finally {
        setInlineInputActive(false);
        setInsertCursor(null);
      }
    },
    [insertCursor, insertNode]
  );

  const handleInlineCancel = useCallback(() => {
    setInlineInputActive(false);
    setInsertCursor(null);
  }, []);

  if (!document) {
    return (
      <div className="worksheet-canvas empty">
        <div className="empty-state">
          <h2>No worksheet loaded</h2>
          <p>Create a new worksheet or open an existing one.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={canvasRef}
      className={`worksheet-canvas ${darkPaper ? 'dark-paper' : ''}`}
      onClick={handleCanvasClick}
      onContextMenu={handleContextMenu}
      onMouseMove={handleMouseMove}
    >
      <div ref={viewportRef} className="canvas-viewport">
        {/* Worksheet Header */}
        <div className="worksheet-header">
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              className="worksheet-title-input"
              value={editingTitleValue}
              onChange={(e) => setEditingTitleValue(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              autoFocus
            />
          ) : (
            <h1 className="worksheet-title" onClick={handleTitleClick} title="Click to rename">
              {document.name}
            </h1>
          )}
          {document.metadata.description && (
            <p className="worksheet-description">{document.metadata.description}</p>
          )}
        </div>

        {/* Nodes Container */}
        <div className="nodes-container">
          {document.nodes.map((node, index) => (
            <div
              key={node.id}
              className={`node-wrapper ${draggingNode === node.id ? 'dragging' : ''}`}
              style={getNodeStyle(node)}
              onMouseDown={(e) => handleNodeDragStart(node.id, e)}
              onClick={(e) => handleNodeClick(node.id, e)}
              onContextMenu={(e) => handleNodeContextMenu(node.id, e)}
            >
              <NodeRenderer
                node={node}
                index={index}
                isSelected={selectedNodeId === node.id}
                onClick={() => {}}
                onUpdate={(updates) => handleNodeUpdate(node.id, updates)}
              />
            </div>
          ))}
        </div>

        {/* Insert Cursor / Inline Input */}
        {insertCursor && !contextMenu.visible && (
          inlineInputActive ? (
            <InlineCanvasInput
              position={insertCursor}
              onSubmit={handleInlineSubmit}
              onCancel={handleInlineCancel}
            />
          ) : (
            <div
              className="insert-cursor"
              style={{ left: insertCursor.x, top: insertCursor.y }}
            />
          )
        )}

        {/* Empty Worksheet Prompt */}
        {document.nodes.length === 0 && (
          <div className="empty-worksheet" style={{ position: 'absolute', top: 100, left: 20 }}>
            <p>Click anywhere on the grid to start, or right-click to add a node.</p>
          </div>
        )}
      </div>

      {/* Canvas Context Menu (right-click on empty space) */}
      {contextMenu.visible && (
        <div
          className="canvas-context-menu"
          style={{ left: contextMenu.position.x, top: contextMenu.position.y }}
        >
          <div className="context-menu-item" onClick={() => handleAddNode('given' as NodeType)}>
            <span className="icon">📥</span>
            <span>Add Given</span>
          </div>
          <div className="context-menu-item" onClick={() => handleAddNode('equation' as NodeType)}>
            <span className="icon">📐</span>
            <span>Add Equation</span>
          </div>
          <div className="context-menu-item" onClick={() => handleAddNode('text' as NodeType)}>
            <span className="icon">📝</span>
            <span>Add Text</span>
          </div>
          <div className="context-menu-divider" />
          <div className="context-menu-item" onClick={() => handleAddNode('constraint' as NodeType)}>
            <span className="icon">🔒</span>
            <span>Add Constraint</span>
          </div>
          <div className="context-menu-item" onClick={() => handleAddNode('solve_goal' as NodeType)}>
            <span className="icon">🎯</span>
            <span>Solve For...</span>
          </div>
          <div className="context-menu-divider" />
          <div className="context-menu-item" onClick={() => setDarkPaper(!darkPaper)}>
            <span className="icon">{darkPaper ? '☀️' : '🌙'}</span>
            <span>{darkPaper ? 'Light Paper' : 'Dark Paper'}</span>
          </div>
        </div>
      )}

      {/* Node Context Menu (right-click on node) */}
      {nodeContextMenu.visible && (
        <div
          className="canvas-context-menu node-context-menu"
          style={{ left: nodeContextMenu.position.x, top: nodeContextMenu.position.y }}
        >
          {/* Equation-specific: Solve for X submenu */}
          {nodeContextMenu.nodeType === 'equation' && solvableVariables.length > 0 && (
            <>
              <div className="context-menu-header">Solve for...</div>
              {solvableVariables.map(v => (
                <div
                  key={v.symbol}
                  className={`context-menu-item ${isSolving ? 'disabled' : ''} ${v.isDefined ? 'secondary' : ''}`}
                  onClick={!isSolving ? () => handleSolveFor(v.symbol) : undefined}
                >
                  <span className="icon">{v.isDefined ? '↻' : '🎯'}</span>
                  <span className="context-menu-symbol">
                    <MathDisplay latex={formatSymbolLatex(v.symbol)} displayMode={false} />
                  </span>
                  {v.isDefined && <span className="hint">(re-solve)</span>}
                </div>
              ))}
              <div className="context-menu-divider" />
            </>
          )}
          <div
            className={`context-menu-item ${isVerifying ? 'disabled' : ''}`}
            onClick={!isVerifying ? handleVerifyNode : undefined}
          >
            <span className="icon">✓</span>
            <span>{isVerifying ? 'Verifying...' : 'Verify'}</span>
          </div>
          <div className="context-menu-item" onClick={handleDuplicateNode}>
            <span className="icon">📋</span>
            <span>Duplicate</span>
            <span className="shortcut">Ctrl+D</span>
          </div>
          <div className="context-menu-divider" />
          <div className="context-menu-item danger" onClick={handleDeleteNode}>
            <span className="icon">🗑️</span>
            <span>Delete</span>
            <span className="shortcut">Del</span>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification.visible && (
        <div
          className={`notification-toast notification-${notification.type}`}
          role={notification.type === 'error' ? 'alert' : 'status'}
          aria-live={notification.type === 'error' ? 'assertive' : 'polite'}
          aria-atomic="true"
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            padding: '12px 16px',
            borderRadius: 8,
            backgroundColor: notification.type === 'error' ? 'var(--error-bg, #fef2f2)' :
                           notification.type === 'warning' ? 'var(--warning-bg, #fffbeb)' :
                           notification.type === 'success' ? 'var(--success-bg, #f0fdf4)' :
                           'var(--info-bg, #eff6ff)',
            color: notification.type === 'error' ? 'var(--error-text, #dc2626)' :
                   notification.type === 'warning' ? 'var(--warning-text, #d97706)' :
                   notification.type === 'success' ? 'var(--success-text, #16a34a)' :
                   'var(--info-text, #2563eb)',
            border: `1px solid ${
              notification.type === 'error' ? 'var(--error-border, #fecaca)' :
              notification.type === 'warning' ? 'var(--warning-border, #fde68a)' :
              notification.type === 'success' ? 'var(--success-border, #bbf7d0)' :
              'var(--info-border, #bfdbfe)'
            }`,
            maxWidth: 400,
            zIndex: 1000,
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ flexShrink: 0 }} aria-hidden="true">
            {notification.type === 'error' ? '❌' :
             notification.type === 'warning' ? '⚠️' :
             notification.type === 'success' ? '✅' : 'ℹ️'}
          </span>
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(n => ({ ...n, visible: false }))}
            aria-label="Close notification"
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 16,
              opacity: 0.6,
              padding: 0,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Theme Toggle Button (floating) */}
      <button
        className="theme-toggle"
        onClick={() => setDarkPaper(!darkPaper)}
        title={darkPaper ? 'Switch to light paper' : 'Switch to dark paper'}
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          padding: '8px 12px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 6,
          cursor: 'pointer',
          color: 'var(--text-primary)',
          fontSize: 12,
          zIndex: 100,
        }}
      >
        {darkPaper ? '☀️ Light' : '🌙 Dark'}
      </button>
    </div>
  );
}
