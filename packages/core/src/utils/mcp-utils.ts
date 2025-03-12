import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { ListPromptsResult, ListToolsResult } from "@modelcontextprotocol/sdk/types";
import { type JsonSchema, jsonSchemaToZod } from "@n8n/json-schema-to-zod";
import { type ZodObject, type ZodType, z } from "zod";
import { MCPPrompt, MCPTool } from "../agents/mcp-agent";

export function toolFromMCPTool(client: Client, tool: ListToolsResult["tools"][number]) {
  return new MCPTool({
    client,
    name: tool.name,
    description: tool.description,
    inputSchema: jsonSchemaToZod<ZodObject<Record<string, ZodType>>>(
      tool.inputSchema as JsonSchema,
    ),
    outputSchema: z
      .object({
        _meta: z.record(z.unknown()).optional(),
        content: z.array(z.record(z.unknown())),
        isError: z.boolean().optional(),
      })
      .passthrough(),
  });
}

export function promptFromMCPPrompt(client: Client, prompt: ListPromptsResult["prompts"][number]) {
  return new MCPPrompt({
    client,
    name: prompt.name,
    description: prompt.description,
    inputSchema: jsonSchemaToZod<ZodObject<Record<string, ZodType>>>({
      type: "object",
      properties:
        prompt.arguments &&
        Object.fromEntries(
          prompt.arguments.map((i) => [i.name, { type: "string", description: i.description }]),
        ),
      required: prompt.arguments?.filter((i) => i.required).map((i) => i.name),
    }),
    outputSchema: z
      .object({
        description: z.string().optional(),
        messages: z.array(z.record(z.unknown())),
      })
      .passthrough(),
  });
}
