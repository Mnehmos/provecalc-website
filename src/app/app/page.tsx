"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useDocumentStore } from "../../stores/documentStore";
import { useLibraryStore } from "../../stores/libraryStore";
import { WorksheetCanvas } from "../../components/WorksheetCanvas";
import { WebToolbar } from "../../components/WebToolbar";
import { VariableInspector } from "../../components/VariableInspector";
import { AssumptionLedger } from "../../components/AssumptionLedger";
import { DependencyGraph } from "../../components/DependencyGraph";
import { LibraryPanel } from "../../components/LibraryPanel";
import { TemplateGallery } from "../../components/TemplateGallery";
import { AgentTray } from "../../components/AgentTray";

/** Minimum/maximum sidebar widths in px */
const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 600;

/** Minimum panel height for either Assumptions or Agent (px) */
const PANEL_MIN_HEIGHT = 80;

export default function AppPage() {
  const { isLoaded } = useUser();
  const { document, loadDocument } = useDocumentStore();
  const { isOpen: showLibrary, toggleOpen: toggleLibrary } = useLibraryStore();
  const didInitRef = useRef(false);
  const [showDependencyGraph, setShowDependencyGraph] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAgent, setShowAgent] = useState(true);

  // --- Resizable state ---
  const [leftWidth, setLeftWidth] = useState(280);
  const [rightWidth, setRightWidth] = useState(280);
  // Fraction of the right sidebar devoted to the Assumptions panel (0..1)
  const [assumptionFraction, setAssumptionFraction] = useState(0.35);

  const rightSidebarRef = useRef<HTMLElement>(null);

  // Generic drag handler factory
  const useDrag = useCallback(
    (onMove: (e: MouseEvent) => void) => {
      return (startEvent: React.MouseEvent) => {
        startEvent.preventDefault();
        const handleMove = (e: MouseEvent) => onMove(e);
        const handleUp = () => {
          window.removeEventListener("mousemove", handleMove);
          window.removeEventListener("mouseup", handleUp);
          // Remove cursor override
          window.document.body.style.cursor = "";
          window.document.body.style.userSelect = "";
        };
        window.document.body.style.userSelect = "none";
        window.addEventListener("mousemove", handleMove);
        window.addEventListener("mouseup", handleUp);
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Left sidebar resize (drag right edge)
  const onLeftResize = useDrag((e: MouseEvent) => {
    const w = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, e.clientX));
    setLeftWidth(w);
  });

  // Right sidebar resize (drag left edge)
  const onRightResize = useDrag((e: MouseEvent) => {
    const w = Math.min(
      SIDEBAR_MAX,
      Math.max(SIDEBAR_MIN, window.innerWidth - e.clientX),
    );
    setRightWidth(w);
  });

  // Vertical split between Assumptions and Agent
  const onSplitResize = useDrag((e: MouseEvent) => {
    const sidebar = rightSidebarRef.current;
    if (!sidebar) return;
    const rect = sidebar.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const totalH = rect.height;
    const clamped = Math.min(
      totalH - PANEL_MIN_HEIGHT,
      Math.max(PANEL_MIN_HEIGHT, offsetY),
    );
    setAssumptionFraction(clamped / totalH);
  });

  // Load document on mount (once)
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    if (!document) loadDocument();
  }, [document, loadDocument]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div style={{ color: "var(--text-secondary)" }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <WebToolbar
        onToggleDependencyGraph={() => setShowDependencyGraph((v) => !v)}
        showDependencyGraph={showDependencyGraph}
        onToggleLibrary={toggleLibrary}
        showLibrary={showLibrary}
        onShowTemplates={() => setShowTemplates(true)}
        onToggleAgent={() => setShowAgent((v) => !v)}
        showAgent={showAgent}
      />
      <div className="main-content">
        {/* Left sidebar */}
        <aside className="sidebar left" style={{ width: leftWidth }}>
          <VariableInspector />
        </aside>
        <div className="resize-handle vertical" onMouseDown={onLeftResize} />

        <main className="worksheet-area">
          <WorksheetCanvas />
        </main>

        <div className="resize-handle vertical" onMouseDown={onRightResize} />
        {/* Right sidebar with resizable split */}
        <aside
          className="sidebar right"
          style={{ width: rightWidth }}
          ref={rightSidebarRef}
        >
          <div
            className="sidebar-panel-top"
            style={{ height: `${assumptionFraction * 100}%` }}
          >
            <AssumptionLedger />
          </div>
          {showAgent && (
            <>
              <div
                className="resize-handle horizontal"
                onMouseDown={onSplitResize}
              />
              <div
                className="sidebar-panel-bottom"
                style={{ height: `${(1 - assumptionFraction) * 100}%` }}
              >
                <AgentTray />
              </div>
            </>
          )}
        </aside>
      </div>

      {/* Library Panel */}
      <LibraryPanel />

      {/* Dependency Graph */}
      {showDependencyGraph && (
        <div className="dependency-panel">
          <div className="panel-header">
            <h3>Dependency Graph</h3>
            <button
              className="close-btn"
              onClick={() => setShowDependencyGraph(false)}
              title="Close"
            >
              x
            </button>
          </div>
          <div className="panel-content">
            <DependencyGraph />
          </div>
        </div>
      )}

      {/* Template Gallery */}
      <TemplateGallery
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
      />

      <footer className="status-bar">
        <span className="status-item">
          {document?.name || "Untitled"}
        </span>
        <span className="status-item">
          {document?.nodes.length || 0} nodes
        </span>
        <span className="status-item verification-status">
          Engine: Ready
        </span>
      </footer>
    </div>
  );
}
