#!/usr/bin/env node

/**
 * JSON structured output example
 *
 * Usage:
 *   export HF_TOKEN="your-token-here"
 *   node examples/json-output.js
 */

import { HuggingFaceChatModel } from "../lib/esm/index.js";

async function main() {
  console.log("📊 HuggingFace JSON Output Example\n");

  const model = new HuggingFaceChatModel({
    model: "meta-llama/Llama-3.1-8B-Instruct",
    provider: "together",
    modelOptions: {
      temperature: 0.3, // Lower temperature for more consistent JSON
    },
  });

  // Example 1: Sentiment Analysis
  console.log("Example 1: Sentiment Analysis");
  console.log("─".repeat(40));

  try {
    const sentimentResult = await model.invoke({
      messages: [
        {
          role: "user",
          content:
            'Analyze the sentiment of this review: "This product is absolutely amazing! I love everything about it and would definitely recommend it to others."',
        },
      ],
      responseFormat: {
        type: "json_schema",
        jsonSchema: {
          name: "sentiment_analysis",
          schema: {
            type: "object",
            properties: {
              sentiment: {
                type: "string",
                enum: ["positive", "negative", "neutral"],
                description: "The overall sentiment of the text",
              },
              confidence: {
                type: "number",
                minimum: 0,
                maximum: 1,
                description: "Confidence score from 0 to 1",
              },
              reasoning: {
                type: "string",
                description: "Brief explanation of the sentiment analysis",
              },
            },
            required: ["sentiment", "confidence", "reasoning"],
          },
        },
      },
    });

    console.log("✅ JSON Response:");
    console.log(JSON.stringify(sentimentResult.json, null, 2));
  } catch (error) {
    console.error("❌ Error in sentiment analysis:", error.message);
  }

  console.log("\n");

  // Example 2: Data Extraction
  console.log("Example 2: Contact Information Extraction");
  console.log("─".repeat(40));

  try {
    const extractionResult = await model.invoke({
      messages: [
        {
          role: "user",
          content:
            'Extract contact information from this text: "Hi, I\'m John Smith from Acme Corp. You can reach me at john.smith@acme.com or call me at (555) 123-4567. Our office is located at 123 Main St, New York, NY 10001."',
        },
      ],
      responseFormat: {
        type: "json_schema",
        jsonSchema: {
          name: "contact_extraction",
          schema: {
            type: "object",
            properties: {
              name: { type: "string", description: "Person's full name" },
              company: { type: "string", description: "Company name" },
              email: { type: "string", description: "Email address" },
              phone: { type: "string", description: "Phone number" },
              address: { type: "string", description: "Physical address" },
            },
            required: ["name"],
          },
        },
      },
    });

    console.log("✅ JSON Response:");
    console.log(JSON.stringify(extractionResult.json, null, 2));
  } catch (error) {
    console.error("❌ Error in data extraction:", error.message);
  }

  console.log("\n");

  // Example 3: Classification
  console.log("Example 3: Text Classification");
  console.log("─".repeat(40));

  try {
    const classificationResult = await model.invoke({
      messages: [
        {
          role: "user",
          content:
            "Classify this support ticket: \"My laptop won't turn on after I spilled coffee on the keyboard. The power light doesn't come on and nothing happens when I press the power button.\"",
        },
      ],
      responseFormat: {
        type: "json_schema",
        jsonSchema: {
          name: "ticket_classification",
          schema: {
            type: "object",
            properties: {
              category: {
                type: "string",
                enum: ["hardware", "software", "network", "account", "other"],
                description: "Main category of the issue",
              },
              priority: {
                type: "string",
                enum: ["low", "medium", "high", "urgent"],
                description: "Priority level based on issue severity",
              },
              tags: {
                type: "array",
                items: { type: "string" },
                description: "Relevant tags for the issue",
              },
              estimated_resolution_time: {
                type: "string",
                description: 'Estimated time to resolve (e.g., "2-4 hours", "1-2 days")',
              },
            },
            required: ["category", "priority", "tags"],
          },
        },
      },
    });

    console.log("✅ JSON Response:");
    console.log(JSON.stringify(classificationResult.json, null, 2));
  } catch (error) {
    console.error("❌ Error in classification:", error.message);
  }

  if (!process.env.HF_TOKEN) {
    console.log("\n💡 Setup Instructions:");
    console.log("1. Get your free API key from: https://huggingface.co/settings/tokens");
    console.log('2. Set it as environment variable: export HF_TOKEN="your-token-here"');
    console.log("3. Run this script again");
  }
}

main().catch(console.error);
