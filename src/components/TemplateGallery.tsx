/**
 * TemplateGallery - Browse and create worksheets from templates
 */

import { useState, useMemo, useRef } from 'react';
import {
  TEMPLATES,
  TEMPLATE_CATEGORIES,
  type TemplateCategory,
  type WorksheetTemplate,
} from '../data/templates';
import { useDocumentStore } from '../stores/documentStore';

interface TemplateGalleryProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TemplateGallery({ isOpen, onClose }: TemplateGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const loadTemplate = useDocumentStore((s) => s.loadTemplate);
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
      if (await loadTemplate(template)) onClose();
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
                  {template.tags.includes('tutorial') && (
                    <span className="template-start-badge">Start here</span>
                  )}
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
