import debug, { type Debugger } from "debug";
import ora from "ora";

interface DebugWithSpinner extends Debugger {
  spinner<T>(
    promise: Promise<T>,
    message?: string,
    callback?: (result: T) => void,
    options?: { disabled?: boolean },
  ): Promise<T>;
  extend: (namespace: string) => DebugWithSpinner;
}

debug.log = (...args) => {
  const { isSpinning } = globalSpinner;
  if (isSpinning) globalSpinner.stop();
  console.log(...args);
  if (isSpinning) globalSpinner.start();
};

function createDebugger(namespace: string): DebugWithSpinner {
  const i = debug(namespace) as DebugWithSpinner;

  function overrideExtend(debug: DebugWithSpinner) {
    const originalExtend = debug.extend;
    debug.extend = (namespace: string) => {
      const extended = originalExtend.call(debug, namespace);
      overrideExtend(extended);

      extended.spinner = async <T>(
        promise: Promise<T>,
        message?: string,
        callback?: (result: T) => void,
        options?: { disabled?: boolean },
      ) => {
        if (!extended.enabled || options?.disabled) return promise;

        return spinner(promise, message, callback);
      };

      return extended;
    };
  }

  overrideExtend(i);

  return i;
}

const globalSpinner = ora();

async function spinner<T>(
  promise: Promise<T>,
  message?: string,
  callback?: (result: T) => void,
): Promise<T> {
  const { isSpinning, text } = globalSpinner;

  try {
    globalSpinner.start(message || " ");
    const result = await promise;
    if (message) globalSpinner.succeed(message);
    else globalSpinner.stop();

    // NOTE: This is a workaround to make sure the spinner stops spinning before the next tick
    await new Promise((resolve) => setTimeout(resolve, 100));

    callback?.(result);

    // NOTE: This is a workaround to make sure the spinner stops spinning before the next tick
    await new Promise((resolve) => setTimeout(resolve, 100));

    return result;
  } catch (error) {
    globalSpinner.fail(message || " ");
    throw error;
  } finally {
    // Recover the spinner state
    if (isSpinning) globalSpinner.start(text || " ");
  }
}

const base = createDebugger("aigne");

export const logger = {
  base,
  debug: base.extend("core"),
  spinner,
};
