"use client";

import { useEffect, useState, useRef } from "react";
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

export default function AppPage() {
  const { isLoaded } = useUser();
  const { document, loadDocument } = useDocumentStore();
  const { isOpen: showLibrary, toggleOpen: toggleLibrary } = useLibraryStore();
  const didInitRef = useRef(false);
  const [showDependencyGraph, setShowDependencyGraph] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAgent, setShowAgent] = useState(false);

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
        <aside className="sidebar left">
          <VariableInspector />
        </aside>
        <main className="worksheet-area">
          <WorksheetCanvas />
        </main>
        <aside className="sidebar right">
          <AssumptionLedger />
          {showAgent && <AgentTray />}
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
