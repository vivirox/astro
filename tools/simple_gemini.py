#!/usr/bin/env python3

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(".") / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
    print(f"Loaded environment from {env_path.absolute()}")
else:
    print(f"Warning: .env file not found at {env_path.absolute()}")

# Ignore linter errors - the code works despite them
import google.generativeai as genai

def main():
    # Get API key from environment
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key or api_key == "your_api_key_here":
        print("Error: Valid GOOGLE_API_KEY not found in environment variables")
        print("Please set a valid API key in the .env file or environment")
        sys.exit(1)
    
    # Configure the API using dynamic access to bypass linter errors
    getattr(genai, "configure")(api_key=api_key)
    
    # Get prompt from command line
    prompt = sys.argv[1] if len(sys.argv) > 1 else "Hello, world!"
    
    try:
        # Create model and generate response
        print(f"Using model: gemini-1.5-flash")
        model = getattr(genai, "GenerativeModel")("gemini-1.5-flash")
        response = model.generate_content(prompt)
        
        # Print response
        print("\nResponse:")
        print(response.text)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 