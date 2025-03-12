#!/usr/bin/env npx -y bun

import {
  AIAgent,
  ChatModelOpenAI,
  ExecutionEngine,
  MCPAgent,
  logger,
  runChatLoopInTerminal,
} from "@aigne/core";

logger.enable(`aigne:mcp,${process.env.DEBUG}`);

const model = new ChatModelOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const puppeteer = await MCPAgent.from({
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-puppeteer"],
});

const engine = new ExecutionEngine({
  model,
  tools: [puppeteer],
});

const agent = AIAgent.from({
  instructions: `\
## Steps to extract content from a website
1. navigate to the url
2. evaluate document.body.innerText to get the content
`,
  enableHistory: true,
});

const userAgent = await engine.run(agent);

await runChatLoopInTerminal(userAgent, {
  welcome:
    "Hello! I'm a chatbot that can extract content from a website. Try asking me a question!",
  defaultQuestion: "What is the content of https://www.arcblock.io",
  onResponse: (response) => console.log(response.text),
});

process.exit(0);
