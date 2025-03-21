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

// Function to replace date: with pubDate: in frontmatter
function fixFrontmatter(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')

    // Only replace 'date:' in the frontmatter (between the --- markers)
    const parts = content.split('---')
    if (parts.length >= 3) {
      // Has frontmatter
      const frontmatter = parts[1]
      const updatedFrontmatter = frontmatter.replace(/date:/g, 'pubDate:')

      // If changes were made, update the file
      if (frontmatter !== updatedFrontmatter) {
        parts[1] = updatedFrontmatter
        const updatedContent = parts.join('---')
        fs.writeFileSync(filePath, updatedContent, 'utf8')
        console.log(`Updated: ${filePath}`)
        return true
      }
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
    if (fixFrontmatter(filePath)) {
      updatedCount++
    }
  })

  console.log(`Updated ${updatedCount} files.`)
}

main()
