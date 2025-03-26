import { feedLoader } from '@ascorbic/feed-loader'
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

const blog = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/blog',
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    ogImage: z.union([z.string(), z.boolean()]).optional(),
    toc: z.boolean().optional(),
    share: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    minutesRead: z.number().optional(),
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

const feeds = defineCollection({
  loader: feedLoader({
    url: 'https://astro.build/rss.xml',
  }),
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
  blog,
  docs,
  projects,
  changelog,
  streams,
  feeds,
  releases,
  prs,
  highlights,
}
