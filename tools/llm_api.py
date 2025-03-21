
#!~/.venv/ ~/.venv/bin/env/python

import argparse
import base64
import mimetypes
import os
import sys
import time
from pathlib import Path
from typing import Any, Optional

import google.generativeai as genai
from anthropic import Anthropic
from dotenv import load_dotenv
from openai import AzureOpenAI, OpenAI

from tools.token_tracker import APIResponse, TokenUsage, get_token_tracker


def load_environment():
    """Load environment variables from .env files in order of precedence"""
    # Order of precedence:
    # 1. System environment variables (already loaded)
    # 2. .env.local (user-specific overrides)
    # 3. .env (project defaults)
    # 4. .env.example (example configuration)

    env_files = [".env.local", ".env", ".env.example"]
    env_loaded = False

    print("Current working directory:", Path(".").absolute(), file=sys.stderr)
    print("Looking for environment files:", env_files, file=sys.stderr)

    for env_file in env_files:
        env_path = Path(".") / env_file
        print(f"Checking {env_path.absolute()}", file=sys.stderr)
        if env_path.exists():
            print(f"Found {env_file}, loading variables...", file=sys.stderr)
            load_dotenv(dotenv_path=env_path)
            env_loaded = True
            print(f"Loaded environment variables from {env_file}", file=sys.stderr)
            # Print loaded keys (but not values for security)
            with open(env_path) as f:
                keys = [
                    line.split("=")[0].strip()
                    for line in f
                    if "=" in line and not line.startswith("#")
                ]
                print(f"Keys loaded from {env_file}: {keys}", file=sys.stderr)

    if not env_loaded:
        print(
            "Warning: No .env files found. Using system environment variables only.",
            file=sys.stderr,
        )
        print(
            "Available system environment variables:",
            list(os.environ.keys()),
            file=sys.stderr,
        )


# Load environment variables at module import
load_environment()


def encode_image_file(image_path: str) -> tuple[str, str]:
    """
    Encode an image file to base64 and determine its MIME type.

    Args:
        image_path (str): Path to the image file

    Returns:
        tuple: (base64_encoded_string, mime_type)
    """
    mime_type, _ = mimetypes.guess_type(image_path)
    if not mime_type:
        mime_type = "image/png"  # Default to PNG if type cannot be determined

    with open(image_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode("utf-8")

    return encoded_string, mime_type


def create_llm_client(provider="openai"):
    """
    Create and return an LLM client based on the specified provider.

    Args:
        provider (str): The provider name ('openai', 'azure', 'deepseek', 'anthropic', 'gemini', 'local')

    Returns:
        Any: The appropriate client for the specified provider
    """
    if provider == "openai":
        api_key = os.getenv("OPENAI_API_KEY")
        base_url = os.getenv("OPENAI_BASE_URL")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not found in environment variables")
        return OpenAI(api_key=api_key, base_url=base_url)
    elif provider == "azure":
        api_key = os.getenv("AZURE_OPENAI_API_KEY")
        if not api_key:
            raise ValueError("AZURE_OPENAI_API_KEY not found in environment variables")
        return AzureOpenAI(
            api_key=api_key,
            api_version="2024-08-01-preview",
            azure_endpoint="https://msopenai.openai.azure.com",
        )
    elif provider == "deepseek":
        api_key = os.getenv("DEEPSEEK_API_KEY")
        if not api_key:
            raise ValueError("DEEPSEEK_API_KEY not found in environment variables")
        return OpenAI(
            api_key=api_key,
            base_url="https://api.deepseek.com/v1",
        )
    elif provider == "anthropic":
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not found in environment variables")
        return Anthropic(api_key=api_key)
    elif provider == "gemini":
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found in environment variables")
        # Set the API key directly instead of using configure
        os.environ["GOOGLE_API_KEY"] = api_key
        return genai
    elif provider == "local":
        return OpenAI(base_url="http://192.168.180.137:8006/v1", api_key="not-needed")
    else:
        raise ValueError(f"Unsupported provider: {provider}")


def query_llm(
    prompt: str,
    client: Any = None,
    model: Optional[str] = None,
    provider: str = "openai",
    image_path: Optional[str] = None,
) -> Optional[str]:
    """
    Query an LLM with a prompt and optional image attachment.

    Args:
        prompt (str): The text prompt to send
        client (Any): The LLM client instance
        model (str, optional): The model to use
        provider (str): The API provider to use
        image_path (str, optional): Path to an image file to attach

    Returns:
        Optional[str]: The LLM's response or None if there was an error
    """
    if client is None:
        client = create_llm_client(provider)

    try:
        # Set default model
        if model is None:
            if provider == "openai":
                model = "gpt-4o"
            elif provider == "azure":
                model = os.getenv(
                    "AZURE_OPENAI_MODEL_DEPLOYMENT", "gpt-4o-ms"
                )  # Get from env with fallback
            elif provider == "deepseek":
                model = "deepseek-chat"
            elif provider == "anthropic":
                model = "claude-3-7-sonnet-20250219"
            elif provider == "gemini":
                model = "gemini-2.0-flash-exp"
            elif provider == "local":
                model = "Qwen/Qwen2.5-32B-Instruct-AWQ"

        start_time = time.time()
        if provider in ["openai", "local", "deepseek", "azure"]:
            messages = [{"role": "user", "content": []}]

            # Add text content
            messages[0]["content"].append({"type": "text", "text": prompt})

            # Add image content if provided
            if image_path:
                if provider == "openai":
                    encoded_image, mime_type = encode_image_file(image_path)
                    messages[0]["content"] = [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{encoded_image}"
                            },
                        },
                    ]

            kwargs = {
                "model": model,
                "messages": messages,
                "temperature": 0.7,
            }

            # Add o1-specific parameters
            if model == "o1":
                kwargs["response_format"] = {"type": "text"}
                kwargs["reasoning_effort"] = "low"
                del kwargs["temperature"]

            response = client.chat.completions.create(**kwargs)
            thinking_time = time.time() - start_time

            # Track token usage
            token_usage = TokenUsage(
                prompt_tokens=getattr(response.usage, "prompt_tokens", 0),
                completion_tokens=getattr(response.usage, "completion_tokens", 0),
                total_tokens=getattr(response.usage, "total_tokens", 0),
                reasoning_tokens=None,
            )

            # Calculate cost
            cost = get_token_tracker().calculate_openai_cost(
                token_usage.prompt_tokens, token_usage.completion_tokens, str(model)
            )

            # Track the request
            api_response = APIResponse(
                content=response.choices[0].message.content,
                token_usage=token_usage,
                cost=cost,
                thinking_time=thinking_time,
                provider=provider,
                model=str(model),
            )
            get_token_tracker().track_request(api_response)
            return response.choices[0].message.content

        elif provider == "anthropic":
            # Anthropic API uses a different structure
            content_parts = []

            # Add text content
            content_parts.append({"type": "text", "text": prompt})

            # Add image content if provided
            if image_path:
                encoded_image, mime_type = encode_image_file(image_path)
                # Create image content part with proper typing
                image_part = {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": mime_type,
                        "data": encoded_image,
                    },
                }
                content_parts.append(image_part)

            # Create the message using Anthropic's API
            response = client.messages.create(
                model=model,
                max_tokens=1000,
                system="You are a helpful AI assistant.",
                messages=[{"role": "user", "content": content_parts}],
            )

            thinking_time = time.time() - start_time

            # Track token usage
            token_usage = TokenUsage(
                prompt_tokens=response.usage.input_tokens,
                completion_tokens=response.usage.output_tokens,
                total_tokens=response.usage.input_tokens + response.usage.output_tokens,
                reasoning_tokens=None,
            )

            # Calculate cost
            cost = get_token_tracker().calculate_claude_cost(
                token_usage.prompt_tokens, token_usage.completion_tokens, str(model)
            )

            # Get content from the response
            content = ""
            for block in response.content:
                if hasattr(block, "text"):
                    content = block.text
                    break

            # Track the request
            api_response = APIResponse(
                content=content,
                token_usage=token_usage,
                cost=cost,
                thinking_time=thinking_time,
                provider=provider,
                model=str(model),
            )
            get_token_tracker().track_request(api_response)
            return content

        elif provider == "gemini":
            # Use Google's Generative AI properly
            try:
                # Create a model instance
                gemini_model = client.GenerativeModel(model_name=str(model))

                # Generate content with the model
                response = gemini_model.generate_content(prompt)

                # Return the text response
                if hasattr(response, "text"):
                    return response.text
                else:
                    # Handle different response formats
                    return str(response)
            except AttributeError:
                # Fallback method if the API has changed
                print("Using fallback method for Gemini API", file=sys.stderr)
                response = client.generate_content(
                    model=str(model),
                    contents=prompt,
                )
                return response.text

    except Exception as e:
        print(f"Error querying LLM: {e}", file=sys.stderr)
        return None


def main():
    parser = argparse.ArgumentParser(description="Query an LLM with a prompt")
    parser.add_argument(
        "--prompt", type=str, help="The prompt to send to the LLM", required=True
    )
    parser.add_argument(
        "--provider",
        choices=["openai", "anthropic", "gemini", "local", "deepseek", "azure"],
        default="openai",
        help="The API provider to use",
    )
    parser.add_argument(
        "--model", type=str, help="The model to use (default depends on provider)"
    )
    parser.add_argument(
        "--image", type=str, help="Path to an image file to attach to the prompt"
    )
    args = parser.parse_args()

    if not args.model:
        if args.provider == "openai":
            args.model = "gpt-4o"
        elif args.provider == "siliconflow":
            args.model = "deepseek-ai/DeepSeek-R1"
        elif args.provider == "anthropic":
            args.model = "claude-3-7-sonnet-20250219"
        elif args.provider == "gemini":
            args.model = "gemini-2.0-flash-exp"
        elif args.provider == "azure":
            args.model = os.getenv(
                "AZURE_OPENAI_MODEL_DEPLOYMENT", "gpt-4o-ms"
            )  # Get from env with fallback

    client = create_llm_client(args.provider)
    response = query_llm(
        args.prompt,
        client,
        model=args.model,
        provider=args.provider,
        image_path=args.image,
    )
    if response:
        print(response)
    else:
        print("Failed to get response from LLM")


if __name__ == "__main__":
    main()


class SecureDataHandler:
    def __init__(self):
        self.encryption_key = os.getenv("ENCRYPTION_KEY")

    async def process_sensitive_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process sensitive mental health and EQ data with encryption
        """
        if "mental_health_data" in data:
            data["mental_health_data"] = self.encrypt_sensitive_data(
                data["mental_health_data"]
            )
        return data

    def encrypt_sensitive_data(self, data: str) -> str:
        # Add encryption implementation
        pass
