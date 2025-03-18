# Gemini API Integration

## Setup

The Google API key is already set in the `.env` file.

## Usage

Run one of the test scripts:

```bash
# Simple test script
conda activate gradiant && tools/simple_gemini.py "Your prompt here"

# Advanced script that lists available models
conda activate gradiant && tools/direct_gemini.py "Your prompt here"
```

Or use the main LLM API (may require additional dependencies):

```bash
conda activate gradiant && tools/llm_api.py --prompt "Your prompt here" --provider gemini
```

## Available Models

The following Gemini models are available:
- gemini-1.5-flash (recommended)
- gemini-1.5-pro
- gemini-2.0-flash
- gemini-2.0-pro-exp

## Troubleshooting

If you see linter errors like:
```
"configure" is not exported from module "google.generativeai"
"GenerativeModel" is not exported from module "google.generativeai"
```

These are false positives. The code works correctly despite these errors.

If you get an error about missing dependencies:
```bash
conda activate gradiant && pip install google-generativeai dotenv absl-py
``` 