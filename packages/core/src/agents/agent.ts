import EventEmitter from "node:events";
import { type ZodObject, z } from "zod";
import type { Context } from "../execution-engine/context";
import { userInput } from "../prompt/prompt-builder";
import { logger } from "../utils/logger";
import { type TransferAgentOutput, transferAgentOutputKey, transferToAgentOutput } from "./types";

export type AgentInput = Record<string, unknown>;

export type AgentOutput = Record<string, unknown> & Partial<TransferAgentOutput>;

export type SubscribeTopic = string | string[];

export type PublishTopic<O extends AgentOutput = AgentOutput> =
  | string
  | string[]
  | ((output: O) => string | string[] | Promise<string | string[]>);

export interface AgentOptions<
  _I extends AgentInput = AgentInput,
  O extends AgentOutput = AgentOutput,
> {
  subscribeTopic?: SubscribeTopic;

  publishTopic?: PublishTopic<O>;

  name?: string;

  description?: string;

  inputSchema?: ZodObject<any>;

  outputSchema?: ZodObject<any>;

  includeInputInOutput?: boolean;

  tools?: (Agent | FunctionAgentFn)[];
}

export class Agent<
  I extends AgentInput = AgentInput,
  O extends AgentOutput = AgentOutput,
> extends EventEmitter {
  static from<I extends AgentInput = AgentInput, O extends AgentOutput = AgentOutput>(
    options: AgentOptions<I, O>,
  ): Agent<I, O> {
    return new Agent(options);
  }

  constructor(options: AgentOptions<I, O>) {
    super();

    this.name = options.name || this.constructor.name;
    this.description = options.description;
    this.inputSchema = options.inputSchema || z.object({});
    this.outputSchema = options.outputSchema || z.object({});
    this.includeInputInOutput = options.includeInputInOutput;
    this.subscribeTopic = options.subscribeTopic;
    this.publishTopic = options.publishTopic;
    if (options.tools?.length) this.tools.push(...options.tools.map(functionToAgent));
  }

  readonly name: string;

  readonly description?: string;

  readonly inputSchema: ZodObject<any>;

  readonly outputSchema: ZodObject<any>;

  readonly includeInputInOutput?: boolean;

  readonly subscribeTopic?: SubscribeTopic;

  readonly publishTopic?: PublishTopic<any>;

  readonly tools = new Proxy<Agent[] & { [key: string]: Agent }>([] as any, {
    get: (t, p, r) => Reflect.get(t, p, r) ?? t.find((t) => t.name === p),
  });

  addTool<I extends AgentInput, O extends AgentOutput>(tool: Agent<I, O> | FunctionAgentFn<I, O>) {
    this.tools.push(typeof tool === "function" ? functionToAgent(tool) : tool);
  }

  get isCallable(): boolean {
    return !!this.process;
  }

  async call(input: I | string, context?: Context): Promise<O> {
    if (!this.process) throw new Error("Agent must implement process method");

    const _input = typeof input === "string" ? userInput(input) : input;

    const parsedInput = this.inputSchema.passthrough().parse(_input) as I;

    logger.debug(`Agent ${this.name} (${this.constructor.name}) start`, parsedInput);

    const output = await this.process(parsedInput, context);

    const parsedOutput = this.outputSchema.passthrough().parse(output) as O;

    const finalOutput = this.includeInputInOutput
      ? { ...parsedInput, ...parsedOutput }
      : parsedOutput;

    logger.debug(`Agent ${this.name} (${this.constructor.name}) end`, {
      ...finalOutput,
      [transferAgentOutputKey]: finalOutput[transferAgentOutputKey]?.agent?.name,
    });

    return finalOutput;
  }

  process?(input: I, context?: Context): Promise<O>;

  async shutdown() {}
}

export interface FunctionAgentOptions<
  I extends AgentInput = AgentInput,
  O extends AgentOutput = AgentOutput,
> extends AgentOptions<I, O> {
  fn?: FunctionAgentFn<I, O>;
}

export class FunctionAgent<
  I extends AgentInput = AgentInput,
  O extends AgentOutput = AgentOutput,
> extends Agent<I, O> {
  static from<I extends AgentInput, O extends AgentOutput>(
    options: FunctionAgentOptions<I, O> | FunctionAgentFn<I, O>,
  ): FunctionAgent<I, O> {
    return typeof options === "function" ? functionToAgent(options) : new FunctionAgent(options);
  }

  constructor(options: FunctionAgentOptions<I, O>) {
    super(options);
    this.fn = options.fn ?? ((() => ({})) as unknown as FunctionAgentFn<I, O>);
  }

  fn: FunctionAgentFn<I, O>;

  async process(input: I, context?: Context): Promise<O> {
    const result = await this.fn(input, context);

    if (result instanceof Agent) {
      return transferToAgentOutput(result) as O;
    }

    return result;
  }
}

export type FunctionAgentFn<
  I extends AgentInput = AgentInput,
  O extends AgentOutput = AgentOutput,
> = (input: I, context?: Context) => O | Promise<O> | Agent | Promise<Agent>;

function functionToAgent<I extends AgentInput, O extends AgentOutput>(
  agent: FunctionAgentFn<I, O>,
): FunctionAgent<I, O>;
function functionToAgent<T extends Agent>(agent: T): T;
function functionToAgent<T extends Agent>(agent: T | FunctionAgentFn): T | FunctionAgent;
function functionToAgent<T extends Agent>(agent: T | FunctionAgentFn): T | FunctionAgent {
  if (typeof agent === "function") {
    return FunctionAgent.from({ name: agent.name, fn: agent });
  }
  return agent;
}
