import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

// Get the current directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Read the ant-out.xml file
const xmlContent = fs.readFileSync('ant-out.xml', 'utf8')

// Regular expression to match file entries in the XML
const fileRegex = /<file path="([^"]+)">([\s\S]*?)<\/file>/g

// Create a directory if it doesn't exist
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
    console.log(`Created directory: ${dirPath}`)
  }
}

// Count of files extracted
let count = 0

// Match all file entries in the XML
let match
while ((match = fileRegex.exec(xmlContent)) !== null) {
  const filePath = match[1]
  const fileContent = match[2]

  // Skip .git files and other unwanted files/directories
  if (
    filePath.startsWith('.git/') ||
    filePath.startsWith('node_modules/') ||
    filePath.startsWith('.trunk/') ||
    filePath.endsWith('.DS_Store')
  ) {
    continue
  }

  // Create the full path to the file
  const fullPath = path.join(process.cwd(), filePath)

  // Ensure the directory exists
  ensureDirectoryExists(path.dirname(fullPath))

  // Write the file content
  fs.writeFileSync(fullPath, fileContent)

  console.log(`Extracted: ${filePath}`)
  count++
}

console.log(`Total files extracted: ${count}`)

// Now execute the command to list the extracted Astro files
console.log('\nExtracted Astro files:')
try {
  const astroFiles = execSync('find src -name "*.astro" | sort', {
    encoding: 'utf8',
  })
  console.log(astroFiles)
} catch (error) {
  console.error('Error listing Astro files:', error.message)
}
