import {
  type AgentProcessResult,
  type AgentResponse,
  type AgentResponseChunk,
  ChatModel,
  type ChatModelInput,
  type ChatModelInputTool,
  type ChatModelOptions,
  type ChatModelOutput,
  createMessageTransformer,
  createRoleMapper,
  STANDARD_ROLE_MAP,
  safeParseJSON,
} from "@aigne/core";
import { logger } from "@aigne/core/utils/logger.js";
import { mergeUsage } from "@aigne/core/utils/model-utils.js";
import { getJsonOutputPrompt } from "@aigne/core/utils/prompts.js";
import { agentResponseStreamToObject } from "@aigne/core/utils/stream-utils.js";
import { checkArguments, type PromiseOrValue } from "@aigne/core/utils/type-utils.js";
import { InferenceClient } from "@huggingface/inference";
import { Ajv } from "ajv";
import { z } from "zod";

const CHAT_MODEL_HUGGINGFACE_DEFAULT_MODEL = "meta-llama/Llama-3.1-8B-Instruct";

export interface HuggingFaceChatModelCapabilities {
  supportsNativeStructuredOutputs: boolean;
  supportsEndWithSystemMessage: boolean;
  supportsToolsUseWithJsonSchema: boolean;
  supportsParallelToolCalls: boolean;
  supportsToolsEmptyParameters: boolean;
  supportsToolStreaming: boolean;
  supportsTemperature: boolean;
}

const HUGGINGFACE_CHAT_MODEL_CAPABILITIES: Record<
  string,
  Partial<HuggingFaceChatModelCapabilities>
> = {
  // Add model-specific capabilities as needed
};

/**
 * Configuration options for HuggingFace Chat Model
 */
export interface HuggingFaceChatModelOptions {
  /**
   * API token for HuggingFace API
   *
   * If not provided, will look for HF_TOKEN in environment variables
   */
  apiKey?: string;

  /**
   * Base URL for HuggingFace API
   *
   * Useful for custom inference endpoints
   */
  baseURL?: string;

  /**
   * HuggingFace model to use
   *
   * Defaults to 'meta-llama/Llama-3.1-8B-Instruct'
   */
  model?: string;

  /**
   * Provider to use for inference (e.g., 'together', 'sambanova', 'cerebras')
   */
  provider?: string;

  /**
   * Additional model options to control behavior
   */
  modelOptions?: ChatModelOptions;
}

/**
 * @hidden
 */
export const huggingFaceChatModelOptionsSchema = z.object({
  apiKey: z.string().optional(),
  baseURL: z.string().optional(),
  model: z.string().optional(),
  provider: z.string().optional() as any,
  modelOptions: z
    .object({
      model: z.string().optional(),
      temperature: z.number().optional(),
      topP: z.number().optional(),
      frequencyPenalty: z.number().optional(),
      presencePenalty: z.number().optional(),
      parallelToolCalls: z.boolean().optional().default(true),
    })
    .optional(),
});

/**
 * Implementation of the ChatModel interface for HuggingFace's Inference API
 *
 * This model provides access to HuggingFace's capabilities including:
 * - Text generation via various providers (Together, Sambanova, Cerebras, etc.)
 * - Chat completion with streaming support
 * - Tool use (where supported by the underlying model)
 * - JSON structured output
 *
 * Default model: 'meta-llama/Llama-3.1-8B-Instruct'
 *
 * @example
 * Here's how to create and use a HuggingFace chat model:
 * {@includeCode ../test/huggingface-chat-model.test.ts#example-huggingface-chat-model}
 *
 * @example
 * Here's an example with streaming response:
 * {@includeCode ../test/huggingface-chat-model.test.ts#example-huggingface-chat-model-stream}
 */
export class HuggingFaceChatModel extends ChatModel {
  constructor(public options?: HuggingFaceChatModelOptions) {
    super();
    if (options) checkArguments(this.name, huggingFaceChatModelOptionsSchema, options);

    const preset = options?.model ? HUGGINGFACE_CHAT_MODEL_CAPABILITIES[options.model] : undefined;
    Object.assign(this, preset);
  }

  /**
   * @hidden
   */
  protected _client?: InferenceClient;

  protected apiKeyEnvName = "HF_TOKEN";
  protected apiKeyDefault: string | undefined;
  protected supportsNativeStructuredOutputs = false;
  protected supportsToolsUseWithJsonSchema = false;
  protected override supportsParallelToolCalls = false;
  protected supportsToolsEmptyParameters = false;
  protected supportsToolStreaming = false;
  protected supportsTemperature = true;

  get client() {
    const apiKey = this.options?.apiKey || process.env[this.apiKeyEnvName] || this.apiKeyDefault;
    if (!apiKey)
      throw new Error(
        `${this.name} requires an API key. Please provide it via \`options.apiKey\`, or set the \`${this.apiKeyEnvName}\` environment variable`,
      );

    this._client ??= new InferenceClient(apiKey, {
      endpointUrl: this.options?.baseURL,
    });
    return this._client;
  }

  get modelOptions() {
    return this.options?.modelOptions;
  }

  /**
   * Process the input and generate a response
   * @param input The input to process
   * @returns The generated response
   */
  override process(input: ChatModelInput): PromiseOrValue<AgentProcessResult<ChatModelOutput>> {
    return this._process(input);
  }

  private ajv = new Ajv();

  private async _process(input: ChatModelInput): Promise<AgentResponse<ChatModelOutput>> {
    const messages = await this.getRunMessages(input);

    // For models that do not support tools use with JSON schema in same request,
    // so we need to handle the case where tools are not used and responseFormat is json
    if (!input.tools?.length && input.responseFormat?.type === "json_schema") {
      return await this.requestStructuredOutput(messages, input.responseFormat);
    }

    const params: any = {
      model: this.options?.model || CHAT_MODEL_HUGGINGFACE_DEFAULT_MODEL,
      messages,
      temperature: this.supportsTemperature
        ? (input.modelOptions?.temperature ?? this.modelOptions?.temperature)
        : undefined,
      top_p: input.modelOptions?.topP ?? this.modelOptions?.topP,
      max_tokens: 1000,
      ...(this.options?.provider && { provider: this.options.provider }),
    };

    try {
      const stream = this.client.chatCompletionStream(params);

      if (input.responseFormat?.type !== "json_schema") {
        return await this.extractResultFromStream(stream, false, true);
      }

      const result = await this.extractResultFromStream(stream, true);
      // Just return the result if it has tool calls
      if (result.toolCalls?.length || result.json) return result;

      // Try to parse the text response as JSON
      // If it matches the json_schema, return it as json
      const json = safeParseJSON(result.text || "");
      if (this.ajv.validate(input.responseFormat.jsonSchema.schema, json)) {
        return { ...result, json, text: undefined };
      }
      logger.warn(
        `${this.name}: Text response does not match JSON schema, trying to use structured output`,
        { text: result.text },
      );

      const output = await this.requestStructuredOutput(messages, input.responseFormat);
      return { ...output, usage: mergeUsage(result.usage, output.usage) };
    } catch (error) {
      logger.error(`${this.name}: Error during chat completion`, { error });
      throw error;
    }
  }

  protected async getRunMessages(
    input: ChatModelInput,
  ): Promise<Array<{ role: string; content: string }>> {
    const messages = transformMessages(input.messages);

    if (input.responseFormat?.type === "json_schema") {
      if (
        !this.supportsNativeStructuredOutputs ||
        (!this.supportsToolsUseWithJsonSchema && input.tools?.length)
      ) {
        messages.unshift({
          role: "system",
          content: getJsonOutputPrompt(input.responseFormat.jsonSchema.schema),
        });
      }
    }
    return messages;
  }

  private async requestStructuredOutput(
    messages: Array<{ role: string; content: string }>,
    responseFormat: ChatModelInput["responseFormat"],
  ): Promise<ChatModelOutput> {
    if (responseFormat?.type !== "json_schema") {
      throw new Error("Expected json_schema response format");
    }

    const params: any = {
      model: this.options?.model || CHAT_MODEL_HUGGINGFACE_DEFAULT_MODEL,
      messages,
      temperature: this.supportsTemperature ? this.modelOptions?.temperature : undefined,
      top_p: this.modelOptions?.topP,
      max_tokens: 1000,
      ...(this.options?.provider && { provider: this.options.provider }),
    };

    const stream = this.client.chatCompletionStream(params);
    return this.extractResultFromStream(stream, true);
  }

  private async extractResultFromStream(
    stream: AsyncIterable<any>,
    jsonMode: boolean | undefined,
    streaming: true,
  ): Promise<ReadableStream<AgentResponseChunk<ChatModelOutput>>>;
  private async extractResultFromStream(
    stream: AsyncIterable<any>,
    jsonMode?: boolean,
    streaming?: false,
  ): Promise<ChatModelOutput>;
  private async extractResultFromStream(
    stream: AsyncIterable<any>,
    jsonMode?: boolean,
    streaming?: boolean,
  ): Promise<ReadableStream<AgentResponseChunk<ChatModelOutput>> | ChatModelOutput> {
    const result = new ReadableStream<AgentResponseChunk<ChatModelOutput>>({
      start: async (controller) => {
        try {
          let text = "";
          let model: string | undefined;
          let usage: ChatModelOutput["usage"];

          for await (const chunk of stream) {
            const choice = chunk.choices?.[0];
            if (!model && chunk.model) {
              model = chunk.model;
              controller.enqueue({
                delta: {
                  json: {
                    model,
                  },
                },
              });
            }

            if (choice?.delta?.content) {
              text += choice.delta.content;
              if (!jsonMode) {
                controller.enqueue({
                  delta: {
                    text: {
                      text: choice.delta.content,
                    },
                  },
                });
              }
            }

            if (chunk.usage) {
              usage = {
                inputTokens: chunk.usage.prompt_tokens || 0,
                outputTokens: chunk.usage.completion_tokens || 0,
              };
              controller.enqueue({
                delta: {
                  json: {
                    usage,
                  },
                },
              });
            }
          }

          if (jsonMode && text) {
            controller.enqueue({
              delta: {
                json: {
                  json: safeParseJSON(text),
                },
              },
            });
          }

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return streaming ? result : await agentResponseStreamToObject(result);
  }
}

// Create role mapper and message transformer for HuggingFace
const mapRole = createRoleMapper(STANDARD_ROLE_MAP);
const transformMessages = createMessageTransformer<{ role: string; content: string }>({
  roleMapper: mapRole,
  multimodalFallback: "text-only", // HuggingFace has limited multimodal support
});

/**
 * @hidden
 */
export function toolsFromInputTools(
  _tools?: ChatModelInputTool[],
  _options?: { addTypeToEmptyParameters?: boolean },
): any[] | undefined {
  // HuggingFace Inference API has limited tool support
  // This would need to be implemented based on specific model capabilities
  return undefined;
}

// safeParseJSON is now imported from @aigne/core
