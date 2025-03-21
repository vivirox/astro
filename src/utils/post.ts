import { getCollection } from 'astro:content'
import type { CollectionEntry } from 'astro:content'

type PostCollectionType = 'blog' | 'changelog'

/**
 * Retrieves filtered posts from the specified content collection.
 * In production, it filters out draft posts.
 *
 * @async
 * @param {PostCollectionType} contentCollectionType
 *  The type of the content collection to filter.
 * @returns {Promise<CollectionEntry<PostCollectionType>[]>}
 *  A promise that resolves to the filtered posts.
 */
export async function getFilteredPosts(
  contentCollectionType: PostCollectionType
): Promise<CollectionEntry<PostCollectionType>[]> {
  return await getCollection(
    contentCollectionType,
    ({ data }: { data: { draft?: boolean } }) => {
      return import.meta.env.PROD ? !data.draft : true
    }
  )
}

/**
 * Sorts an array of posts by their publication date in descending order.
 *
 * @param {CollectionEntry<PostCollectionType>[]} posts - An array of posts to sort.
 * @returns {CollectionEntry<PostCollectionType>[]} - The sorted array of posts.
 */
export function getSortedPosts(
  posts: CollectionEntry<PostCollectionType>[]
): CollectionEntry<PostCollectionType>[] {
  return posts.sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  )
}
