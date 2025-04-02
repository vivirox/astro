import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import { blogSearch } from '@/lib/search'

let isIndexed = false

async function indexPosts() {
  if (isIndexed) {
    return
  }

  const posts = await getCollection('blog')
  for (const post of posts) {
    const { Content } = await post.render()
    const content = Content.toString()
    blogSearch.addPost(post, content)
  }
  isIndexed = true
}

// Redirect to the versioned API endpoint
export const GET: APIRoute = async ({ url, request }) => {
  const newUrl = new URL(url)
  newUrl.pathname = '/api/v1/search' + newUrl.pathname.substring('/api/search'.length)

  return new Response(null, {
    status: 307, // Temporary redirect
    headers: {
      'Location': newUrl.toString(),
      'X-API-Deprecation-Warning': 'This endpoint is deprecated. Please use /api/v1/search instead.',
    },
  })
}
