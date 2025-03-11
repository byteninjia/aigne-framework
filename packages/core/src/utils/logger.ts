import debug from "debug";

export const logger = {
  base: debug("@aigne/core"),
  debug: debug("@aigne/core:debug"),
  error: debug("@aigne/core:error"),
};
