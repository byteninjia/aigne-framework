# HuggingFace Model Adapter Examples

This directory contains example scripts demonstrating how to use the `@aigne/huggingface` model adapter with various features and providers.

## 🔑 Setup Instructions

Before running any examples, you'll need a HuggingFace API token:

### 1. Get Your Free API Token

1. Visit [HuggingFace Settings](https://huggingface.co/settings/tokens)
2. Log in or create a free account
3. Click "New token"
4. Choose "Read" permissions (sufficient for inference)
5. Copy your token

### 2. Set Environment Variable

```bash
# On macOS/Linux
export HF_TOKEN="hf_your_token_here"

# On Windows (Command Prompt)
set HF_TOKEN=hf_your_token_here

# On Windows (PowerShell)
$env:HF_TOKEN="hf_your_token_here"
```

### 3. Build the Package

```bash
# From the huggingface directory
pnpm build
```

## 📁 Available Examples

### 1. `basic-chat.js` - Simple Chat Completion
```bash
node examples/basic-chat.js
```

**Features:**
- Basic question-and-answer chat
- Token usage tracking
- Error handling with setup instructions

**Good for:** Understanding the basic API usage

---

### 2. `streaming-chat.js` - Real-time Streaming
```bash
node examples/streaming-chat.js
```

**Features:**
- Real-time text streaming
- Character count tracking
- Live response display

**Good for:** Building interactive chat applications

---

### 3. `json-output.js` - Structured Data Extraction
```bash
node examples/json-output.js
```

**Features:**
- Sentiment analysis with confidence scores
- Contact information extraction
- Support ticket classification
- JSON schema validation

**Good for:** Data processing and structured output needs

---

### 4. `multiple-providers.js` - Provider Comparison
```bash
node examples/multiple-providers.js
```

**Features:**
- Tests multiple inference providers
- Performance benchmarking
- Speed comparison
- Provider recommendations

**Good for:** Choosing the best provider for your use case

## 🏃‍♂️ Quick Start

1. **Set up your token:**
   ```bash
   export HF_TOKEN="hf_your_token_here"
   ```

2. **Build the package:**
   ```bash
   pnpm build
   ```

3. **Run basic example:**
   ```bash
   node examples/basic-chat.js
   ```

## 🔧 Customization

### Changing Models
All examples use `meta-llama/Llama-3.1-8B-Instruct` by default. You can modify the model in each script:

```javascript
const model = new HuggingFaceChatModel({
  model: 'mistralai/Mixtral-8x7B-Instruct-v0.1', // Change this
  provider: 'together',
});
```

### Popular Models to Try:
- `meta-llama/Llama-3.1-8B-Instruct` (Good balance)
- `meta-llama/Llama-3.1-70B-Instruct` (Higher quality)
- `mistralai/Mixtral-8x7B-Instruct-v0.1` (Fast and capable)
- `microsoft/DialoGPT-medium` (Conversation focused)

### Adjusting Parameters
```javascript
modelOptions: {
  temperature: 0.7,    // Creativity (0.0-1.0)
  // Add other options as needed
}
```

## 🌐 Available Providers

| Provider | Speed | Free Tier | Best For |
|----------|-------|-----------|----------|
| `together` | Fast | Yes | General use, development |
| `sambanova` | Very Fast | Limited | Quick responses |
| `cerebras` | Ultra Fast | Limited | Real-time applications |

## 🐛 Troubleshooting

### Common Issues:

**❌ "API key required" error:**
- Ensure `HF_TOKEN` environment variable is set
- Check that your token starts with `hf_`
- Verify token has "Read" permissions

**❌ "Provider error" or rate limits:**
- Try a different provider (change `provider` field)
- Add delays between requests
- Check HuggingFace status page

**❌ "Model not found" error:**
- Verify the model name is correct
- Check if the model is available on the provider
- Try a different model from the list above

**❌ JSON parsing errors:**
- Lower the temperature (try 0.1-0.3)
- Simplify your JSON schema
- Add more specific instructions in your prompt

## 💡 Tips for Best Results

1. **For JSON output:** Use lower temperature (0.1-0.3)
2. **For creative tasks:** Use higher temperature (0.7-0.9)
3. **For speed:** Try `sambanova` or `cerebras` providers
4. **For reliability:** Stick with `together` provider
5. **For cost-efficiency:** Use smaller models like 8B instead of 70B

## 🔗 Useful Links

- [HuggingFace Models](https://huggingface.co/models)
- [Inference API Documentation](https://huggingface.co/docs/api-inference/quicktour)
- [AIGNE Framework Documentation](../../README.md)
- [Together AI](https://together.ai/)
- [HuggingFace Pricing](https://huggingface.co/pricing)