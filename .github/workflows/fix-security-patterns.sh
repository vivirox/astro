#!/bin/bash

# Create healthcare patterns file with proper escaping
cat > healthcare-patterns.json << 'EOF'
{
  "EHR_API_KEY": {
    "description": "EHR API Key Pattern",
    "pattern": "(?i)(epic|cerner|allscripts|athena)([_-]?api[_-]?key|apikey)([^a-zA-Z0-9]|$){0,1}[=:\"\\s'\`]{1,2}([a-zA-Z0-9=_\\-\\+/]{16,45})"
  },
  "FHIR_TOKEN": {
    "description": "FHIR Access Token Pattern",
    "pattern": "(?i)(fhir[_-]?token|fhir[_-]?access[_-]?token)([^a-zA-Z0-9]|$){0,1}[=:\"\\s'\`]{1,2}([a-zA-Z0-9=_\\-\\+/\\.]{32,250})"
  },
  "PATIENT_ID": {
    "description": "Patient ID Pattern",
    "pattern": "(?i)(patient[_-]?id|mrn|medical[_-]?record[_-]?number)([^a-zA-Z0-9]|$){0,1}[=:\"\\s'\`]{1,2}([A-Z0-9]{6,15})"
  }
}
EOF

echo "Healthcare patterns file created successfully"
