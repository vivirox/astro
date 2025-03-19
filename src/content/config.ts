import { defineCollection, z } from "astro:content";

// Define the blog collection schema
const blogCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    author: z.string(),
    date: z.string(),
    readingTime: z.string().optional(),
    tags: z.array(z.string()).optional(),
    series: z.string().optional(),
    seriesOrder: z.number().optional(),
    image: z.string().optional(),
    draft: z.boolean().optional().default(false),
  }),
});

// Export the collections
export const collections = {
  blog: blogCollection,
};
