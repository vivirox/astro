// Type declarations for flexsearch modules
declare module 'flexsearch/dist/module/document' {
  export default class Document {
    constructor(options: any)
    add(doc: any): void
    remove(id: string | number): void
    search(query: string, options?: any): any[]
  }
}

declare module 'flexsearch' {
  export class Document {
    constructor(options: any)
    add(doc: any): void
    remove(id: string | number): void
    search(query: string, options?: any): any[]
  }
}
