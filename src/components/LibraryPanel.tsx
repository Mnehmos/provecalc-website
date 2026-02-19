/**
 * LibraryPanel - Browse and import reusable artifacts
 *
 * Features:
 * - Category-based organization with collapsible sections
 * - Grid and list view modes
 * - Search and filter
 * - Recently used tracking
 * - Sort options
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useLibraryStore } from '../stores/libraryStore';
import { useDocumentStore, getNextNodePosition } from '../stores/documentStore';
import { useAIAssistStore } from '../stores/aiAssistStore';
import type { LibraryCategory, LibraryItem } from '../types/document';
import { MathDisplay } from './MathDisplay';

const CATEGORY_LABELS: Record<LibraryCategory | 'all', string> = {
  all: 'All',
  physics: 'Physics',
  chemistry: 'Chemistry',
  mathematics: 'Math',
  engineering: 'Engineering',
  electrical: 'Electrical',
  mechanical: 'Mechanical',
  civil: 'Civil',
  custom: 'Custom',
};

const CATEGORY_ICONS: Record<LibraryCategory | 'all', string> = {
  all: '📚',
  physics: '⚛️',
  chemistry: '🧪',
  mathematics: '📐',
  engineering: '⚙️',
  electrical: '⚡',
  mechanical: '🔧',
  civil: '🏗️',
  custom: '📁',
};

type ViewMode = 'grid' | 'list';
type SortOption = 'name' | 'category' | 'recent' | 'type';

export function LibraryPanel() {
  const {
    isOpen,
    setOpen,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    getFilteredItems,
    deleteItem,
    exportLibrary,
    importLibrary,
  } = useLibraryStore();

  const { insertNode, document } = useDocumentStore();
  const { createNodeFromItem } = useLibraryStore();
  const askAI = useAIAssistStore((s) => s.askAI);

  const [importError, setImportError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>(() => {
    // Initialize from localStorage
    try {
      const stored = localStorage.getItem('worksheet:library:recentlyUsed');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.slice(0, 10);
        }
      }
    } catch {
      // Ignore parse errors
    }
    return [];
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist recentlyUsed to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('worksheet:library:recentlyUsed', JSON.stringify(recentlyUsed));
    } catch {
      // Ignore storage errors
    }
  }, [recentlyUsed]);

  const filteredItems = getFilteredItems();

  // Sort items based on selected option
  const sortedItems = useMemo(() => {
    const items = [...filteredItems];
    switch (sortBy) {
      case 'name':
        return items.sort((a, b) => a.name.localeCompare(b.name));
      case 'category':
        return items.sort((a, b) => a.category.localeCompare(b.category));
      case 'type':
        return items.sort((a, b) => a.nodeType.localeCompare(b.nodeType));
      case 'recent':
        return items.sort((a, b) => {
          const aIndex = recentlyUsed.indexOf(a.id);
          const bIndex = recentlyUsed.indexOf(b.id);
          if (aIndex === -1 && bIndex === -1) return 0;
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });
      default:
        return items;
    }
  }, [filteredItems, sortBy, recentlyUsed]);

  // Group items by category
  const groupedItems = useMemo(() => {
    if (selectedCategory !== 'all') {
      return { [selectedCategory]: sortedItems };
    }
    const groups: Record<string, LibraryItem[]> = {};
    for (const item of sortedItems) {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    }
    return groups;
  }, [sortedItems, selectedCategory]);

  // Compute displayed recent items (only show items that exist and limit to 5)
  const displayedRecentItems = useMemo(() => {
    return recentlyUsed
      .map(id => filteredItems.find(item => item.id === id))
      .filter((item): item is LibraryItem => item !== undefined)
      .slice(0, 5);
  }, [recentlyUsed, filteredItems]);

  // Toggle category collapse
  const toggleCategory = useCallback((category: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const getNextPosition = useCallback(() => getNextNodePosition(document), [document]);

  // Insert item into document
  const handleInsertItem = useCallback(
    (item: LibraryItem) => {
      const node = createNodeFromItem(item.id, getNextPosition());
      if (node) {
        insertNode(node);
        // Track recently used
        setRecentlyUsed(prev => {
          const filtered = prev.filter(id => id !== item.id);
          return [item.id, ...filtered].slice(0, 10);
        });
      }
    },
    [createNodeFromItem, getNextPosition, insertNode]
  );

  // Ask AI to explain a library item
  const handleLearnMore = useCallback(
    (item: LibraryItem) => {
      const desc = item.description ? `: ${item.description}` : '';
      askAI(
        `Explain the concept "${item.name}"${desc}. When is it used and what are the key variables?`,
        { type: 'general' },
      );
    },
    [askAI]
  );

  // Export library to file
  const handleExport = useCallback(() => {
    const json = exportLibrary();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = globalThis.document.createElement('a');
    a.href = url;
    a.download = 'worksheet-library.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [exportLibrary]);

  // Import library from file
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const result = importLibrary(reader.result as string);
        if (result.errors.length > 0) {
          setImportError(result.errors.join(', '));
        } else {
          setImportError(null);
        }
      };
      reader.readAsText(file);
      e.target.value = ''; // Reset input
    },
    [importLibrary]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="library-panel">
      <div className="panel-header">
        <h3>
          <span className="icon">📚</span>
          Library
        </h3>
        <button className="close-btn" onClick={() => setOpen(false)} title="Close">
          ✕
        </button>
      </div>

      <div className="library-toolbar">
        <div className="library-search-wrapper">
          <input
            type="text"
            className="library-search"
            placeholder="Search equations, formulas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        {searchQuery && (
          <span className="search-result-count">
            {sortedItems.length} result{sortedItems.length !== 1 ? 's' : ''}
          </span>
        )}

        <div className="library-controls">
          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            title="Sort by"
          >
            <option value="name">Name</option>
            <option value="category">Category</option>
            <option value="type">Type</option>
            <option value="recent">Recent</option>
          </select>

          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              ⊞
            </button>
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              ☰
            </button>
          </div>
        </div>

        <div className="library-actions">
          <button className="library-btn" onClick={handleImportClick} title="Import">
            Import
          </button>
          <button className="library-btn" onClick={handleExport} title="Export">
            Export
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {importError && (
        <div className="library-error">
          {importError}
          <button onClick={() => setImportError(null)}>✕</button>
        </div>
      )}

      <div className="library-categories">
        {(Object.keys(CATEGORY_LABELS) as Array<LibraryCategory | 'all'>).map((cat) => (
          <button
            key={cat}
            className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
            title={CATEGORY_LABELS[cat]}
          >
            <span className="category-icon">{CATEGORY_ICONS[cat]}</span>
            <span className="category-label">{CATEGORY_LABELS[cat]}</span>
          </button>
        ))}
      </div>

      {/* Recently Used Section */}
      {displayedRecentItems.length > 0 && selectedCategory === 'all' && !searchQuery && (
        <div className="library-section recently-used">
          <div
            className={`section-header ${collapsedCategories.has('recent') ? 'collapsed' : ''}`}
            onClick={() => toggleCategory('recent')}
          >
            <span className="collapse-icon">{collapsedCategories.has('recent') ? '▶' : '▼'}</span>
            <span className="section-title">Recently Used</span>
            <span className="section-count">{displayedRecentItems.length}</span>
          </div>
          {!collapsedCategories.has('recent') && (
            <div className={`library-items ${viewMode}`}>
              {displayedRecentItems.map(item => (
                <LibraryItemCard
                  key={item.id}
                  item={item}
                  onInsert={() => handleInsertItem(item)}
                  onDelete={item.author !== 'System' ? () => deleteItem(item.id) : undefined}
                  onLearnMore={() => handleLearnMore(item)}
                  compact={viewMode === 'list'}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Items - Grouped by Category */}
      <div className="library-content">
        {Object.keys(groupedItems).length === 0 ? (
          <div className="library-empty">
            {searchQuery ? 'No items match your search' : 'No items in this category'}
          </div>
        ) : (
          Object.entries(groupedItems).map(([category, items]) => (
            <div key={category} className="library-section">
              {selectedCategory === 'all' && (
                <div
                  className={`section-header ${collapsedCategories.has(category) ? 'collapsed' : ''}`}
                  onClick={() => toggleCategory(category)}
                >
                  <span className="collapse-icon">{collapsedCategories.has(category) ? '▶' : '▼'}</span>
                  <span className="section-icon">{CATEGORY_ICONS[category as LibraryCategory]}</span>
                  <span className="section-title">{CATEGORY_LABELS[category as LibraryCategory]}</span>
                  <span className="section-count">{items.length}</span>
                </div>
              )}
              {!collapsedCategories.has(category) && (
                <div className={`library-items ${viewMode}`}>
                  {items.map((item) => (
                    <LibraryItemCard
                      key={item.id}
                      item={item}
                      onInsert={() => handleInsertItem(item)}
                      onDelete={item.author !== 'System' ? () => deleteItem(item.id) : undefined}
                      onLearnMore={() => handleLearnMore(item)}
                      compact={viewMode === 'list'}
                      searchQuery={searchQuery}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/** Highlight matching text in a string */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  // split with capturing group: even indices = non-match, odd indices = match
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="search-highlight">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

interface LibraryItemCardProps {
  item: LibraryItem;
  onInsert: () => void;
  onDelete?: () => void;
  onLearnMore?: () => void;
  compact?: boolean;
  searchQuery?: string;
}

const NODE_TYPE_ICONS: Record<string, string> = {
  equation: '∑',
  given: 'x',
  constraint: '≤',
  text: 'T',
  solve_goal: '?',
  plot: '📈',
};

function LibraryItemCard({ item, onInsert, onDelete, onLearnMore, compact = false, searchQuery = '' }: LibraryItemCardProps) {
  // Get preview latex based on node type
  const previewLatex = (() => {
    const data = item.nodeData as Record<string, unknown>;
    switch (item.nodeType) {
      case 'equation':
        return (data.latex as string) || `${data.lhs} = ${data.rhs}`;
      case 'given':
        return (data.latex as string) || `${data.symbol} = ${(data.value as { value: number })?.value || 0}`;
      case 'constraint':
        return (data.latex as string) || (data.sympy as string);
      default:
        return item.name;
    }
  })();

  if (compact) {
    return (
      <div className="library-item-card compact">
        <span className="item-type-icon" title={item.nodeType}>
          {NODE_TYPE_ICONS[item.nodeType] || '•'}
        </span>
        <div className="item-info">
          <span className="item-name"><HighlightMatch text={item.name} query={searchQuery} /></span>
          <span className="item-preview-inline">
            <MathDisplay latex={previewLatex} displayMode={false} />
          </span>
        </div>
        <div className="item-actions-compact">
          <button className="insert-btn-compact" onClick={onInsert} title="Insert">
            +
          </button>
          {onDelete && (
            <button className="delete-btn-compact" onClick={onDelete} title="Delete">
              ×
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="library-item-card">
      <div className="item-header">
        <span className="item-type-badge" title={item.nodeType}>
          {NODE_TYPE_ICONS[item.nodeType] || '•'}
        </span>
        <span className="item-name"><HighlightMatch text={item.name} query={searchQuery} /></span>
      </div>

      <div className="item-preview">
        <MathDisplay latex={previewLatex} />
      </div>

      {item.description && (
        <p className="item-description">
          <HighlightMatch text={item.description} query={searchQuery} />
        </p>
      )}

      {item.tags.length > 0 && (
        <div className="item-tags">
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
          {item.tags.length > 3 && <span className="tag-more">+{item.tags.length - 3}</span>}
        </div>
      )}

      <div className="item-actions">
        <button className="insert-btn" onClick={onInsert} title="Insert into worksheet">
          + Insert
        </button>
        {onLearnMore && (
          <button className="learn-more-btn" onClick={onLearnMore} title="Learn more with AI">
            AI
          </button>
        )}
        {onDelete && (
          <button className="delete-btn" onClick={onDelete} title="Delete from library">
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
