"use client";

import { useMemo, useEffect } from "react";
import { useDocumentStore, getNextNodePosition } from "../stores/documentStore";

interface WebToolbarProps {
  onToggleDependencyGraph?: () => void;
  showDependencyGraph?: boolean;
  onToggleLibrary?: () => void;
  showLibrary?: boolean;
  onShowTemplates?: () => void;
}

export function WebToolbar({
  onToggleDependencyGraph,
  showDependencyGraph,
  onToggleLibrary,
  showLibrary,
  onShowTemplates,
}: WebToolbarProps) {
  const {
    createDocument,
    undo,
    redo,
    addNode,
    document,
    verifyAllNodes,
    isVerifying,
    saveDocument,
    openDocument,
    exportToJson,
    exportToHtml,
    isDirty,
    recalculateStale,
    isLoading,
  } = useDocumentStore();

  const staleCount = useMemo(() => {
    if (!document) return 0;
    return document.nodes.filter(
      (n) => "isStale" in n && n.isStale === true
    ).length;
  }, [document]);

  const getNextPosition = () => getNextNodePosition(document);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === "n") {
        e.preventDefault();
        createDocument("New Document");
      } else if (ctrl && e.key === "s") {
        e.preventDefault();
        saveDocument();
      } else if (ctrl && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (ctrl && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [createDocument, saveDocument, undo, redo]);

  // Warn before closing with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  return (
    <header className="toolbar">
      <div className="toolbar-section brand">
        <img src="/logo.svg" alt="ProveCalc" className="toolbar-logo" />
        <span className="app-name">
          ProveCalc
          {document && (
            <span className="document-name">
              {" - "}
              {document.name}
              {isDirty && <span className="dirty-indicator">*</span>}
            </span>
          )}
        </span>
      </div>

      <div className="toolbar-section file-actions">
        <button
          className="toolbar-button"
          onClick={() => createDocument("New Document")}
          title="New (Ctrl+N)"
          disabled={isLoading}
        >
          New
        </button>
        <button
          className="toolbar-button"
          onClick={onShowTemplates}
          title="New from template"
          disabled={isLoading}
        >
          Templates
        </button>
        <button
          className="toolbar-button"
          onClick={openDocument}
          title="Open (Ctrl+O)"
          disabled={isLoading}
        >
          Open
        </button>
        <button
          className="toolbar-button"
          onClick={saveDocument}
          title="Save (Ctrl+S)"
          disabled={isLoading || !document}
        >
          Save
        </button>
        <button
          className="toolbar-button"
          onClick={exportToJson}
          title="Export JSON"
          disabled={isLoading || !document}
        >
          Export
        </button>
        <button
          className="toolbar-button"
          onClick={exportToHtml}
          title="Export HTML"
          disabled={isLoading || !document}
        >
          HTML
        </button>
      </div>

      <div className="toolbar-section edit-actions">
        <button
          className="toolbar-button"
          onClick={undo}
          title="Undo (Ctrl+Z)"
        >
          Undo
        </button>
        <button
          className="toolbar-button"
          onClick={redo}
          title="Redo (Ctrl+Y)"
        >
          Redo
        </button>
      </div>

      <div className="toolbar-section insert-actions">
        <button
          className="toolbar-button"
          onClick={() => addNode("given", getNextPosition())}
        >
          + Given
        </button>
        <button
          className="toolbar-button"
          onClick={() => addNode("equation", getNextPosition())}
        >
          + Equation
        </button>
        <button
          className="toolbar-button"
          onClick={() => addNode("text", getNextPosition())}
        >
          + Text
        </button>
        <button
          className="toolbar-button"
          onClick={() => addNode("solve_goal", getNextPosition())}
        >
          + Solve
        </button>
      </div>

      <div className="toolbar-section view-actions">
        <button
          className={`toolbar-button ${isVerifying ? "verifying" : ""}`}
          title="Verify All Nodes"
          onClick={verifyAllNodes}
          disabled={
            isVerifying || !document || document.nodes.length === 0
          }
        >
          {isVerifying ? "Verifying..." : "Verify"}
        </button>
        {staleCount > 0 && (
          <button
            className="toolbar-button stale-action"
            title={`Recalculate ${staleCount} stale node${staleCount === 1 ? "" : "s"}`}
            onClick={recalculateStale}
            disabled={isLoading}
          >
            {isLoading
              ? "Recalculating..."
              : `Recalculate (${staleCount})`}
          </button>
        )}
        <button
          className={`toolbar-button ${showDependencyGraph ? "active" : ""}`}
          onClick={onToggleDependencyGraph}
          title="Toggle Dependency Graph"
        >
          Deps
        </button>
        <button
          className={`toolbar-button ${showLibrary ? "active" : ""}`}
          onClick={onToggleLibrary}
          title="Toggle Library"
        >
          Library
        </button>
      </div>

      <div className="toolbar-spacer" />

      <div className="toolbar-section node-count">
        {document && (
          <span className="status-text">
            {document.nodes.length} node
            {document.nodes.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </header>
  );
}
