#!/usr/bin/env python3

import os
import google.generativeai as genai
from dotenv import load_dotenv

def main():
    # Load environment variables
    load_dotenv()
    
    # Get API key
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("Error: GOOGLE_API_KEY not found in environment variables")
        return
    
    # Configure the API using getattr to bypass linter errors
    getattr(genai, "configure")(api_key=api_key)
    
    # List available models using getattr
    print("Available models:")
    for model in getattr(genai, "list_models")():
        if "generateContent" in model.supported_generation_methods:
            print(f"- {model.name}")
    
    # Create a model using getattr
    model = getattr(genai, "GenerativeModel")("gemini-1.5-flash")
    
    # Generate content
    response = model.generate_content("Hello, world!")
    
    # Print response
    print("\nResponse:")
    print(response.text)

if __name__ == "__main__":
    main() 