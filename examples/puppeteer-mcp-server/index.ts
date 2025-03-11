#!/usr/bin/env npx -y bun

import { AIAgent, ChatModelOpenAI, ExecutionEngine, MCPAgent } from "@aigne/core";

const model = new ChatModelOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const puppeteerMCPAgent = await MCPAgent.from({
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-puppeteer"],
});

const engine = new ExecutionEngine({
  model,
  tools: [puppeteerMCPAgent],
});

const agent = AIAgent.from({
  instructions: `\
## Steps to extract content from a website
1. navigate to the url
2. evaluate document.body.innerText to get the content
`,
});

const result = await engine.run("extract content from https://www.arcblock.io", agent);

await engine.shutdown();

console.log(result);

process.exit(0);
