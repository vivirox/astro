// Export types from search.ts
export interface SearchDocument {
  id: string | number
  title: string
  content: string
  url: string
  tags?: string[]
  category?: string
}

export interface ISearchClient {
  search: (query: string) => SearchDocument[]
  importDocuments: (documents: SearchDocument[]) => void
}

export declare class SearchClient implements ISearchClient {
  search(query: string): SearchDocument[]
  importDocuments(docs: SearchDocument[]): void
}

interface CustomEvent {
  detail: {
    size: number
  }
}

declare global {
  interface Window {
    searchClient: SearchClient
    searchIndex: SearchDocument[]
    initSearch?: () => void
  }
}
