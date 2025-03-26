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
    return !entry.data.draft
  }
}

/**
 * Get filtered and sorted posts for a collection
 * @param collectionType The collection type ('blog' or 'docs')
 * @param filterFn Optional custom filter function
 * @returns Filtered and sorted posts
 */
export async function getFilteredPosts(
  collectionType: PostCollectionType,
  filterFn?: (entry: CollectionEntry<'blog' | 'docs'>) => boolean,
): Promise<CollectionEntry<'blog' | 'docs'>[]> {
  // Get all posts
  const posts = await getCollection(collectionType, filterFn)

  // Filter out drafts in production (unless explicitly filtered)
  const filteredPosts =
    process.env.NODE_ENV === 'production' && !filterFn
      ? filterDrafts(posts)
      : posts

  // Sort by date
  return sortPosts(filteredPosts)
}

/**
 * Get sorted posts for a collection (without draft filtering)
 * @param collectionType The collection type ('blog' or 'docs')
 * @param filterFn Optional custom filter function
 * @returns Sorted posts
 */
export async function getSortedPosts(
  collectionType: PostCollectionType,
  filterFn?: (entry: CollectionEntry<'blog' | 'docs'>) => boolean,
): Promise<CollectionEntry<'blog' | 'docs'>[]> {
  const posts = await getCollection(collectionType, filterFn)
  return sortPosts(posts)
}
