export type Options = {
  readonly immediate?: boolean;
};

export type DebouncedFunction<Args extends readonly unknown[], ReturnValue> = {
  (...arguments_: Args): ReturnValue | undefined;
  readonly isPending: boolean;
  clear(): void;
  flush(): void;
  trigger(): void;
};

export default function debounce<Args extends readonly unknown[], ReturnValue>(
  function_: (...arguments_: Args) => ReturnValue,
  wait = 100,
  options: Options = {},
): DebouncedFunction<Args, ReturnValue> {
  if (typeof function_ !== "function") {
    throw new TypeError(
      `Expected the first parameter to be a function, got \`${typeof function_}\`.`,
    );
  }

  if (wait < 0) {
    throw new RangeError("`wait` must not be negative.");
  }

  if (typeof options === "boolean") {
    throw new TypeError(
      "The `options` parameter must be an object, not a boolean. Use `{immediate: true}` instead.",
    );
  }

  const { immediate = false } = options;

  let storedArguments: Args | undefined;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let timestamp = 0;
  let result: ReturnValue | undefined;

  const run = () => {
    const callArguments = storedArguments;
    storedArguments = undefined;

    if (!callArguments) {
      return result;
    }

    result = function_(...callArguments);
    return result;
  };

  const later = () => {
    const last = Date.now() - timestamp;

    if (last < wait && last >= 0) {
      timeoutId = setTimeout(later, wait - last);
    } else {
      timeoutId = undefined;
      if (!immediate) {
        run();
      }
    }
  };

  const debounced = ((...arguments_: Args): ReturnValue | undefined => {
    storedArguments = arguments_;
    timestamp = Date.now();

    const callNow = immediate && !timeoutId;

    if (!timeoutId) {
      timeoutId = setTimeout(later, wait);
    }

    if (callNow) {
      result = run();
      return result;
    }

    return undefined;
  }) as DebouncedFunction<Args, ReturnValue>;

  Object.defineProperty(debounced, "isPending", {
    get() {
      return timeoutId !== undefined;
    },
  });

  debounced.clear = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }

    storedArguments = undefined;
  };

  debounced.flush = () => {
    if (!timeoutId) {
      return;
    }

    debounced.trigger();
  };

  debounced.trigger = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }

    run();
  };

  return debounced;
}
