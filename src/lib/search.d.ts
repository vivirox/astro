interface SearchDocument {
  id: string
  title: string
  content: string
  url: string
  tags?: string[]
  category?: string
}

interface SearchClient {
  search: (query: string) => SearchDocument[]
  importDocuments: (documents: SearchDocument[]) => void
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

export { SearchDocument, SearchClient }
