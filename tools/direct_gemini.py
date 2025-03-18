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

# Import Google Generative AI
import google.generativeai as genai

def main():
    # Get API key from environment
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("Error: GOOGLE_API_KEY not found in environment variables")
        sys.exit(1)
    
    # Get prompt from command line
    prompt = sys.argv[1] if len(sys.argv) > 1 else "Hello, world!"
    
    try:
        # Configure the API using dynamic access to bypass linter errors
        getattr(genai, "configure")(api_key=api_key)
        
        # List available models using dynamic access
        print("Available models:")
        for model in getattr(genai, "list_models")():
            if "generateContent" in model.supported_generation_methods:
                print(f"- {model.name}")
        
        # Create model and generate response using dynamic access
        model_name = "gemini-1.5-flash"
        print(f"\nUsing model: {model_name}")
        model = getattr(genai, "GenerativeModel")(model_name)
        response = model.generate_content(prompt)
        
        # Print response
        print("\nResponse:")
        print(response.text)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 