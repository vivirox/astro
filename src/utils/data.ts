import type { CollectionEntry } from 'astro:content'
import type { CardItemData } from '~/components/views/CardItem.astro'
import type { GitHubView } from '~/types'

import {
  AppBskyEmbedExternal,
  AppBskyEmbedImages,
  AppBskyEmbedRecord,
  AppBskyEmbedRecordWithMedia,
  AppBskyEmbedVideo,
} from '@atproto/api'
import { atUriToPostUri } from 'astro-loader-bluesky-posts'

// Define the types for Bluesky embed views
type AppBskyEmbedImagesView = ReturnType<typeof AppBskyEmbedImages.isView> & {
  images: { thumb: string; alt: string }[]
}

type AppBskyEmbedVideoView = ReturnType<typeof AppBskyEmbedVideo.isView> & {
  cid: string
  alt?: string
  thumbnail?: string
}

type AppBskyEmbedExternalView = ReturnType<
  typeof AppBskyEmbedExternal.isView
> & {
  external: {
    uri: string
    title: string
    description: string
    thumb?: string
  }
}

type AppBskyEmbedRecordView = ReturnType<typeof AppBskyEmbedRecord.isView> & {
  record?: {
    uri: string
    value: { text: string }
    author: {
      handle: string
      avatar?: string
      displayName?: string
    }
  }
}

type AppBskyEmbedRecordWithMediaView = ReturnType<
  typeof AppBskyEmbedRecordWithMedia.isView
> & {
  record?: {
    record?: {
      uri: string
      value: { text: string }
      author: {
        handle: string
        avatar?: string
        displayName?: string
      }
    }
  }
  media?:
    | AppBskyEmbedImagesView
    | AppBskyEmbedVideoView
    | AppBskyEmbedExternalView
}

// Define the structure for the highlights collection entry data
export type HighlightEntry = CollectionEntry<'highlights'>

// Define the actual structure used in highlights data
interface BlueskyPost {
  indexedAt?: string
  html?: string
  link?: string
  embed?:
    | AppBskyEmbedImagesView
    | AppBskyEmbedVideoView
    | AppBskyEmbedExternalView
  author?: {
    did: string
    handle: string
    displayName?: string
    avatar?: string
  }
  record?: {
    uri: string
    value: { text: string }
    author: {
      handle: string
      avatar?: string
      displayName?: string
    }
  }
}

interface BlueskyReply {
  html?: string
}

// Custom interface for the highlights data structure
interface HighlightDataWithBluesky {
  post?: BlueskyPost
  replies?: BlueskyReply[]
}

// The actual schema used in the project (from config.ts)
// Using underscore prefix to avoid eslint unused variable warning
export interface HighlightData {
  projects?: Record<
    string,
    { name: string; link: string; desc: string; icon: string }[]
  >
}

export const VERSION_COLOR = {
  major: 'bg-rose:15 text-rose-7 dark:text-rose-3',
  minor: 'bg-purple:15 text-purple-7 dark:text-purple-3',
  patch: 'bg-green:15 text-green-7 dark:text-green-3',
  pre: 'bg-teal:15 text-teal-7 dark:text-teal-3',
}

/**
 * Matches the input string against the rules in `UI.githubView.mainLogoOverrides`
 * or `UI.githubView.subLogoMatches`, and returns the matching URL/Icon.
 */
export function matchLogo(
  input: string,
  logos: GitHubView['mainLogoOverrides'] | GitHubView['subLogoMatches'],
) {
  for (const [pattern, logo] of logos) {
    if (typeof pattern === 'string') {
      if (input === pattern) {
        return logo
      }
    } else if (pattern instanceof RegExp) {
      if (pattern.test(input)) {
        return logo
      }
    }
  }
  return undefined
}

/**
 * Extracts the package name (before the `@` version part) from a `tagName`.
 */
export function extractPackageName(tagName: string) {
  const match = tagName.match(/(^@?[^@]+)@/)
  if (match) return match[1]
  return tagName
}

/**
 * Extracts the version number from a `tagName`.
 */
export function extractVersionNum(tagName: string) {
  // Use a more specific pattern to avoid backtracking
  const match = tagName.match(/^\D*(\d+\.\d+\.\d+(?:-[a-z0-9.]+)?)/i)
  if (match) return match[1]
  return tagName
}

/**
 * Processes the version number and return the highlighted and non-highlighted parts.
 */
export function processVersion(
  versionNum: string,
): ['major' | 'minor' | 'patch' | 'pre', string, string] {
  const parts = versionNum.split(/(\.)/g)
  let highlightedIndex = -1
  let versionType: 'major' | 'minor' | 'patch' | 'pre'

  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i] !== '.') {
      const num = +parts[i]
      if (!Number.isNaN(num) && num > 0) {
        highlightedIndex = i
        break
      }
    }
  }

  if (highlightedIndex === 0) {
    versionType = 'major'
  } else if (highlightedIndex === 2) {
    versionType = 'minor'
  } else if (highlightedIndex === 4) {
    versionType = 'patch'
  } else {
    versionType = 'pre'
  }

  const nonHighlightedPart = parts.slice(0, highlightedIndex).join('')
  const highlightedPart = parts.slice(highlightedIndex).join('')

  return [versionType, nonHighlightedPart, highlightedPart]
}

/**
 * Processes Bluesky posts and converts them into `CardItemData` interface.
 */
export function processBlueskyPosttts(data: HighlightEntry[]): CardItemData[] {
  const cards: CardItemData[] = []

  for (const item of data) {
    try {
      // Use type assertion to ensure TypeScript recognizes the correct structure
      const { post, replies } = item.data as unknown as HighlightDataWithBluesky

      // Skip if post is undefined
      if (!post) {
        // Log a warning message
        console.warn('Skipping undefined post')
        continue
      }

      const { indexedAt, html, link, embed, author } = post

      // Skip if required fields are missing
      if (!indexedAt || !html || !link || !author) {
        console.warn('Skipping post with missing required fields')
        continue
      }

      const card: CardItemData = {
        date: indexedAt,
        html,
        link,
      }

      if (embed) {
        if (AppBskyEmbedImages.isView(embed)) {
          const typedEmbed = embed as unknown as AppBskyEmbedImagesView
          card.images = typedEmbed.images.map(
            (img: { thumb: string; alt: string }) => ({
              src: img.thumb,
              alt: img.alt,
            }),
          )
        }

        if (AppBskyEmbedVideo.isView(embed)) {
          const typedEmbed = embed as unknown as AppBskyEmbedVideoView
          card.video = {
            src: `https://bsky.social/xrpc/com.atproto.sync.getBlob?did=${author.did}&cid=${typedEmbed.cid}`,
            alt: typedEmbed.alt ?? '',
            thumbnail: typedEmbed.thumbnail ?? '',
          }
        }

        if (AppBskyEmbedExternal.isView(embed)) {
          const typedEmbed = embed as unknown as AppBskyEmbedExternalView
          card.external = {
            uri: typedEmbed.external.uri,
            title: typedEmbed.external.title,
            description: typedEmbed.external.description,
            thumb: typedEmbed.external.thumb ?? '',
          }
        }

        if (AppBskyEmbedRecord.isView(embed)) {
          const typedEmbed = embed as unknown as AppBskyEmbedRecordView
          if (AppBskyEmbedRecord.isViewRecord(typedEmbed.record)) {
            const { uri, value, author: embedAuthor } = typedEmbed.record

            if (uri && value && embedAuthor) {
              card.quote = {
                uri: atUriToPostUri(uri),
                text: value.text as string,
                author: {
                  link: `https://bsky.app/profile/${embedAuthor.handle}`,
                  avatar: embedAuthor.avatar ?? '',
                  name: embedAuthor.displayName ?? '',
                  handle: embedAuthor.handle,
                },
              }
            }
          }
        }

        if (AppBskyEmbedRecordWithMedia.isView(embed)) {
          const typedEmbed = embed as unknown as AppBskyEmbedRecordWithMediaView
          const { record, media } = typedEmbed

          if (media) {
            if (AppBskyEmbedImages.isView(media)) {
              const typedMedia = media as unknown as AppBskyEmbedImagesView
              card.images = typedMedia.images.map(
                (img: { thumb: string; alt: string }) => ({
                  src: img.thumb,
                  alt: img.alt,
                }),
              )
            }

            if (AppBskyEmbedVideo.isView(media)) {
              const typedMedia = media as unknown as AppBskyEmbedVideoView
              card.video = {
                src: `https://bsky.social/xrpc/com.atproto.sync.getBlob?did=${author.did}&cid=${typedMedia.cid}`,
                alt: typedMedia.alt ?? '',
                thumbnail: typedMedia.thumbnail ?? '',
              }
            }

            if (AppBskyEmbedExternal.isView(media)) {
              const typedMedia = media as unknown as AppBskyEmbedExternalView
              card.external = {
                uri: typedMedia.external.uri,
                title: typedMedia.external.title,
                description: typedMedia.external.description,
                thumb: typedMedia.external.thumb ?? '',
              }
            }
          }

          if (
            record?.record &&
            AppBskyEmbedRecord.isViewRecord(record.record)
          ) {
            const { uri, value, author: recordAuthor } = record.record

            if (uri && value && recordAuthor) {
              card.quote = {
                uri: atUriToPostUri(uri),
                text: value.text as string,
                author: {
                  link: `https://bsky.app/profile/${recordAuthor.handle}`,
                  avatar: recordAuthor.avatar ?? '',
                  name: recordAuthor.displayName ?? '',
                  handle: recordAuthor.handle,
                },
              }
            }
          }
        }
      }

      if (replies && Array.isArray(replies) && replies.length > 0) {
        card.details = replies
          .filter(
            (reply): reply is { html: string } => reply?.html !== undefined,
          )
          .map((reply) => reply.html)
      }

      cards.push(card)
    } catch (error) {
      console.error('Error processing Bluesky post:', error)
      continue
    }
  }
  return cards
}

// Replace problematic regex with more efficient patterns
const ID_PATTERN = /^[a-z0-9][-a-z0-9]*?\d$/
const NUMERIC_ID_PATTERN = /^\d+$/
const ALPHANUMERIC_ID_PATTERN = /^[a-z0-9][-a-z0-9]*$/

export function extractId(input: string): number | null {
  if (NUMERIC_ID_PATTERN.test(input)) {
    return Number.parseInt(input, 10)
  }

  const match = ID_PATTERN.exec(input)
  if (match) {
    return Number.parseInt(match[2], 10)
  }

  return null
}

export function validateId(id: string): boolean {
  return ALPHANUMERIC_ID_PATTERN.test(id)
}

export interface ExampleCardData {
  title: string
  description?: string
  image?: string
  link?: string
  tags?: string[]
  date?: Date
  author?: string
}

export function getCardData(): ExampleCardData[] {
  return [
    {
      title: 'Example Card',
      description: 'This is an example card',
      image: '/images/example.jpg',
      link: '/example',
      tags: ['example', 'card'],
      date: new Date(),
      author: 'John Doe',
    },
  ]
}
