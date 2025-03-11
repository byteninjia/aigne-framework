import inquirer from "inquirer";
import type { AgentOutput } from "../agents/agent";
import type { UserAgent } from "../execution-engine";
import { logger } from "./logger";

export interface ChatLoopOptions {
  welcome?: string;
  defaultQuestion?: string;
  onResponse?: (response: AgentOutput) => void;
}

export async function runChatLoopInTerminal(userAgent: UserAgent, options?: ChatLoopOptions) {
  if (options?.welcome) console.log(options.welcome);

  for (let i = 0; ; i++) {
    const { question } = await inquirer.prompt([
      {
        type: "input",
        name: "question",
        message: ">",
        default: i === 0 ? options?.defaultQuestion : undefined,
      },
    ]);
    if (!question.trim()) continue;

    const cmd = COMMANDS[question.trim()];
    if (cmd) {
      await cmd();
      continue;
    }

    const response = await logger.spinner(userAgent.call(question));
    if (options?.onResponse) options.onResponse(response);
    else console.log(response);
  }
}

const COMMANDS: { [key: string]: () => unknown } = {
  "/exit": () => process.exit(0),
  "/help": () => {
    console.log(`\
Commands:
  /exit - exit the chat loop
  /help - show this help message
`);
  },
};
