import { expect, test } from "bun:test";
import { logger } from "../../src/utils/logger";

test("logger", async () => {
  expect(logger).toEqual({
    base: expect.any(Function),
    debug: expect.any(Function),
    spinner: expect.any(Function),
  });
});
