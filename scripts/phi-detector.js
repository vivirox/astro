#!/usr/bin/env node
/**
 * PHI (Protected Health Information) Detector
 *
 * This script scans files for potential PHI exposure and other HIPAA-related security issues.
 * It's designed to be used as part of a security scanning pipeline.
 *
 * Usage:
 *   node phi-detector.js [--path=<path>] [--output=<output-file>] [--format=json|text]
 */

const fs = require('fs')
const path = require('path')
const glob = require('glob')
const { execSync } = require('child_process')

// Configuration
const CONFIG = {
  path: process.cwd(),
  output: 'phi-scan-results.json',
  format: 'json',
  excludeDirs: ['node_modules', 'dist', 'build', 'coverage', '.git'],
  excludeFiles: [
    '*.test.ts',
    '*.test.tsx',
    '*.spec.ts',
    '*.spec.tsx',
    '*.min.js',
    '*.lock',
    'package-lock.json',
    'yarn.lock',
  ],
}

// Parse command line arguments
process.argv.slice(2).forEach((arg) => {
  const [key, value] = arg.split('=')
  if (key === '--path') CONFIG.path = value
  if (key === '--output') CONFIG.output = value
  if (key === '--format') CONFIG.format = value
})

// Patterns to detect potential PHI
const PHI_PATTERNS = [
  {
    name: 'SSN',
    pattern: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,
    severity: 'high',
    description: 'Potential Social Security Number detected',
  },
  {
    name: 'MRN',
    pattern: /\b(MRN|Medical Record Number|Patient ID)[\s:=-]*\d{4,10}\b/gi,
    severity: 'high',
    description: 'Potential Medical Record Number detected',
  },
  {
    name: 'DOB',
    pattern: /\b(DOB|Date of Birth)[\s:=-]*\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/gi,
    severity: 'high',
    description: 'Potential Date of Birth detected',
  },
  {
    name: 'PatientName',
    pattern:
      /\b(Patient Name|Patient)[\s:=-]*(Mr\.|Mrs\.|Ms\.|Dr\.)?[\s]*[A-Z][a-z]+\s[A-Z][a-z]+\b/gi,
    severity: 'high',
    description: 'Potential Patient Name detected',
  },
  {
    name: 'Email',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    severity: 'medium',
    description: 'Potential Email Address detected',
  },
  {
    name: 'Phone',
    pattern: /\b(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
    severity: 'medium',
    description: 'Potential Phone Number detected',
  },
  {
    name: 'Address',
    pattern:
      /\b\d{1,5}\s[A-Za-z0-9\s]{1,20}(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Court|Ct|Lane|Ln|Way)\b/gi,
    severity: 'medium',
    description: 'Potential Street Address detected',
  },
  {
    name: 'CreditCard',
    pattern: /\b(?:\d{4}[- ]?){3}\d{4}\b/g,
    severity: 'high',
    description: 'Potential Credit Card Number detected',
  },
  {
    name: 'IPAddress',
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    severity: 'low',
    description: 'Potential IP Address detected',
  },
  {
    name: 'ZipCode',
    pattern: /\b\d{5}(?:[-\s]\d{4})?\b/g,
    severity: 'medium',
    description: 'Potential Zip Code detected',
  },
  {
    name: 'MedicalCode',
    pattern: /\b[A-Z]\d{2}(?:\.\d{1,2})?\b/g, // ICD-10 codes
    severity: 'medium',
    description: 'Potential ICD-10 code detected',
  },
  {
    name: 'FHIRResourceID',
    pattern:
      /\b(Patient|Observation|Condition|Procedure|MedicationRequest)\/[a-zA-Z0-9-]{1,64}\b/g,
    severity: 'medium',
    description: 'Potential FHIR Resource ID detected',
  },
]

// HIPAA security rule patterns to check in code
const SECURITY_PATTERNS = [
  {
    name: 'InsecureTransport',
    pattern: /http:\/\/(?!localhost)/g,
    severity: 'high',
    description:
      'Non-HTTPS URL detected (HIPAA requires encryption in transit)',
  },
  {
    name: 'HardcodedCredentials',
    pattern:
      /(password|secret|key|token)[\s:=]*['"][^'"]{4,}['"](?!.*process\.env)/gi,
    severity: 'high',
    description: 'Potential hardcoded credentials detected',
  },
  {
    name: 'MissingAuthorization',
    pattern:
      /function\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*{(?![^}]*auth)(?![^}]*authorize)(?![^}]*permission)/g,
    severity: 'medium',
    description: 'Function potentially missing authorization checks',
  },
  {
    name: 'CORSAllOrigins',
    pattern: /Access-Control-Allow-Origin:\s*\*/g,
    severity: 'medium',
    description: 'CORS allowed for all origins, which is insecure for PHI',
  },
  {
    name: 'MissingAuditLogging',
    pattern:
      /(get|update|delete|create)\s*(?:Patient|Observation|Encounter|Condition).*\{(?![^}]*log)(?![^}]*audit)/gi,
    severity: 'high',
    description: 'PHI operation missing audit logging',
  },
]

// Results container
const results = {
  summary: {
    total_files_scanned: 0,
    files_with_phi: 0,
    total_findings: 0,
    high_severity: 0,
    medium_severity: 0,
    low_severity: 0,
  },
  findings: [],
}

// Get files to scan
function getFilesToScan() {
  // Get all files recursively, excluding specified directories and files
  const excludeDirsPattern = CONFIG.excludeDirs
    .map((dir) => `!(${dir})`)
    .join('/')
  const excludeFilesPattern = CONFIG.excludeFiles
    .join('|')
    .replace(/\./g, '\\.')
  const excludeFilesRegex = new RegExp(`(${excludeFilesPattern})$`)

  // Get git tracked files, or all files if not in a git repo
  let files = []
  try {
    // First try to get all git tracked files to avoid scanning build artifacts
    const gitOutput = execSync('git ls-files', { encoding: 'utf-8' })
    files = gitOutput.split('\n').filter(Boolean)
  } catch (e) {
    // If not in a git repo or git command fails, use glob
    files = glob.sync(`${excludeDirsPattern}/**/*`, {
      cwd: CONFIG.path,
      nodir: true,
      absolute: true,
    })
  }

  // Filter out excluded files
  return files.filter((file) => !excludeFilesRegex.test(file))
}

// Scan a file for PHI and security issues
function scanFile(filePath) {
  try {
    // Read file content
    const fullPath = path.resolve(CONFIG.path, filePath)
    const content = fs.readFileSync(fullPath, 'utf-8')
    let fileFindings = []

    // Scan for PHI patterns
    PHI_PATTERNS.forEach((pattern) => {
      const matches = content.match(pattern.pattern)
      if (matches) {
        // Track line numbers for each match
        let matchLineNumbers = []
        const lines = content.split('\n')
        lines.forEach((line, idx) => {
          if (pattern.pattern.test(line)) {
            matchLineNumbers.push(idx + 1)
          }
        })

        fileFindings.push({
          type: 'PHI',
          file: filePath,
          pattern: pattern.name,
          description: pattern.description,
          severity: pattern.severity,
          count: matches.length,
          lines: matchLineNumbers,
        })
      }
    })

    // Scan for security patterns
    SECURITY_PATTERNS.forEach((pattern) => {
      const matches = content.match(pattern.pattern)
      if (matches) {
        // Track line numbers for each match
        let matchLineNumbers = []
        const lines = content.split('\n')
        lines.forEach((line, idx) => {
          if (pattern.pattern.test(line)) {
            matchLineNumbers.push(idx + 1)
          }
        })

        fileFindings.push({
          type: 'SECURITY',
          file: filePath,
          pattern: pattern.name,
          description: pattern.description,
          severity: pattern.severity,
          count: matches.length,
          lines: matchLineNumbers,
        })
      }
    })

    return fileFindings
  } catch (error) {
    console.error(`Error scanning file ${filePath}: ${error.message}`)
    return []
  }
}

// Main function
function main() {
  console.log('PHI Detector: Starting scan...')
  const files = getFilesToScan()
  console.log(`Scanning ${files.length} files...`)

  // Scan each file
  files.forEach((file) => {
    results.summary.total_files_scanned++
    const fileFindings = scanFile(file)

    if (fileFindings.length > 0) {
      results.summary.files_with_phi++
      results.summary.total_findings += fileFindings.length

      // Update severity counters
      fileFindings.forEach((finding) => {
        if (finding.severity === 'high') results.summary.high_severity++
        if (finding.severity === 'medium') results.summary.medium_severity++
        if (finding.severity === 'low') results.summary.low_severity++
      })

      // Add to results
      results.findings = results.findings.concat(fileFindings)
    }
  })

  // Output results
  if (CONFIG.format === 'json') {
    fs.writeFileSync(CONFIG.output, JSON.stringify(results, null, 2))
    console.log(`Results written to ${CONFIG.output}`)
  } else {
    // Text output
    console.log('\nPHI Detector Results:')
    console.log(`Files scanned: ${results.summary.total_files_scanned}`)
    console.log(`Files with findings: ${results.summary.files_with_phi}`)
    console.log(`Total findings: ${results.summary.total_findings}`)
    console.log(`High severity: ${results.summary.high_severity}`)
    console.log(`Medium severity: ${results.summary.medium_severity}`)
    console.log(`Low severity: ${results.summary.low_severity}`)

    if (results.findings.length > 0) {
      console.log('\nDetailed Findings:')
      results.findings.forEach((finding) => {
        console.log(
          `\n[${finding.severity.toUpperCase()}] ${finding.type} - ${finding.pattern}`,
        )
        console.log(`File: ${finding.file}`)
        console.log(`Description: ${finding.description}`)
        console.log(`Lines: ${finding.lines.join(', ')}`)
      })
    }
  }

  // Return non-zero exit code if high severity findings exist
  if (results.summary.high_severity > 0) {
    console.error(
      `\n⚠️  WARNING: ${results.summary.high_severity} high severity findings detected!`,
    )
    process.exit(1)
  }

  console.log('PHI Detector: Scan completed.')
}

main()
