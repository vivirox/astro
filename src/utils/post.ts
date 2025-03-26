import type { CollectionEntry } from 'astro:content'

export type PostCollectionType = 'blog' | 'docs'

export interface PostData {
  title?: string
  description?: string
  toc?: boolean
  ogImage?: string
  pubDate: Date
  tags?: string[]
  author?: string
  lastModDate?: Date
  share?: boolean
  draft?: boolean
}

export function filterDrafts<T extends { data: { draft?: boolean } }>(
  entries: T[],
): T[] {
  return entries.filter((entry) => !entry.data.draft)
}

export function sortByDate<T extends { data: { pubDate: Date } }>(
  entries: T[],
): T[] {
  return entries.sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  )
}

export async function getCollection(
  contentCollectionType: PostCollectionType,
  filterFn?: (entry: CollectionEntry<'blog' | 'docs'>) => boolean,
): Promise<CollectionEntry<'blog' | 'docs'>[]> {
  const { getCollection } = await import('astro:content')
  const entries = await getCollection(contentCollectionType, filterFn)
  return entries
}

export function sortPosts(
  posts: CollectionEntry<'blog' | 'docs'>[],
): CollectionEntry<'blog' | 'docs'>[] {
  return posts.sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  )
}

export function filterDraftPosts() {
  return function (entry: CollectionEntry<'blog' | 'docs'>) {
    return !entry.data.draf
  }
}
