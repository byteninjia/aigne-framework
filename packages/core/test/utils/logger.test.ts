import { expect, test } from "bun:test";
import { logger } from "../../src/utils/logger";

test("logger", async () => {
  expect(logger).toEqual({
    debug: expect.any(Function),
    error: expect.any(Function),
  });
});
