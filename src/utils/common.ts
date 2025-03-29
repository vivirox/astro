import type { VNode } from 'vue'
import type { NavBarLayout } from '../types'
import type { ProjectGroupsSchema } from '~/content/schema'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'

/**
 * Slugify a string
 */
export function slug(text: string) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

/**
 * Extract icons starting with 'i' from project groups
 */
export function extractIconsStartingWithI(data: ProjectGroupsSchema): string[] {
  const icons = new Set<string>()

  for (const [_, projects] of Object.entries(data)) {
    for (const project of projects) {
      if (project.icon?.startsWith('i')) {
        icons.add(project.icon)
      }
    }
  }

  return Array.from(icons)
}

/**
 * Get URL from paths
 */
export function getUrl(...paths: string[]): string {
  return paths.join('/')
}

/**
 * Ensure trailing slash
 */
export function ensureTrailingSlash(pathname: string): string {
  return pathname.endsWith('/') ? pathname : `${pathname}/`
}

export interface NavBarGroup {
  name?: string
  link?: string
  desc?: string
  icon?: string
  projects?: Array<{
    name?: string
    link?: string
    desc?: string
    icon?: string
  }>
}

export function getNavBarGroups(): NavBarGroup[] {
  return [
    {
      name: 'Projects',
      link: '/projects',
      desc: 'View all projects',
      icon: 'folder',
      projects: [
        {
          name: 'Sample Project',
          link: '/projects/sample',
          desc: 'A sample project',
          icon: 'code',
        },
      ],
    },
  ]
}

export async function checkFileExistsInDir(
  path: string,
  filename: string,
): Promise<boolean> {
  try {
    const fullPath = join(path, filename)
    await fs.access(fullPath)
    return true
  } catch {
    return false
  }
}

/**
 * Unescape HTML entities
 */
export function unescapeHTML(node: VNode): VNode {
  if (typeof node.children === 'string') {
    return {
      ...node,
      children: node.children
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'"),
    }
  }

  if (Array.isArray(node.children)) {
    return {
      ...node,
      children: node.children.map((child) =>
        typeof child === 'object' ? unescapeHTML(child as VNode) : child,
      ),
    }
  }

  return node
}

/**
 * Validate navbar layout
 */
export function validateNavBarLayout(layout: NavBarLayout) {
  const totalItems = layout.left.length + layout.right.length
  return {
    isValid: totalItems > 0 && totalItems <= 5,
    message: totalItems > 5 ? 'Maximum 5 items allowed in total' : '',
  }
}
