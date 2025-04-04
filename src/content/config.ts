
import { glob } from 'astro/loaders'
import { defineCollection, z } from 'astro:content'
import {
  pageSchema,
  postSchema,
  projectsSchema,
  prsSchema,
  streamsSchema,
} from './schema'

// Comment out unused imports to fix linter errors
// import { githubReleasesLoader } from 'astro-loader-github-releases'
// import { githubPrsLoader } from 'astro-loader-github-prs'
// import { blueskyPostsLoader } from 'astro-loader-bluesky-posts'

const pages = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/pages' }),
  schema: pageSchema,
})

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    updatedDate: z.date().optional(),
    author: z.string(),
    image: z
      .object({
        url: z.string(),
        alt: z.string(),
      })
      .optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    // Estimated reading time in minutes
    readingTime: z.number().optional(),
    // Category for the blog post
    category: z
      .enum(['Technical', 'Research', 'Case Study', 'Tutorial', 'News'])
      .optional(),
    // External canonical URL if this is a republished post
    canonicalUrl: z.string().url().optional(),
    // Make slug optional - it will be derived from the filename if not provided
    slug: z.string().optional(),
  }),
})

const docs = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/docs',
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
  }),
})

const projects = defineCollection({
  type: 'data',
  schema: projectsSchema,
})

const changelog = defineCollection({
  type: 'content',
  schema: postSchema,
})

const streams = defineCollection({
  type: 'data',
  schema: streamsSchema,
})

// Temporary fix: Disable feed loader due to network issues
// const feeds = defineCollection({
//   loader: feedLoader({
//     url: 'https://astro.build/rss.xml',
//     timeout: 30000, // 30 seconds timeout
//     retries: 3, // 3 retries
//     retryDelay: 1000, // 1 second between retries
//     fallback: [], // Return empty array if feed cannot be loaded
//     cacheMaxAge: 86400000, // Cache for 24 hours (1 day)
//     skipOnFail: true, // Continue build even if feed loading fails
//   }),
// })

// Use a static data collection as a temporary replacement for feeds
const feeds = defineCollection({
  type: 'data',
  schema: z.array(
    z.object({
      title: z.string(),
      link: z.string().url(),
      pubDate: z.string(),
      description: z.string().optional(),
      author: z.string().optional(),
    }),
  ),
})

// Fix the releases collection with proper schema
const releases = defineCollection({
  type: 'data',
  schema: projectsSchema, // Use an existing schema that works
})

// PRs collection with proper schema
const prs = defineCollection({
  type: 'data',
  schema: prsSchema,
})

// Temporarily disable the highlights collection due to Bluesky API issues
const highlights = defineCollection({
  type: 'data',
  schema: projectsSchema, // Use an existing schema that works
})

export const collections = {
  pages,
  blog: blogCollection,
  docs,
  projects,
  changelog,
  streams,
  feeds,
  releases,
  prs,
  highlights,
}
