# Astro AI Integration

This project integrates TogetherAI's API into our Astro application for AI-powered features.

## Features

- Chat interface with TogetherAI models
- Support for multiple TogetherAI models
- Sentiment analysis
- Crisis detection
- Response generation
- Intervention effectiveness analysis

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Copy the `.env.example` file to `.env` and add your TogetherAI API key:
   ```bash
   cp .env.example .env
   ```
4. Start the development server:
   ```bash
   pnpm dev
   ```

## AI Models

The application supports various TogetherAI models:

- Llama 3 and 3.1 models (8B, 70B, 405B)
- Mistral models (7B, Mixtral 8x7B, Large)
- Claude 3.5 Sonnet

## AI Performance Optimization

The AI system includes several performance optimization features:

### Request Caching

- Caches responses for frequently used prompts to reduce API calls
- Configurable TTL and cache size limits
- LRU cache eviction strategy
- Cache statistics tracking

### Prompt Optimization

- Compresses prompts to reduce token usage
- Message length truncation
- Conversation history summarization
- Message count limiting

### Connection Pooling

- Reuses connections to reduce API latency
- Connection lifecycle management
- Automatic cleanup of idle connections
- Connection statistics tracking

### Fallback Mechanisms

- Retry logic with exponential backoff
- Error-specific fallback responses
- Comprehensive error handling

### Performance Monitoring

- Real-time metrics visualization
- Cache efficiency tracking
- Connection pool monitoring
- Response time and token usage analytics

## Configuration

The AI service can be configured with the following options:

```typescript
const aiService = new AIService({
  together: {
    apiKey: process.env.TOGETHER_API_KEY,
    baseUrl: 'https://api.together.xyz/v1' // Optional
  },
  onUsage: async (usage) => {
    // Handle usage tracking
    console.log('AI Usage:', usage);
  },
  cache: { 
    enabled: true,
    maxSize: 200 
  },
  connectionPool: { 
    maxConnections: 10 
  }
});
```

## Usage

```typescript
// Create a chat completion
const response = await aiService.createChatCompletion(
  [
    { role: 'user', content: 'Hello, how are you?' }
  ],
  {
    model: 'llama-3-1-70b-instruct',
    temperature: 0.7,
    maxTokens: 1000
  }
);

console.log(response.choices[0].message.content);
```

## Demo

Visit `/ai-chat` to try out the AI chat interface with different models.

## License

MIT

```sh
pnpm create astro@latest -- --template basics
```

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/withastro/astro/tree/latest/examples/basics)
[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/p/sandbox/github/withastro/astro/tree/latest/examples/basics)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/withastro/astro?devcontainer_path=.devcontainer/basics/devcontainer.json)

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

![just-the-basics](https://github.com/withastro/astro/assets/2244813/a0a5533c-a856-4198-8470-2d67b1d7c554)

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src/
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `pnpm install`             | Installs dependencies                            |
| `pnpm dev`             | Starts local dev server at `localhost:4321`      |
| `pnpm build`           | Build your production site to `./dist/`          |
| `pnpm preview`         | Preview your build locally, before deploying     |
| `pnpm astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `pnpm astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
