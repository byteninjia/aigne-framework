import { expect, test } from "bun:test";
import { join } from "node:path";
import { MCPAgent } from "@aigne/core";

test(
  "MCPAgent from command",
  async () => {
    const mcp = await MCPAgent.from({
      command: "bun",
      args: [join(import.meta.dir, "../_mocks/mock-mcp-server.ts")],
    });

    try {
      expect(mcp.tools.map((i) => i.name)).toEqual(["echo"]);
      expect(await mcp.tools.echo?.call({ message: "AIGNE" })).toEqual(
        expect.objectContaining({
          content: [
            {
              type: "text",
              text: "Tool echo: AIGNE",
            },
          ],
        }),
      );

      expect(mcp.prompts.map((i) => i.name)).toEqual(["echo"]);

      const prompt = await mcp.prompts.echo?.call({ message: "AIGNE" });

      expect(prompt).toEqual(
        expect.objectContaining({
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: "Please process this message: AIGNE",
              },
            },
          ],
        }),
      );
    } finally {
      await mcp.shutdown();
    }
  },
  {
    timeout: 30000,
  },
);
