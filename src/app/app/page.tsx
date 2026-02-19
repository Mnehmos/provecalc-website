"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useDocumentStore } from "../../stores/documentStore";
import { WorksheetCanvas } from "../../components/WorksheetCanvas";

export default function AppPage() {
  const { user, isLoaded } = useUser();
  const { document, loadDocument } = useDocumentStore();

  // Load document on mount
  useEffect(() => {
    if (!document) {
      loadDocument();
    }
  }, [document, loadDocument]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div style={{ color: "var(--text-secondary)" }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ height: "calc(100vh - 56px)", marginTop: "56px", overflow: "hidden" }}>
      <WorksheetCanvas />
    </div>
  );
}
