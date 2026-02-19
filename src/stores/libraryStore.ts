/**
 * Library Store - Zustand store for managing reusable artifacts
 *
 * Enables saving equations, givens, and templates for reuse across worksheets.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
  LibraryItem,
  LibraryCategory,
  WorksheetNode,
  NodePosition,
  Provenance,
  VerificationStatus,
} from '../types/document';
import { DEFAULT_LIBRARY_ITEMS } from './libraryData';
import { useDocumentStore } from './documentStore';

/** Maps PhysicalDomainType to the tag prefixes used by library items */
const DOMAIN_TAG_MAP: Record<string, string[]> = {
  mechanics: ['statics', 'dynamics', 'kinematics', 'mechanics of materials', 'fluid mechanics'],
  thermodynamics: ['thermodynamics', 'heat transfer'],
  electrical: ['electrical'],
  magnetism: ['electrical'], // electromagnetic overlap
  chemistry: ['chemistry'],
  optics: ['optics'],
  civil: ['civil'],
};

interface LibraryState {
  items: LibraryItem[];
  searchQuery: string;
  selectedCategory: LibraryCategory | 'all';
  isOpen: boolean;

  // Actions
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: LibraryCategory | 'all') => void;
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;

  // CRUD operations
  addItem: (item: Omit<LibraryItem, 'id' | 'createdAt' | 'updatedAt'>) => LibraryItem;
  updateItem: (id: string, updates: Partial<LibraryItem>) => void;
  deleteItem: (id: string) => void;

  // Import/Export
  exportLibrary: () => string;
  importLibrary: (json: string) => { added: number; errors: string[] };

  // Node operations
  saveNodeToLibrary: (
    node: WorksheetNode,
    name: string,
    description: string,
    category: LibraryCategory,
    tags: string[]
  ) => LibraryItem;
  createNodeFromItem: (itemId: string, position: NodePosition) => WorksheetNode | null;

  // Filtered items getter
  getFilteredItems: () => LibraryItem[];
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      items: DEFAULT_LIBRARY_ITEMS,
      searchQuery: '',
      selectedCategory: 'all',
      isOpen: false,

      setSearchQuery: (query) => set({ searchQuery: query }),
      setSelectedCategory: (category) => set({ selectedCategory: category }),
      toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
      setOpen: (open) => set({ isOpen: open }),

      addItem: (itemData) => {
        const now = new Date().toISOString();
        const newItem: LibraryItem = {
          ...itemData,
          id: uuidv4(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ items: [...state.items, newItem] }));
        return newItem;
      },

      updateItem: (id, updates) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, ...updates, updatedAt: new Date().toISOString() }
              : item
          ),
        }));
      },

      deleteItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      exportLibrary: () => {
        const { items } = get();
        const library = {
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          items: items.filter((item) => item.author !== 'System'), // Only export user items
        };
        return JSON.stringify(library, null, 2);
      },

      importLibrary: (json) => {
        const errors: string[] = [];
        let added = 0;

        try {
          const data = JSON.parse(json);
          if (!data.items || !Array.isArray(data.items)) {
            return { added: 0, errors: ['Invalid library format: missing items array'] };
          }

          const newItems: LibraryItem[] = [];
          const existingIds = new Set(get().items.map((i) => i.id));

          for (const item of data.items) {
            if (!item.name || !item.nodeType || !item.nodeData) {
              errors.push(`Invalid item: missing required fields`);
              continue;
            }
            if (existingIds.has(item.id)) {
              // Generate new ID for duplicates
              item.id = uuidv4();
            }
            newItems.push(item);
            added++;
          }

          set((state) => ({ items: [...state.items, ...newItems] }));
        } catch (e) {
          errors.push(`Parse error: ${String(e)}`);
        }

        return { added, errors };
      },

      saveNodeToLibrary: (node, name, description, category, tags) => {
        // Strip runtime properties
        const { id: _id, provenance: _prov, verification: _ver, position: _pos, dependencies: _deps, dependents: _depts, ...nodeData } = node as unknown as Record<string, unknown>;

        const itemData: Omit<LibraryItem, 'id' | 'createdAt' | 'updatedAt'> = {
          name,
          description,
          category,
          tags,
          nodeType: node.type,
          nodeData: { type: node.type, ...nodeData, assumptions: [] },
        };

        return get().addItem(itemData);
      },

      createNodeFromItem: (itemId, position) => {
        const item = get().items.find((i) => i.id === itemId);
        if (!item) return null;

        const now = new Date().toISOString();
        const provenance: Provenance = {
          type: 'library',
          source: item.name,
          timestamp: now,
        };
        const verification: VerificationStatus = { status: 'unverified' };

        // Use double cast since we know nodeData has the correct type-specific fields
        return {
          id: uuidv4(),
          ...item.nodeData,
          provenance,
          verification,
          position,
          dependencies: [],
          dependents: [],
        } as unknown as WorksheetNode;
      },

      getFilteredItems: () => {
        const { items, searchQuery, selectedCategory } = get();
        const activeDomain = useDocumentStore.getState().document?.metadata.active_domain;
        const domainTags = activeDomain ? DOMAIN_TAG_MAP[activeDomain] : undefined;

        return items.filter((item) => {
          // Category filter
          if (selectedCategory !== 'all' && item.category !== selectedCategory) {
            return false;
          }

          // Domain filter - match items with any tag belonging to the active domain
          if (domainTags) {
            const tags = item.tags.map((tag) => tag.toLowerCase());
            const matchesDomain = tags.some((tag) => domainTags.includes(tag));
            const isGlobal = tags.includes('constant') || tags.includes('mathematics');
            if (!matchesDomain && !isGlobal) return false;
          }

          // Search filter
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
              item.name.toLowerCase().includes(query) ||
              item.description?.toLowerCase().includes(query) ||
              item.tags.some((tag) => tag.toLowerCase().includes(query))
            );
          }

          return true;
        });
      },
    }),
    {
      name: 'worksheet-library',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist user-created items (not system defaults)
        items: state.items.filter((item) => item.author !== 'System'),
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<LibraryState> | undefined;
        // Always start with DEFAULT_LIBRARY_ITEMS, then add user items
        const userItems = persisted?.items || [];
        return {
          ...currentState,
          items: [...DEFAULT_LIBRARY_ITEMS, ...userItems],
        };
      },
    }
  )
);
