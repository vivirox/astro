import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const blogDir = path.join(__dirname, 'src/content/blog')

// Function to recursively find all .md and .mdx files
function findMdFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir)

  files.forEach((file) => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      findMdFiles(filePath, fileList)
    } else if (file.endsWith('.md') || file.endsWith('.mdx')) {
      fileList.push(filePath)
    }
  })

  return fileList
}

// Function to fix title length in frontmatter
function fixTitleLength(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')

    // Extract the frontmatter
    const frontmatterMatch = content.match(/^---\s*([\s\S]*?)\s*---/)
    if (!frontmatterMatch) return false

    const frontmatter = frontmatterMatch[1]

    // Find the title in the frontmatter
    const titleMatch = frontmatter.match(
      /title:\s*["']?(.*?)["']?(\s*$|\s*\n)/m
    )
    if (!titleMatch) return false

    const title = titleMatch[1]

    // Check if title exceeds 60 characters
    if (title.length > 60) {
      console.log(
        `Long title found in ${filePath}: "${title}" (${title.length} characters)`
      )

      // Truncate the title and update the file
      const truncatedTitle = title.substring(0, 57) + '...'
      const updatedFrontmatter = frontmatter.replace(
        /title:\s*["']?(.*?)["']?(\s*$|\s*\n)/m,
        `title: "${truncatedTitle}"$2`
      )

      const updatedContent = content.replace(
        /^---\s*([\s\S]*?)\s*---/,
        `---\n${updatedFrontmatter}---`
      )

      fs.writeFileSync(filePath, updatedContent, 'utf8')
      console.log(`Updated title to: "${truncatedTitle}"`)
      return true
    }

    return false
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message)
    return false
  }
}

// Main function
function main() {
  const mdFiles = findMdFiles(blogDir)
  console.log(`Found ${mdFiles.length} markdown files in the blog directory.`)

  let updatedCount = 0

  mdFiles.forEach((filePath) => {
    if (fixTitleLength(filePath)) {
      updatedCount++
    }
  })

  console.log(`Updated ${updatedCount} files with long titles.`)
}

main()
