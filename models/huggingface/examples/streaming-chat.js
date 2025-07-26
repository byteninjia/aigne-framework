#!/usr/bin/env node

/**
 * Streaming chat completion example
 *
 * Usage:
 *   export HF_TOKEN="your-token-here"
 *   node examples/streaming-chat.js
 */

import { isAgentResponseDelta } from "@aigne/core";
import { HuggingFaceChatModel } from "../lib/esm/index.js";

async function main() {
  console.log("🌊 HuggingFace Streaming Chat Example\n");

  const model = new HuggingFaceChatModel({
    model: "meta-llama/Llama-3.1-8B-Instruct",
    provider: "together",
    modelOptions: {
      temperature: 0.8,
    },
  });

  try {
    console.log('Asking: "Tell me a short story about a robot learning to cook"');
    console.log("Streaming response...\n");
    console.log("🤖 Response:");
    console.log("─".repeat(50));

    const stream = await model.invoke(
      {
        messages: [
          {
            role: "system",
            content: "You are a creative storyteller. Write engaging short stories.",
          },
          {
            role: "user",
            content:
              "Tell me a short story about a robot learning to cook. Keep it under 200 words.",
          },
        ],
      },
      { streaming: true },
    );

    let fullText = "";
    const metadata = {};

    for await (const chunk of stream) {
      if (isAgentResponseDelta(chunk)) {
        // Handle streaming text
        if (chunk.delta.text?.text) {
          const text = chunk.delta.text.text;
          process.stdout.write(text);
          fullText += text;
        }

        // Handle metadata (model info, usage stats)
        if (chunk.delta.json) {
          Object.assign(metadata, chunk.delta.json);
        }
      }
    }

    console.log(`\n${"─".repeat(50)}`);
    console.log("\n📊 Stream Stats:");
    console.log(`- Total characters: ${fullText.length}`);
    console.log(`- Input tokens: ${metadata.usage?.inputTokens || "N/A"}`);
    console.log(`- Output tokens: ${metadata.usage?.outputTokens || "N/A"}`);
    console.log(`- Model: ${metadata.model || "N/A"}`);
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
