import path from "node:path";
import { AIGNEHubChatModel } from "@aigne/aigne-hub";
import { AIGNE } from "@aigne/core";
import { loadAIGNEFile } from "@aigne/core/loader/index.js";
import { AIGNEHTTPServer } from "@aigne/transport/http-server/server.js";
import { type NextFunction, type Request, type Response, Router } from "express";

import logger from "../libs/logger.js";

const router = Router();
const AuthService = require("@blocklet/sdk/service/auth");

const blocklet = new AuthService();
const COMPONENT_CACHE_TTL = 1 * 60 * 1000; // 1 minute
const componentCache = new Map();

router.use(async (req: Request, res: Response, next: NextFunction) => {
  const raw = String(req.headers["x-blocklet-component-id"] || "");
  const componentId = raw.split("/").pop();

  if (!componentId) {
    res.status(400).send("Agent Runtime: Bad Request");
    return;
  }

  const cachedChecker = componentCache.get(componentId);
  if (!cachedChecker || Date.now() - cachedChecker.timestamp > COMPONENT_CACHE_TTL) {
    const component = await blocklet.getComponent(componentId);
    componentCache.set(componentId, {
      component,
      timestamp: Date.now(),
    });
  }

  const cached = componentCache.get(componentId);
  const { component } = cached;
  if (!component) {
    res.status(404).send(`Agent Runtime: Component ${componentId} Not Found`);
    return;
  }

  const env = component.environments.find((x: { key: string }) => x.key === "BLOCKLET_APP_DIR");
  if (!env) {
    res.status(404).send("Agent Runtime: Component Not Valid");
    return;
  }

  req.mainDir = component.meta.main
    ? path.join(env.value, component.meta.main)
    : path.resolve(env.value);
  req.component = component;
  if (process.env.DOCKER_HOST_SERVER_DIR && process.env.DOCKER_CONTAINER_SERVER_DIR) {
    req.mainDir = req.mainDir.replace(
      new RegExp(process.env.DOCKER_HOST_SERVER_DIR, "g"),
      process.env.DOCKER_CONTAINER_SERVER_DIR,
    );
  }
  logger.warn("serve static from", req.mainDir);
  return next();
});

router.get("/health", (req, res) => {
  res.send(`component ${req.component?.meta?.title ?? req.component?.meta?.name} is running`);
});

router.get("/chat/agent", async (req, res) => {
  const { aigne } = await loadAIGNEFile(req.mainDir).catch(() => ({
    aigne: null,
  }));
  res.json({ data: aigne?.agents?.[0] });
});

router.post("/chat", async (req, res) => {
  try {
    const { aigne } = await loadAIGNEFile(req.mainDir).catch(() => ({
      aigne: null,
    }));
    const defaultModel = aigne?.model?.model?.split(":");
    if (defaultModel?.length !== 2) {
      res
        .status(400)
        .send(
          "change your aigne.yml chatModel model to be like openai/gpt-5-mini or openai/gpt-4o-mini",
        );
      return;
    }

    const chatModel = aigne?.model?.model?.split(":")?.join("/");
    logger.info("chatModel", chatModel);

    const model = new AIGNEHubChatModel({ model: chatModel });
    const engine = await AIGNE.load(req.mainDir, { model });
    const aigneServer = new AIGNEHTTPServer(engine);
    await aigneServer.invoke(req, res, { userContext: { userId: req.user?.did } });
  } catch (error) {
    logger.error("chat error", error);
    throw error;
  }
});

export default router;
