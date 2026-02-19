/**
 * TemplateGallery - Browse and create worksheets from templates
 */

import { useState, useMemo, useRef } from 'react';
import {
  TEMPLATES,
  TEMPLATE_CATEGORIES,
  type TemplateCategory,
  type WorksheetTemplate,
  type TemplateNodeData,
} from '../data/templates';
import { useDocumentStore } from '../stores/documentStore';
import { v4 as uuidv4 } from 'uuid';
import type { WorksheetNode, Provenance, VerificationStatus, NodeId } from '../types/document';

interface TemplateGalleryProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Hydrate a partial template node into a full WorksheetNode */
function hydrateNode(
  partial: TemplateNodeData
): WorksheetNode {
  const now = new Date().toISOString();
  const base = {
    id: uuidv4(),
    provenance: { type: 'library', source: 'template', timestamp: now } as Provenance,
    verification: { status: 'unverified' } as VerificationStatus,
    dependencies: [] as NodeId[],
    dependents: [] as NodeId[],
    assumptions: [] as string[],
  };

  return { ...base, ...partial } as WorksheetNode;
}

export function TemplateGallery({ isOpen, onClose }: TemplateGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const { insertNode } = useDocumentStore();
  const createDocument = useDocumentStore((s) => s.createDocument);
  const [isCreating, setIsCreating] = useState(false);
  const creatingRef = useRef(false);

  const filtered = useMemo(() => {
    let list = TEMPLATES;
    if (selectedCategory !== 'all') {
      list = list.filter((t) => t.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    return list;
  }, [selectedCategory, search]);

  const handleCreate = async (template: WorksheetTemplate) => {
    if (creatingRef.current) return;
    creatingRef.current = true;
    setIsCreating(true);
    try {
      // Create a blank document with the template name
      const created = await createDocument(template.name);
      if (!created) return;

      // Insert each template node
      for (const partial of template.nodes) {
        const node = hydrateNode(partial);
        await insertNode(node);
      }

      onClose();
    } finally {
      creatingRef.current = false;
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  const categories = Object.entries(TEMPLATE_CATEGORIES) as [
    TemplateCategory,
    { label: string; icon: string },
  ][];

  return (
    <div className="template-gallery-overlay" onClick={onClose}>
      <div className="template-gallery" onClick={(e) => e.stopPropagation()}>
        <div className="template-gallery-header">
          <h2>New from Template</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="template-gallery-controls">
          <input
            type="text"
            className="template-search"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="template-category-tabs">
            <button
              className={selectedCategory === 'all' ? 'active' : ''}
              onClick={() => setSelectedCategory('all')}
            >
              All
            </button>
            {categories.map(([key, { label, icon }]) => (
              <button
                key={key}
                className={selectedCategory === key ? 'active' : ''}
                onClick={() => setSelectedCategory(key)}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>

        <div className="template-gallery-grid">
          {filtered.length === 0 && (
            <p className="template-empty">No templates match your search.</p>
          )}
          {filtered.map((template) => (
            <button
              key={template.id}
              className="template-card"
              onClick={() => handleCreate(template)}
              disabled={isCreating}
            >
              <div className="template-card-icon">
                {TEMPLATE_CATEGORIES[template.category].icon}
              </div>
              <div className="template-card-body">
                <h3>{template.name}</h3>
                <p>{template.description}</p>
                <div className="template-card-meta">
                  <span className="template-node-count">
                    {template.nodes.length} nodes
                  </span>
                  <span className="template-category-badge">
                    {TEMPLATE_CATEGORIES[template.category].label}
                  </span>
                </div>
                <div className="template-tags">
                  {template.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="template-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
