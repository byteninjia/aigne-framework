import { beforeEach, expect, spyOn, test } from "bun:test";
import { join } from "node:path";
import { isAgentResponseDelta, textDelta } from "@aigne/core";
import { readableStreamToArray } from "@aigne/core/utils/stream-utils.js";
import { HuggingFaceChatModel } from "@aigne/huggingface";

test("HuggingFace chat model basic usage", async () => {
  // #region example-huggingface-chat-model
  const model = new HuggingFaceChatModel({
    // Provide API key directly or use environment variable HF_TOKEN
    apiKey: "your-api-key", // Optional if set in env variables
    model: "meta-llama/Llama-3.1-8B-Instruct", // Defaults to this model if not specified
    provider: "together", // Optional provider
    modelOptions: {
      temperature: 0.7,
    },
  });

  spyOn(model, "process").mockReturnValueOnce({
    text: "Hello! How can I assist you today?",
    model: "meta-llama/Llama-3.1-8B-Instruct",
    usage: {
      inputTokens: 10,
      outputTokens: 9,
    },
  });

  const result = await model.invoke({
    messages: [{ role: "user", content: "Hello, who are you?" }],
  });

  console.log(result);
  /* Output:
  {
    text: "Hello! How can I assist you today?",
    model: "meta-llama/Llama-3.1-8B-Instruct",
    usage: {
      inputTokens: 10,
      outputTokens: 9
    }
  }
  */

  expect(result).toEqual({
    text: "Hello! How can I assist you today?",
    model: "meta-llama/Llama-3.1-8B-Instruct",
    usage: {
      inputTokens: 10,
      outputTokens: 9,
    },
  });
  // #endregion example-huggingface-chat-model
});

test("HuggingFace chat model with streaming using async generator", async () => {
  // #region example-huggingface-chat-model-stream
  const model = new HuggingFaceChatModel({
    apiKey: "your-api-key",
    model: "meta-llama/Llama-3.1-8B-Instruct",
    provider: "together",
  });

  spyOn(model, "process").mockImplementationOnce(async function* () {
    yield textDelta({ text: "Hello!" });
    yield textDelta({ text: " How" });
    yield textDelta({ text: " can" });
    yield textDelta({ text: " I" });
    yield textDelta({ text: " assist" });
    yield textDelta({ text: " you" });
    yield textDelta({ text: " today?" });

    return {
      model: "meta-llama/Llama-3.1-8B-Instruct",
      usage: { inputTokens: 10, outputTokens: 9 },
    };
  });

  const stream = await model.invoke(
    {
      messages: [{ role: "user", content: "Hello, who are you?" }],
    },
    { streaming: true },
  );

  let fullText = "";
  const json = {};

  for await (const chunk of stream) {
    if (isAgentResponseDelta(chunk)) {
      const text = chunk.delta.text?.text;
      if (text) fullText += text;
      if (chunk.delta.json) Object.assign(json, chunk.delta.json);
    }
  }

  console.log(fullText); // Output: "Hello! How can I assist you today?"
  console.log(json); // { model: "meta-llama/Llama-3.1-8B-Instruct", usage: { inputTokens: 10, outputTokens: 9 } }

  expect(fullText).toBe("Hello! How can I assist you today?");
  expect(json).toEqual({
    model: "meta-llama/Llama-3.1-8B-Instruct",
    usage: { inputTokens: 10, outputTokens: 9 },
  });
  // #endregion example-huggingface-chat-model-stream
});

let model: HuggingFaceChatModel;

beforeEach(() => {
  model = new HuggingFaceChatModel({
    apiKey: "YOUR_API_KEY",
    model: "meta-llama/Llama-3.1-8B-Instruct",
    provider: "together",
  });
});

test("HuggingFaceChatModel.invoke with streaming", async () => {
  spyOn(model.client, "chatCompletionStream").mockReturnValue(
    createMockHuggingFaceEventStream({
      path: join(import.meta.dirname, "huggingface-streaming-response-1.txt"),
    }),
  );

  const stream = await model.invoke(
    {
      messages: [{ role: "user", content: "hello" }],
    },
    { streaming: true },
  );

  expect(readableStreamToArray(stream)).resolves.toMatchSnapshot();
});

test("HuggingFaceChatModel.invoke without streaming", async () => {
  spyOn(model.client, "chatCompletionStream").mockReturnValue(
    createMockHuggingFaceEventStream({
      path: join(import.meta.dirname, "huggingface-streaming-response-1.txt"),
    }),
  );

  const result = await model.invoke({
    messages: [{ role: "user", content: "hello" }],
  });

  expect(result).toMatchSnapshot();
});

test("HuggingFaceChatModel should handle JSON response format", async () => {
  const model = new HuggingFaceChatModel({
    apiKey: "YOUR_API_KEY",
    model: "meta-llama/Llama-3.1-8B-Instruct",
    provider: "together",
  });

  spyOn(model.client, "chatCompletionStream").mockReturnValue(
    createMockHuggingFaceEventStream({
      path: join(import.meta.dirname, "huggingface-streaming-response-json.txt"),
    }),
  );

  const result = await model.invoke({
    messages: [
      {
        role: "system",
        content: `\
What is the weather in New York?

<context>
{
  "city": "New York",
  "temperature": 20
}
</context>
`,
      },
    ],
    responseFormat: {
      type: "json_schema",
      jsonSchema: {
        name: "output",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            text: {
              type: "string",
              description: "Your answer",
            },
          },
          required: ["text"],
        },
        strict: true,
      },
    },
  });

  expect(result).toEqual(
    expect.objectContaining({
      json: { text: "The current temperature in New York is 20°C." },
    }),
  );
});

test("HuggingFaceChatModel should handle provider errors gracefully", async () => {
  const model = new HuggingFaceChatModel({
    apiKey: "YOUR_API_KEY",
    model: "meta-llama/Llama-3.1-8B-Instruct",
    provider: "together",
  });

  spyOn(model.client, "chatCompletionStream").mockImplementation(() => {
    throw new Error("Provider error: Rate limit exceeded");
  });

  await expect(
    model.invoke({
      messages: [{ role: "user", content: "hello" }],
    }),
  ).rejects.toThrow("Provider error: Rate limit exceeded");
});

test("HuggingFaceChatModel should handle missing API key", () => {
  // Clear environment variable
  const originalToken = process.env.HF_TOKEN;
  delete process.env.HF_TOKEN;

  const model = new HuggingFaceChatModel({
    model: "meta-llama/Llama-3.1-8B-Instruct",
  });

  expect(() => model.client).toThrow(
    "HuggingFaceChatModel requires an API key. Please provide it via `options.apiKey`, or set the `HF_TOKEN` environment variable",
  );

  // Restore environment variable
  if (originalToken) {
    process.env.HF_TOKEN = originalToken;
  }
});

test("HuggingFaceChatModel should use custom baseURL", () => {
  const model = new HuggingFaceChatModel({
    apiKey: "test-key",
    baseURL: "https://custom-endpoint.example.com",
    model: "custom-model",
  });

  // Just verify the model was created successfully with custom baseURL
  expect(model.options?.baseURL).toBe("https://custom-endpoint.example.com");
});

// Mock function to create HuggingFace-style event streams
function createMockHuggingFaceEventStream({ path }: { path: string }) {
  const fs = require("node:fs");
  const lines = fs.readFileSync(path, "utf-8").split("\n");

  return (async function* () {
    for (const line of lines) {
      if (line.trim()) {
        try {
          const chunk = JSON.parse(line);
          yield chunk;
        } catch {
          // Skip invalid JSON lines
        }
      }
    }
  })();
}
