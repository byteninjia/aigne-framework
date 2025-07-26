import { LMStudioChatModel } from "@aigne/lmstudio";

// Create a new LM Studio chat model
const model = new LMStudioChatModel({
  baseURL: "http://localhost:1234/v1", // Default LM Studio server URL
  apiKey: "abcd",
  model: "qwen/qwen3-1.7b", // Model name as shown in LM Studio
  modelOptions: {
    temperature: 0.7,
    maxTokens: 2048,
  },
});

// Basic usage
const response = await model.invoke({
  messages: [{ role: "user", content: "/no_think What is the capital of France?" }],
});

console.log(response.text); // "The capital of France is Paris."
