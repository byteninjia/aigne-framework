#!/usr/bin/env node

/**
 * Multiple providers comparison example
 *
 * Usage:
 *   export HF_TOKEN="your-token-here"
 *   node examples/multiple-providers.js
 */

import { HuggingFaceChatModel } from "../lib/esm/index.js";

async function testProvider(providerName, model, question) {
  console.log(`\n🔄 Testing ${providerName}...`);

  const chatModel = new HuggingFaceChatModel({
    model: model,
    provider: providerName.toLowerCase(),
    modelOptions: {
      temperature: 0.7,
    },
  });

  const startTime = Date.now();

  try {
    const result = await chatModel.invoke({
      messages: [
        { role: "system", content: "You are a helpful assistant. Answer concisely." },
        { role: "user", content: question },
      ],
    });

    const duration = Date.now() - startTime;

    console.log(`✅ ${providerName} (${duration}ms):`);
    console.log(`   Model: ${result.model}`);
    console.log(
      `   Response: ${result.text?.substring(0, 100)}${result.text?.length > 100 ? "..." : ""}`,
    );
    console.log(
      `   Tokens: ${result.usage?.inputTokens || "N/A"} → ${result.usage?.outputTokens || "N/A"}`,
    );

    return { success: true, duration, provider: providerName, result };
  } catch (error) {
    console.log(`❌ ${providerName}: ${error.message}`);
    return { success: false, duration: Date.now() - startTime, provider: providerName, error };
  }
}

async function main() {
  console.log("🏁 HuggingFace Multiple Providers Comparison\n");

  const question = "Explain quantum computing in simple terms.";
  console.log(`Question: "${question}"`);
  console.log("─".repeat(60));

  // Test different providers with their popular models
  const providers = [
    { name: "Together", model: "meta-llama/Llama-3.1-8B-Instruct" },
    { name: "Sambanova", model: "meta-llama/Llama-3.1-8B-Instruct" },
    { name: "Cerebras", model: "meta-llama/Llama-3.1-8B-Instruct" },
    // Note: Some providers might not be available or might require different models
  ];

  const results = [];

  for (const provider of providers) {
    const result = await testProvider(provider.name, provider.model, question);
    results.push(result);

    // Add a small delay between requests to be respectful
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Summary
  console.log("\n📊 Summary:");
  console.log("─".repeat(60));

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  if (successful.length > 0) {
    console.log(`✅ Successful: ${successful.length}/${results.length} providers`);

    // Sort by speed
    successful.sort((a, b) => a.duration - b.duration);
    console.log("\n🏆 Performance Ranking:");
    successful.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.provider}: ${result.duration}ms`);
    });

    console.log("\n💡 Recommendations:");
    console.log(`   - Fastest: ${successful[0].provider} (${successful[0].duration}ms)`);
    console.log(`   - Try different providers based on your needs:`);
    console.log(`     • Together: Good balance of speed and quality`);
    console.log(`     • Sambanova: Often very fast inference`);
    console.log(`     • Cerebras: Ultra-fast for supported models`);
  }

  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}/${results.length} providers`);
    failed.forEach((result) => {
      console.log(`   - ${result.provider}: ${result.error.message}`);
    });
  }

  console.log("\n🔗 Provider Information:");
  console.log("   - Together AI: https://together.ai/ (Free tier available)");
  console.log("   - Sambanova: https://sambanova.ai/ (Fast inference)");
  console.log("   - Cerebras: https://cerebras.ai/ (Ultra-fast models)");

  if (!process.env.HF_TOKEN) {
    console.log("\n💡 Setup Instructions:");
    console.log("1. Get your free API key from: https://huggingface.co/settings/tokens");
    console.log('2. Set it as environment variable: export HF_TOKEN="your-token-here"');
    console.log("3. Run this script again");
  }
}

main().catch(console.error);
