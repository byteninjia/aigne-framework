# @aigne/huggingface

AIGNE HuggingFace SDK for integrating with HuggingFace's Inference API and chat models.

## Installation

```bash
npm install @aigne/huggingface
```

## Usage

### Basic Chat Completion

```typescript
import { HuggingFaceChatModel } from '@aigne/huggingface';

const model = new HuggingFaceChatModel({
  apiKey: 'your-hf-token', // or set HF_TOKEN environment variable
  model: 'meta-llama/Llama-3.1-8B-Instruct',
  provider: 'together', // optional: together, sambanova, cerebras, etc.
  modelOptions: {
    temperature: 0.7,
  },
});

const result = await model.invoke({
  messages: [
    { role: 'user', content: 'Hello, how are you?' }
  ],
});

console.log(result.text);
```

### Streaming Response

```typescript
const stream = await model.invoke(
  {
    messages: [
      { role: 'user', content: 'Tell me a story' }
    ],
  },
  { streaming: true }
);

for await (const chunk of stream) {
  if (chunk.delta.text?.text) {
    process.stdout.write(chunk.delta.text.text);
  }
}
```

### JSON Structured Output

```typescript
const result = await model.invoke({
  messages: [
    { role: 'user', content: 'Analyze the sentiment of: I love this product!' }
  ],
  responseFormat: {
    type: 'json_schema',
    jsonSchema: {
      name: 'sentiment_analysis',
      schema: {
        type: 'object',
        properties: {
          sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
          confidence: { type: 'number', minimum: 0, maximum: 1 }
        },
        required: ['sentiment', 'confidence']
      }
    }
  }
});

console.log(result.json); // { sentiment: 'positive', confidence: 0.95 }
```

### Using Different Providers

```typescript
// Using Together AI
const togetherModel = new HuggingFaceChatModel({
  apiKey: 'your-hf-token',
  model: 'meta-llama/Llama-3.1-70B-Instruct',
  provider: 'together',
});

// Using Sambanova
const sambaModel = new HuggingFaceChatModel({
  apiKey: 'your-hf-token',
  model: 'meta-llama/Llama-3.1-8B-Instruct',
  provider: 'sambanova',
});

// Using Cerebras
const cerebrasModel = new HuggingFaceChatModel({
  apiKey: 'your-hf-token',
  model: 'meta-llama/Llama-3.1-8B-Instruct',
  provider: 'cerebras',
});
```

## Configuration Options

- `apiKey`: HuggingFace API token (or set `HF_TOKEN` environment variable)
- `model`: Model identifier (default: `meta-llama/Llama-3.1-8B-Instruct`)
- `provider`: Inference provider (optional: `together`, `sambanova`, `cerebras`, etc.)
- `baseURL`: Custom endpoint URL for private deployments
- `modelOptions`: Additional model parameters like temperature, topP, etc.

## Supported Features

- ✅ Text generation and chat completion
- ✅ Streaming responses  
- ✅ JSON structured output
- ✅ Multiple inference providers
- ✅ Custom endpoints
- ❌ Tool/function calling (limited support in HF Inference API)
- ❌ Multimodal inputs (text-only currently)

## Environment Variables

- `HF_TOKEN`: Your HuggingFace API token

## Error Handling

The model will throw descriptive errors for common issues:

- Missing API token
- Invalid model names
- Rate limiting
- Provider-specific errors

## Examples

Check out the `examples/` directory for practical usage examples:

- **`basic-chat.js`** - Simple chat completion
- **`streaming-chat.js`** - Real-time streaming responses
- **`json-output.js`** - Structured data extraction
- **`multiple-providers.js`** - Provider comparison and benchmarking

Run any example after setting up your API key:
```bash
export HF_TOKEN="your-token-here"
pnpm build
node examples/basic-chat.js
```

## License

Elastic-2.0