"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import { useDocumentStore, getNextNodePosition } from "../stores/documentStore";
import type { WorksheetExportData } from "../services/foxitTemplateBuilder";
import type { GivenNode, EquationNode, SolveGoalNode, ResultNode } from "../types/document";

interface WebToolbarProps {
  onToggleDependencyGraph?: () => void;
  showDependencyGraph?: boolean;
  onToggleLibrary?: () => void;
  showLibrary?: boolean;
  onShowTemplates?: () => void;
  onToggleAgent?: () => void;
  showAgent?: boolean;
}

export function WebToolbar({
  onToggleDependencyGraph,
  showDependencyGraph,
  onToggleLibrary,
  showLibrary,
  onShowTemplates,
  onToggleAgent,
  showAgent,
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

  const [foxitExporting, setFoxitExporting] = useState(false);

  const staleCount = useMemo(() => {
    if (!document) return 0;
    return document.nodes.filter(
      (n) => "isStale" in n && n.isStale === true
    ).length;
  }, [document]);

  const getNextPosition = () => getNextNodePosition(document);

  // --- Foxit PDF Export ---
  const exportFoxitPdf = useCallback(async () => {
    if (!document) return;
    setFoxitExporting(true);

    try {
      // Helper: get node label by ID for dependency display
      const getNodeLabel = (id: string): string => {
        const node = document.nodes.find((n) => n.id === id);
        if (!node) return id;
        if (node.type === "given") return node.symbol;
        if (node.type === "equation") return `${node.lhs} = ${node.rhs}`;
        if (node.type === "solve_goal") return `Solve: ${node.target_symbol}`;
        if (node.type === "result") return node.symbol;
        if (node.type === "text") return node.content.substring(0, 20);
        return node.type;
      };

      const givenNodes = document.nodes.filter((n): n is GivenNode => n.type === "given");
      const equationNodes = document.nodes.filter((n): n is EquationNode => n.type === "equation");
      const solveNodes = document.nodes.filter((n): n is SolveGoalNode => n.type === "solve_goal");
      const resultNodes = document.nodes.filter((n): n is ResultNode => n.type === "result");
      const verifiedNodes = document.nodes.filter(
        (n) => n.verification?.status === "verified"
      );

      // Format number for display (avoid 0.00166666666666666)
      const fmtNum = (v: number): string => {
        if (v === 0) return "0";
        const abs = Math.abs(v);
        if (abs >= 0.01 && abs < 1e6) return Number(v.toPrecision(6)).toString();
        return v.toExponential(4);
      };

      const exportData: WorksheetExportData = {
        title: document.name || "Untitled Worksheet",
        author: "ProveCalc User",
        date: new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        nodeCount: document.nodes.length,
        equationCount: equationNodes.length,
        givenCount: givenNodes.length,
        solveCount: solveNodes.length,
        verifiedCount: verifiedNodes.length,
        totalNodes: document.nodes.length,
        verificationScore:
          document.nodes.length > 0
            ? `${Math.round((verifiedNodes.length / document.nodes.length) * 100)}%`
            : "N/A",
        assumptions: (document.assumptions || []).map((a) => a.statement),
        variables: givenNodes.map((n) => ({
          symbol: n.symbol,
          value: fmtNum(n.value.value),
          unit: n.value.unit?.expression || "",
          verified: n.verification?.status === "verified",
        })),
        equations: equationNodes.map((n) => ({
          expression: n.sympy || `${n.lhs} = ${n.rhs}`,
          lhs: n.lhs,
          rhs: n.rhs,
          verified: n.verification?.status === "verified",
        })),
        solveGoals: solveNodes.map((n) => ({
          target: n.target_symbol,
          verified: n.verification?.status === "verified",
        })),
        results: resultNodes.map((n) => ({
          symbol: n.symbol,
          value: fmtNum(n.value.value),
          unit: n.value.unit?.expression || "",
          verified: n.verification?.status === "verified",
          symbolicForm: n.symbolic_form,
        })),
        dependencyGraph: document.nodes.map((n) => ({
          id: n.id,
          type: n.type,
          label: getNodeLabel(n.id),
          status: (n.verification?.status || "unverified") as "verified" | "failed" | "unverified" | "pending",
          dependsOn: (n.dependencies || []).map(getNodeLabel),
          dependedBy: (n.dependents || []).map(getNodeLabel),
        })),
      };

      const res = await fetch("/api/foxit/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exportData),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        const detail = result.details || result.error || "Unknown error";
        alert(`Foxit PDF: ${detail}`);
        console.error("Foxit PDF error:", result);
        return;
      }

      // Download the PDF
      const binaryString = atob(result.pdf);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `${document.name || "ProveCalc-Report"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setFoxitExporting(false);
    }
  }, [document]);

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
        <button
          className="toolbar-button foxit-btn"
          onClick={exportFoxitPdf}
          title="Generate Verified PDF Report (Foxit)"
          disabled={isLoading || !document || foxitExporting}
        >
          {foxitExporting ? "Generating..." : "Foxit PDF"}
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
        <button
          className={`toolbar-button ${showAgent ? "active" : ""}`}
          onClick={onToggleAgent}
          title="Toggle AI Assistant"
        >
          AI
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
