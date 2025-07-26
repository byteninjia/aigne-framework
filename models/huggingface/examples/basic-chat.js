#!/usr/bin/env node

/**
 * Basic chat completion example with HuggingFace model
 *
 * Usage:
 *   export HF_TOKEN="your-token-here"
 *   node examples/basic-chat.js
 */

import { HuggingFaceChatModel } from "../lib/esm/index.js";

async function main() {
  console.log("🤖 HuggingFace Basic Chat Example\n");

  const model = new HuggingFaceChatModel({
    model: "meta-llama/Llama-3.1-8B-Instruct",
    provider: "together", // Fast and free tier friendly
    modelOptions: {
      temperature: 0.7,
    },
  });

  try {
    console.log('Asking: "What is the capital of France?"');
    console.log("Provider: Together AI");
    console.log("Model: meta-llama/Llama-3.1-8B-Instruct\n");

    const result = await model.invoke({
      messages: [
        { role: "system", content: "You are a helpful and knowledgeable assistant." },
        { role: "user", content: "What is the capital of France?" },
      ],
    });

    console.log("✅ Response:");
    console.log(result.text);
    console.log("\n📊 Usage Stats:");
    console.log(`- Input tokens: ${result.usage?.inputTokens || "N/A"}`);
    console.log(`- Output tokens: ${result.usage?.outputTokens || "N/A"}`);
    console.log(`- Model: ${result.model || "N/A"}`);
  } catch (error) {
    console.error("❌ Error:", error.message);

    if (error.message.includes("API key")) {
      console.log("\n💡 Setup Instructions:");
      console.log("1. Get your free API key from: https://huggingface.co/settings/tokens");
      console.log('2. Set it as environment variable: export HF_TOKEN="your-token-here"');
      console.log("3. Run this script again");
    }
  }
}

main().catch(console.error);
