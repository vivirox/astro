// Define minimal types for flexsearch
interface IndexOptions {
  tokenize?: string
  cache?: number
  context?: boolean
}

interface SearchOptions {
  limit?: number
  suggest?: boolean
  fuzzy?: number
  enrich?: boolean
}

// Define search document structure
export interface SearchDocument {
  id: string | number
  title: string
  content: string
  url: string
  tags?: string[]
  category?: string
}

// Define a minimal Document interface based on usage
interface FlexDocument {
  add(doc: any): void
  remove(id: string | number): void
  search(query: string, options?: SearchOptions): any[]
}

// Document constructor type
type DocumentConstructor = new (options: any) => FlexDocument

// Reference to Document class
let Document: DocumentConstructor

// Only import Document on the client side
if (typeof window !== 'undefined') {
  try {
    // Import flexsearch modules
    const flexsearch = await import('flexsearch')

    // Try different ways to access Document class
    Document =
      (flexsearch as any).Document || (flexsearch as any).default?.Document

    // Fallback to alternate import path if needed
    if (!Document) {
      const documentModule = await import('flexsearch/dist/module/document')
      Document = (documentModule as any).default
    }
  } catch (error) {
    console.error('Error loading flexsearch:', error)
    // Create a dummy Document class as fallback
    Document = class DummyDocument {
      constructor() {
        console.warn('Using dummy search implementation')
      }
      add() {}
      remove() {}
      search() {
        return []
      }
    } as any
  }
}

// Define search result structure
export interface SearchResult {
  id: string | number
  title: string
  content: string
  url: string
  tags?: string[]
  category?: string
  score?: number
  match?: string[]
}

// Define search index configuration type
export interface SearchConfig {
  // FlexSearch indexing options
  indexOptions?: IndexOptions

  // FlexSearch search options
  searchOptions?: SearchOptions

  // Custom tokenizer function
  tokenize?: (text: string) => string[]

  // Fields to include in search
  fields?: string[]

  // Search boost values per field
  boost?: Record<string, number>
}

// Default configuration
const DEFAULT_CONFIG: SearchConfig = {
  indexOptions: {
    tokenize: 'forward',
    cache: 100,
    context: true,
  },
  searchOptions: {
    limit: 10,
    suggest: true,
    fuzzy: 0.2,
  },
  fields: ['title', 'content', 'tags'],
  boost: {
    title: 2,
    content: 1,
    tags: 3,
  },
}

// Interface for search functionality
export interface ISearchClient {
  search: (query: string) => SearchDocument[]
  importDocuments: (documents: SearchDocument[]) => void
}

// Declare global types to access via Window
declare global {
  interface Window {
    searchClient: ISearchClient
    searchIndex: SearchDocument[]
    initSearch?: () => void
  }
}

/**
 * FlexSearch client-side search implementation
 * Provides high-performance, privacy-focused search functionality
 */
export class SearchClient implements ISearchClient {
  private index: any // Use any for the Document instance
  private documents: Map<string | number, SearchDocument> = new Map()
  private config: SearchConfig

  /**
   * Create a new search client
   * @param config Search configuration options
   */
  constructor(config: Partial<SearchConfig> = {}) {
    // Merge default config with provided config
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      indexOptions: {
        ...DEFAULT_CONFIG.indexOptions,
        ...config.indexOptions,
      },
      searchOptions: {
        ...DEFAULT_CONFIG.searchOptions,
        ...config.searchOptions,
      },
      boost: {
        ...DEFAULT_CONFIG.boost,
        ...config.boost,
      },
    }

    // Skip index initialization in server context
    if (typeof window === 'undefined') {
      return
    }

    // Initialize FlexSearch document index
    this.index = new Document({
      document: {
        id: 'id',
        index: this.config.fields || ['title', 'content', 'tags'],
        store: true,
      },
      ...this.config.indexOptions,
    })
  }

  /**
   * Add a document or array of documents to the search index
   * @param docs Document or documents to add
   */
  add(docs: SearchDocument | SearchDocument[]): void {
    const documents = Array.isArray(docs) ? docs : [docs]

    for (const doc of documents) {
      this.documents.set(doc.id, doc)
      if (typeof window !== 'undefined' && this.index) {
        this.index.add(doc)
      }
    }
  }

  /**
   * Remove a document or array of documents from the search index
   * @param ids ID or IDs of documents to remove
   */
  remove(ids: string | number | (string | number)[]): void {
    const idArray = Array.isArray(ids) ? ids : [ids]

    for (const id of idArray) {
      this.documents.delete(id)
      if (typeof window !== 'undefined' && this.index) {
        this.index.remove(id)
      }
    }
  }

  /**
   * Update a document in the search index
   * @param doc Document to update
   */
  update(doc: SearchDocument): void {
    this.remove(doc.id)
    this.add(doc)
  }

  /**
   * Clear the entire search index
   */
  clear(): void {
    this.documents.clear()

    // Skip recreating index in server context
    if (typeof window === 'undefined') {
      return
    }

    // Create a new index since FlexSearch doesn't have a clear method
    this.index = new Document({
      document: {
        id: 'id',
        index: this.config.fields || ['title', 'content', 'tags'],
        store: true,
      },
      ...this.config.indexOptions,
    })
  }

  /**
   * Search the index for documents matching the query
   * @param query Search query
   * @param options Search options
   * @returns Array of search results
   */
  search(query: string, options: Partial<SearchOptions> = {}): SearchResult[] {
    if (!query || query.trim() === '') {
      return []
    }

    // Not available in server context
    if (typeof window === 'undefined' || !this.index) {
      return []
    }

    // Combine default options with provided options
    const searchOptions = {
      ...this.config.searchOptions,
      ...options,
      enrich: true,
    }

    // Execute search across all fields
    const results = this.index.search(query, searchOptions)

    // Process and deduplicate results
    const uniqueResults = new Map<string | number, SearchResult>()

    for (const result of results) {
      for (const doc of result.result) {
        const docId = doc.id
        const existingDoc = uniqueResults.get(docId)

        // If document already exists in results, update score if higher
        if (existingDoc) {
          if (
            !existingDoc.score ||
            (doc.score && doc.score > existingDoc.score)
          ) {
            existingDoc.score = doc.score
          }
        } else {
          // Add original document from storage with score
          const originalDoc = this.documents.get(docId)
          if (originalDoc) {
            uniqueResults.set(docId, {
              ...originalDoc,
              score: doc.score,
            })
          }
        }
      }
    }

    // Convert to array and sort by score
    return Array.from(uniqueResults.values()).sort((a, b) => {
      return (b.score || 0) - (a.score || 0)
    })
  }

  /**
   * Get the total number of documents in the index
   * @returns Number of documents
   */
  get size(): number {
    return this.documents.size
  }

  /**
   * Get a document by ID
   * @param id Document ID
   * @returns Document or undefined if not found
   */
  getDocument(id: string | number): SearchDocument | undefined {
    return this.documents.get(id)
  }

  /**
   * Export all documents in the index
   * @returns Array of all documents
   */
  exportDocuments(): SearchDocument[] {
    return Array.from(this.documents.values())
  }

  /**
   * Import documents to the index
   * @param docs Documents to import
   */
  importDocuments(docs: SearchDocument[]): void {
    this.clear()
    this.add(docs)
  }
}

// Create and export a single search client instance
// Only initialize in browser context to avoid "Document is not a constructor" error
export const searchClient =
  typeof window !== 'undefined'
    ? new SearchClient()
    : (null as unknown as ISearchClient)

// Make it available on the window object when running in browser
if (typeof window !== 'undefined') {
  window.searchClient = searchClient
}

// Helper function to create a document for indexing
export function createSearchDocument(
  id: string | number,
  title: string,
  content: string,
  url: string,
  tags?: string[],
  category?: string,
): SearchDocument {
  return {
    id,
    title,
    content,
    url,
    tags,
    category,
  }
}
