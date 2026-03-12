import React from "react";
import { execFile } from "node:child_process";
import { Buffer } from "node:buffer";
import { promisify } from "node:util";

import { currentPluginName } from "../state";
import { AI } from "./ai";
import { Cache } from "./cache";
import { LocalStorage } from "./localStorage";
import { showToast } from "./toast";
import { ToastStyle } from "../types";
import { environment } from "./environment";

type BodyInitLike = string | Uint8Array | ArrayBuffer | URLSearchParams;

const execFileAsync = promisify(execFile);

type AsyncState<T> = {
  data: T | undefined;
  isLoading: boolean;
  error: Error | undefined;
};

type PaginationState = {
  page: number;
  pageSize: number;
  hasMore: boolean;
  onLoadMore: () => void;
};

type MutationOptions<T> = {
  optimisticUpdate?: (data: T | undefined) => T;
  rollbackOnError?: boolean | ((data: T | undefined) => T | undefined);
  shouldRevalidateAfter?: boolean;
};

type UseAsyncOptions<TData> = {
  initialData?: TData;
  execute?: boolean;
  onData?: (data: TData) => void;
  onError?: (error: Error) => void;
  onWillExecute?: (args: unknown[]) => void;
};

export enum FormValidation {
  Required = "required",
}

export enum DeeplinkType {
  Extension = "extension",
  ScriptCommand = "scriptCommand",
}

function stableSerialize(value: unknown): string {
  try {
    return JSON.stringify(value, (_key, entry) => {
      if (entry && typeof entry === "object" && !Array.isArray(entry)) {
        return Object.fromEntries(
          Object.entries(entry as Record<string, unknown>).sort(([left], [right]) =>
            left.localeCompare(right),
          ),
        );
      }
      return entry;
    });
  } catch {
    return String(value);
  }
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}

function toJsonString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value);
}

function tryParseJson<T>(value: string | undefined, fallback: T): T {
  if (typeof value !== "string") {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function encodeSvg(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function escapeSqlLiteral(value: unknown): string {
  if (value == null) {
    return "null";
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "null";
  }
  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function useMountedRef(): React.RefObject<boolean> {
  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  return mountedRef;
}

function useAsyncRunner<TData>(
  executor: () => Promise<TData>,
  deps: React.DependencyList,
  options: UseAsyncOptions<TData> = {},
): AsyncState<TData> & {
  revalidate: () => void;
  mutate: (asyncUpdate?: Promise<TData>, mutateOptions?: MutationOptions<TData>) => Promise<TData | undefined>;
} {
  const [state, setState] = React.useState<AsyncState<TData>>({
    data: options.initialData,
    isLoading: options.execute !== false,
    error: undefined,
  });
  const [runVersion, setRunVersion] = React.useState(0);
  const mountedRef = useMountedRef();
  const executorRef = React.useRef(executor);
  const optionsRef = React.useRef(options);
  executorRef.current = executor;
  optionsRef.current = options;

  const run = React.useCallback(async () => {
    const currentOptions = optionsRef.current;
    if (currentOptions.execute === false) {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        error: undefined,
      }));
      return;
    }

    currentOptions.onWillExecute?.([]);
    setState((previous) => ({
      ...previous,
      isLoading: true,
      error: undefined,
    }));

    try {
      const result = await executorRef.current();
      if (!mountedRef.current) {
        return;
      }
      setState({
        data: result,
        isLoading: false,
        error: undefined,
      });
      currentOptions.onData?.(result);
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }
      const normalized = normalizeError(error);
      setState((previous) => ({
        ...previous,
        isLoading: false,
        error: normalized,
      }));
      currentOptions.onError?.(normalized);
    }
  }, [mountedRef]);

  React.useEffect(() => {
    void run();
  }, [run, runVersion, ...deps]);

  const revalidate = React.useCallback(() => {
    setRunVersion((value) => value + 1);
  }, []);

  const mutate = React.useCallback(
    async (asyncUpdate?: Promise<TData>, mutateOptions?: MutationOptions<TData>) => {
      const previousData = state.data;

      if (mutateOptions?.optimisticUpdate) {
        setState((previous) => ({
          ...previous,
          data: mutateOptions.optimisticUpdate?.(previous.data),
        }));
      }

      if (!asyncUpdate) {
        revalidate();
        return previousData;
      }

      try {
        const result = await asyncUpdate;
        if (mutateOptions?.shouldRevalidateAfter !== true) {
          setState((previous) => ({
            ...previous,
            data: result,
          }));
        } else {
          revalidate();
        }
        return result;
      } catch (error) {
        if (mutateOptions?.rollbackOnError !== false) {
          const rollbackValue =
            typeof mutateOptions?.rollbackOnError === "function"
              ? mutateOptions.rollbackOnError(previousData)
              : previousData;
          setState((previous) => ({
            ...previous,
            data: rollbackValue,
          }));
        }
        throw error;
      }
    },
    [revalidate, state.data],
  );

  return {
    ...state,
    revalidate,
    mutate,
  };
}

export function useCachedState<T>(
  key: string,
  initialValue?: T,
  config?: { cacheNamespace?: string },
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const namespace = config?.cacheNamespace?.trim() ? `${config.cacheNamespace.trim()}:` : "";
  const cacheKey = `useCachedState:${namespace}${key}`;
  const cacheRef = React.useRef(new Cache({ namespace: currentPluginName ?? "default" }));

  const [value, setValue] = React.useState<T>(() => {
    const cached = cacheRef.current.get(cacheKey);
    return cached ? tryParseJson<T>(cached, initialValue as T) : (initialValue as T);
  });

  const setCachedValue = React.useCallback<React.Dispatch<React.SetStateAction<T>>>(
    (nextValue) => {
      setValue((previous) => {
        const resolved =
          typeof nextValue === "function"
            ? (nextValue as (value: T) => T)(previous)
            : nextValue;
        cacheRef.current.set(cacheKey, toJsonString(resolved));
        return resolved;
      });
    },
    [cacheKey],
  );

  return [value, setCachedValue];
}

export function useLocalStorage<T>(key: string, initialValue?: T): {
  value: T | undefined;
  setValue: (value: T | ((previous: T | undefined) => T)) => Promise<void>;
  removeValue: () => Promise<void>;
  isLoading: boolean;
} {
  const [value, setValue] = React.useState<T | undefined>(initialValue);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let disposed = false;

    void LocalStorage.getItem<string>(key)
      .then((stored) => {
        if (disposed) {
          return;
        }
        if (typeof stored === "string") {
          setValue(tryParseJson<T>(stored, initialValue as T));
        } else {
          setValue((stored as T | undefined) ?? initialValue);
        }
      })
      .finally(() => {
        if (!disposed) {
          setIsLoading(false);
        }
      });

    return () => {
      disposed = true;
    };
  }, [initialValue, key]);

  const setStoredValue = React.useCallback(
    async (nextValue: T | ((previous: T | undefined) => T)) => {
      const resolved =
        typeof nextValue === "function"
          ? (nextValue as (previous: T | undefined) => T)(value)
          : nextValue;
      setValue(resolved);
      await LocalStorage.setItem(key, toJsonString(resolved));
    },
    [key, value],
  );

  const removeValue = React.useCallback(async () => {
    setValue(undefined);
    await LocalStorage.removeItem(key);
  }, [key]);

  return {
    value,
    setValue: setStoredValue,
    removeValue,
    isLoading,
  };
}

export function usePromise<T>(
  fn: (...args: unknown[]) => Promise<T>,
  args: unknown[] = [],
  options: UseAsyncOptions<T> = {},
) {
  const fnRef = React.useRef(fn);
  fnRef.current = fn;
  const argsKey = stableSerialize(args);

  return useAsyncRunner<T>(
    () => fnRef.current(...args),
    [argsKey],
    {
      ...options,
      onWillExecute: () => options.onWillExecute?.(args),
    },
  );
}

export function useCachedPromise<T>(
  fn: (...args: unknown[]) => Promise<T>,
  args: unknown[] = [],
  options: UseAsyncOptions<T> & {
    keepPreviousData?: boolean;
  } = {},
) {
  const cache = React.useMemo(() => new Cache({ namespace: currentPluginName ?? "default" }), []);
  const cacheKey = React.useMemo(
    () => `useCachedPromise:${fn.name || "anonymous"}:${stableSerialize(args)}`,
    [args, fn.name],
  );
  const [cachedData, setCachedData] = React.useState<T | undefined>(() => {
    const existing = cache.get(cacheKey);
    return existing ? tryParseJson<T>(existing, options.initialData as T) : options.initialData;
  });

  const result = usePromise<T>(
    async (...runtimeArgs) => {
      const resolved = await fn(...runtimeArgs);
      cache.set(cacheKey, toJsonString(resolved));
      setCachedData(resolved);
      return resolved;
    },
    args,
    {
      ...options,
      initialData: options.keepPreviousData ? cachedData : (cachedData ?? options.initialData),
    },
  );

  return result;
}

export function useFetch<T = unknown>(
  url: string | ((options: { page: number; cursor?: string; lastItem?: unknown }) => string),
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: BodyInitLike | Record<string, unknown>;
    mapResult?: (result: unknown) => { data: T; hasMore?: boolean; cursor?: string } | T;
    parseResponse?: (response: Response) => Promise<unknown>;
    initialData?: T;
    execute?: boolean;
    keepPreviousData?: boolean;
    onData?: (data: T) => void;
    onError?: (error: Error) => void;
    onWillExecute?: () => void;
  } = {},
) {
  const [page, setPage] = React.useState(0);
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = React.useState(false);
  const [data, setData] = React.useState<T | undefined>(options.initialData);
  const [isLoading, setIsLoading] = React.useState(options.execute !== false);
  const [error, setError] = React.useState<Error | undefined>(undefined);
  const mountedRef = useMountedRef();
  const urlRef = React.useRef(url);
  const optionsRef = React.useRef(options);
  urlRef.current = url;
  optionsRef.current = options;

  const executeFetch = React.useCallback(
    async (pageValue: number, cursorValue?: string) => {
      const currentOptions = optionsRef.current;
      if (currentOptions.execute === false) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(undefined);
      currentOptions.onWillExecute?.();

      try {
        const resolvedUrl =
          typeof urlRef.current === "function"
            ? urlRef.current({ page: pageValue, cursor: cursorValue, lastItem: undefined })
            : urlRef.current;
        const response = await fetch(resolvedUrl, {
          method: currentOptions.method,
          headers: currentOptions.headers,
          body:
            currentOptions.body &&
              typeof currentOptions.body === "object" &&
              !(currentOptions.body instanceof Uint8Array)
              ? JSON.stringify(currentOptions.body)
              : (currentOptions.body as BodyInitLike | undefined),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const parsed = currentOptions.parseResponse
          ? await currentOptions.parseResponse(response)
          : await response.json();
        if (!mountedRef.current) {
          return;
        }

        const mapped = currentOptions.mapResult ? currentOptions.mapResult(parsed) : (parsed as T);
        if (mapped && typeof mapped === "object" && "data" in (mapped as Record<string, unknown>)) {
          const paged = mapped as { data: T; hasMore?: boolean; cursor?: string };
          setHasMore(Boolean(paged.hasMore));
          setCursor(paged.cursor);
          setData((previous) => {
            if (pageValue === 0 || !Array.isArray(previous) || !Array.isArray(paged.data)) {
              return paged.data;
            }
            return [...previous, ...paged.data] as T;
          });
          currentOptions.onData?.(paged.data);
        } else {
          setHasMore(false);
          setCursor(undefined);
          setData(mapped as T);
          currentOptions.onData?.(mapped as T);
        }
      } catch (fetchError) {
        if (!mountedRef.current) {
          return;
        }
        const normalized = normalizeError(fetchError);
        setError(normalized);
        currentOptions.onError?.(normalized);
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [mountedRef],
  );

  const requestKey = stableSerialize({
    execute: options.execute ?? true,
    method: options.method ?? "GET",
    headers: options.headers ?? null,
    body: options.body ?? null,
    url: typeof url === "string" ? url : "function",
  });

  React.useEffect(() => {
    setPage(0);
    setCursor(undefined);
    setData(options.keepPreviousData ? data : options.initialData);
    void executeFetch(0, undefined);
  }, [executeFetch, options.initialData, options.keepPreviousData, requestKey]);

  const revalidate = React.useCallback(() => {
    setPage(0);
    setCursor(undefined);
    void executeFetch(0, undefined);
  }, [executeFetch]);

  const mutate = React.useCallback(
    async (asyncUpdate?: Promise<T>, mutateOptions?: MutationOptions<T>) => {
      const previousData = data;
      if (mutateOptions?.optimisticUpdate) {
        setData(mutateOptions.optimisticUpdate(previousData));
      }
      if (!asyncUpdate) {
        revalidate();
        return previousData;
      }
      try {
        const result = await asyncUpdate;
        if (mutateOptions?.shouldRevalidateAfter === true) {
          revalidate();
        } else {
          setData(result);
        }
        return result;
      } catch (mutationError) {
        if (mutateOptions?.rollbackOnError !== false) {
          const rollback =
            typeof mutateOptions?.rollbackOnError === "function"
              ? mutateOptions.rollbackOnError(previousData)
              : previousData;
          setData(rollback);
        }
        throw mutationError;
      }
    },
    [data, revalidate],
  );

  const onLoadMore = React.useCallback(() => {
    if (!hasMore || isLoading) {
      return;
    }
    const nextPage = page + 1;
    setPage(nextPage);
    void executeFetch(nextPage, cursor);
  }, [cursor, executeFetch, hasMore, isLoading, page]);

  const pagination: PaginationState = React.useMemo(
    () => ({
      page,
      pageSize: 20,
      hasMore,
      onLoadMore,
    }),
    [hasMore, onLoadMore, page],
  );

  return {
    data,
    isLoading,
    error,
    revalidate,
    mutate,
    pagination,
  };
}

export function useAI(
  prompt: string,
  options: {
    model?: string;
    creativity?: string | number;
    execute?: boolean;
    stream?: boolean;
    onError?: (error: Error) => void;
    onData?: (data: string) => void;
    onWillExecute?: (args: [string]) => void;
  } = {},
) {
  const [data, setData] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>(undefined);
  const abortRef = React.useRef<AbortController | null>(null);
  const promptRef = React.useRef(prompt);
  const optionsRef = React.useRef(options);
  promptRef.current = prompt;
  optionsRef.current = options;

  const run = React.useCallback(() => {
    const currentPrompt = promptRef.current;
    const currentOptions = optionsRef.current;
    if (!currentPrompt || currentOptions.execute === false) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setData("");
    setError(undefined);
    setIsLoading(true);
    currentOptions.onWillExecute?.([currentPrompt]);

    const request = AI.ask(currentPrompt, {
      model: currentOptions.model,
      creativity:
        currentOptions.creativity as NonNullable<Parameters<typeof AI.ask>[1]>["creativity"],
      signal: controller.signal,
    });

    if (currentOptions.stream !== false) {
      request.on("data", (chunk) => {
        if (!controller.signal.aborted) {
          setData((previous) => previous + chunk);
        }
      });
    }

    request
      .then((fullText) => {
        if (controller.signal.aborted) {
          return;
        }
        if (currentOptions.stream === false) {
          setData(fullText);
        }
        setIsLoading(false);
        currentOptions.onData?.(fullText);
      })
      .catch((requestError) => {
        if (controller.signal.aborted) {
          return;
        }
        const normalized = normalizeError(requestError);
        setError(normalized);
        setIsLoading(false);
        currentOptions.onError?.(normalized);
      });
  }, []);

  React.useEffect(() => {
    run();
    return () => {
      abortRef.current?.abort();
    };
  }, [options.creativity, options.execute, options.model, options.stream, prompt, run]);

  return {
    data,
    isLoading,
    error,
    revalidate: run,
  };
}

export function useForm<T extends Record<string, unknown> = Record<string, unknown>>(options: {
  onSubmit: (values: T) => void | boolean | Promise<void | boolean>;
  initialValues?: Partial<T>;
  validation?: Partial<Record<keyof T, ((value: unknown) => string | undefined | null) | FormValidation>>;
}) {
  const [values, setValues] = React.useState<T>((options.initialValues ?? {}) as T);
  const [errors, setErrors] = React.useState<Partial<Record<keyof T, string>>>({});

  const setValue = React.useCallback((key: keyof T, value: unknown) => {
    setValues((previous) => ({ ...previous, [key]: value }) as T);
    setErrors((previous) => {
      const next = { ...previous };
      delete next[key];
      return next;
    });
  }, []);

  const validateField = React.useCallback(
    (key: keyof T, value: unknown): string | undefined => {
      const rule = options.validation?.[key];
      if (!rule) {
        return undefined;
      }
      if (rule === FormValidation.Required) {
        if (
          value == null ||
          value === "" ||
          (Array.isArray(value) && value.length === 0)
        ) {
          return "This field is required";
        }
        return undefined;
      }
      return rule(value) ?? undefined;
    },
    [options.validation],
  );

  const handleSubmit = React.useCallback(
    async (submitValues: T) => {
      const nextErrors: Partial<Record<keyof T, string>> = {};
      for (const key of Object.keys(options.validation ?? {}) as Array<keyof T>) {
        const error = validateField(key, submitValues[key]);
        if (error) {
          nextErrors[key] = error;
        }
      }
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) {
        return;
      }
      await options.onSubmit(submitValues);
    },
    [options, validateField],
  );

  const itemProps = React.useMemo(() => {
    const allKeys = new Set<string>([
      ...Object.keys(options.initialValues ?? {}),
      ...Object.keys(options.validation ?? {}),
      ...Object.keys(values),
    ]);

    return Object.fromEntries(
      Array.from(allKeys).map((key) => [
        key,
        {
          id: key,
          value: values[key as keyof T],
          error: errors[key as keyof T],
          onChange: (value: unknown) => setValue(key as keyof T, value),
          onBlur: () => {
            const nextError = validateField(key as keyof T, values[key as keyof T]);
            setErrors((previous) => ({
              ...previous,
              [key]: nextError,
            }));
          },
        },
      ]),
    ) as Record<
      string,
      {
        id: string;
        value: unknown;
        error?: string;
        onChange: (value: unknown) => void;
        onBlur: () => void;
      }
    >;
  }, [errors, options.initialValues, options.validation, setValue, validateField, values]);

  return {
    handleSubmit,
    itemProps,
    values,
    setValue,
    setValidationError: (key: keyof T, error: string) => {
      setErrors((previous) => ({ ...previous, [key]: error }));
    },
    reset: (nextValues?: Partial<T>) => {
      setValues((nextValues ?? options.initialValues ?? {}) as T);
      setErrors({});
    },
    focus: (_key: keyof T) => {},
  };
}

export function useStreamJSON<T = unknown>(
  streamFactory: () => Promise<Response | AsyncIterable<string | Uint8Array>>,
  options: {
    execute?: boolean;
    onData?: (chunk: T) => void;
    onError?: (error: Error) => void;
  } = {},
) {
  const [data, setData] = React.useState<T[]>([]);
  const [isLoading, setIsLoading] = React.useState(options.execute !== false);
  const [error, setError] = React.useState<Error | undefined>(undefined);

  const run = React.useCallback(async () => {
    if (options.execute === false) {
      setIsLoading(false);
      return;
    }

    setData([]);
    setError(undefined);
    setIsLoading(true);

    try {
      const source = await streamFactory();
      const chunks: string[] = [];

      if (typeof (source as Response).body?.getReader === "function") {
        const reader = (source as Response).body?.getReader();
        const decoder = new TextDecoder();
        while (reader) {
          const result = await reader.read();
          if (result.done) {
            break;
          }
          chunks.push(decoder.decode(result.value, { stream: true }));
        }
      } else {
        for await (const chunk of source as AsyncIterable<string | Uint8Array>) {
          chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
        }
      }

      const parsed = chunks
        .join("")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => JSON.parse(line) as T);

      setData(parsed);
      for (const entry of parsed) {
        options.onData?.(entry);
      }
    } catch (streamError) {
      const normalized = normalizeError(streamError);
      setError(normalized);
      options.onError?.(normalized);
    } finally {
      setIsLoading(false);
    }
  }, [options, streamFactory]);

  React.useEffect(() => {
    void run();
  }, [run]);

  return {
    data,
    isLoading,
    error,
    revalidate: run,
  };
}

export function useExec(
  command: string | string[],
  options: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    shell?: boolean;
    execute?: boolean;
    onData?: (data: { stdout: string; stderr: string; exitCode: number | null }) => void;
    onError?: (error: Error) => void;
  } = {},
) {
  return usePromise(
    async () => {
      const [file, ...args] = Array.isArray(command) ? command : [command];
      if (!file) {
        throw new Error("useExec requires a command.");
      }

      const result = await execFileAsync(file, args, {
        cwd: options.cwd,
        env: options.env,
        shell: options.shell,
      }).then(
        (output) => ({
          stdout: output.stdout,
          stderr: output.stderr,
          exitCode: 0,
        }),
        (error: Error & { stdout?: string; stderr?: string; code?: number | string }) => ({
          stdout: error.stdout ?? "",
          stderr: error.stderr ?? "",
          exitCode: typeof error.code === "number" ? error.code : null,
        }),
      );
      options.onData?.(result);
      return result;
    },
    [],
    options,
  );
}

export async function executeSQL<T = unknown>(
  databasePath: string,
  query: string,
  params: unknown[] = [],
): Promise<T[]> {
  let sqliteModule: {
    DatabaseSync?: new (
      path: string,
      ...args: unknown[]
    ) => { prepare: (sql: string) => { all: (...args: unknown[]) => T[] } };
  };
  try {
    sqliteModule = (await import("node:sqlite")) as unknown as typeof sqliteModule;
  } catch {
    let paramIndex = 0;
    const interpolatedQuery = query.replace(/\?/g, () => escapeSqlLiteral(params[paramIndex++]));
    const result = await execFileAsync("sqlite3", [
      "-json",
      databasePath,
      interpolatedQuery,
    ]).catch((error) => {
      throw new Error(
        error instanceof Error ? error.message : "SQL helpers require sqlite support.",
      );
    });
    return tryParseJson<T[]>(result.stdout, []);
  }

  if (!sqliteModule.DatabaseSync) {
    throw new Error("SQL helpers require DatabaseSync support.");
  }

  const database = new sqliteModule.DatabaseSync(databasePath);
  const statement = database.prepare(query);
  return statement.all(...params);
}

export function useSQL<T = unknown>(
  databasePath: string,
  query: string,
  params: unknown[] = [],
  options: UseAsyncOptions<T[]> = {},
) {
  return usePromise<T[]>(
    () => executeSQL<T>(databasePath, query, params),
    [databasePath, query, ...params],
    options,
  );
}

export function withCache<TArgs extends unknown[], TResult>(
  keyPrefix: string,
  fn: (...args: TArgs) => Promise<TResult>,
  options: { namespace?: string; ttl?: number } = {},
): (...args: TArgs) => Promise<TResult> {
  const cache = new Cache({ namespace: options.namespace ?? currentPluginName ?? "default" });

  return async (...args: TArgs) => {
    const key = `${keyPrefix}:${stableSerialize(args)}`;
    const raw = cache.get(key);
    if (raw) {
      const cached = tryParseJson<{ value: TResult; expiresAt?: number } | TResult>(raw, raw as TResult);
      if (
        cached &&
        typeof cached === "object" &&
        "value" in (cached as Record<string, unknown>) &&
        (!("expiresAt" in (cached as Record<string, unknown>)) ||
          typeof (cached as { expiresAt?: number }).expiresAt !== "number" ||
          (cached as { expiresAt?: number }).expiresAt! > Date.now())
      ) {
        return (cached as { value: TResult }).value;
      }
    }

    const value = await fn(...args);
    const expiresAt = options.ttl ? Date.now() + options.ttl : undefined;
    cache.set(key, toJsonString({ value, expiresAt }));
    return value;
  };
}

export function getFavicon(
  target: string | { url: string },
  options: { fallback?: string; size?: number } = {},
): string {
  const rawUrl = typeof target === "string" ? target : target.url;
  try {
    const url = new URL(rawUrl);
    return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=${options.size ?? 64}`;
  } catch {
    return options.fallback ?? "";
  }
}

const AVATAR_COLORS = [
  "#ff6363",
  "#ff9f43",
  "#feca57",
  "#2ecc71",
  "#54a0ff",
  "#c56cf0",
  "#ff6b81",
  "#7bed9f",
  "#70a1ff",
  "#ffa502",
];

function hashString(value: string): number {
  let hash = 0;
  for (const char of value) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getAvatarIcon(
  name: string,
  options: { background?: string; gradient?: boolean } = {},
): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstPart = parts[0] ?? "";
  const lastPart = parts[parts.length - 1] ?? "";
  const initials =
    parts.length === 0
      ? "?"
      : parts.length === 1
        ? firstPart.slice(0, 1).toUpperCase()
        : `${firstPart.slice(0, 1)}${lastPart.slice(0, 1)}`.toUpperCase();
  const background = options.background ?? AVATAR_COLORS[hashString(name) % AVATAR_COLORS.length];
  const gradient = options.gradient !== false
    ? '<rect width="64" height="64" rx="32" fill="url(#g)"/>'
    : "";
  const defs = options.gradient !== false
    ? '<defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="rgba(255,255,255,0.12)"/><stop offset="100%" stop-color="rgba(0,0,0,0.12)"/></linearGradient></defs>'
    : "";
  return encodeSvg(
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">${defs}<rect width="64" height="64" rx="32" fill="${background}"/>${gradient}<text x="32" y="32" text-anchor="middle" dominant-baseline="central" fill="white" font-size="24" font-family="system-ui,sans-serif" font-weight="700">${initials}</text></svg>`,
  );
}

export function getProgressIcon(
  progress: number,
  color = "#ff6363",
  options: { background?: string; backgroundOpacity?: number } = {},
): string {
  const clamped = Math.max(0, Math.min(1, progress));
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped);
  return encodeSvg(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="${radius}" fill="none" stroke="${options.background ?? "#ffffff"}" stroke-width="4" opacity="${options.backgroundOpacity ?? 0.15}"/><circle cx="16" cy="16" r="${radius}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}" transform="rotate(-90 16 16)"/></svg>`,
  );
}

export async function showFailureToast(
  error: unknown,
  options: { title?: string; message?: string } = {},
): Promise<void> {
  const normalized = normalizeError(error);
  await showToast({
    style: ToastStyle.Failure,
    title: options.title ?? "Error",
    message: options.message ?? normalized.message,
  });
}

export async function runAppleScript(script: string): Promise<string> {
  if (process.platform !== "darwin") {
    throw new Error("runAppleScript is only available on macOS.");
  }

  const result = await execFileAsync("osascript", ["-e", script]);
  return result.stdout.trim();
}

export function createDeeplink(
  options:
    | {
        type?: DeeplinkType.Extension;
        command: string;
        launchType?: string;
        arguments?: Record<string, string>;
        fallbackText?: string;
        ownerOrAuthorName?: string;
        extensionName?: string;
      }
    | {
        type: DeeplinkType.ScriptCommand;
        command: string;
        arguments?: string[];
      },
): string {
  if (options.type === DeeplinkType.ScriptCommand) {
    const params = new URLSearchParams();
    for (const argument of options.arguments ?? []) {
      params.append("arguments", argument);
    }
    const query = params.toString();
    return `raycast://script-commands/${encodeURIComponent(options.command)}${query ? `?${query}` : ""}`;
  }

  const params = new URLSearchParams();
  if (options.launchType) {
    params.set("launchType", options.launchType);
  }
  if (options.arguments && Object.keys(options.arguments).length > 0) {
    params.set("arguments", JSON.stringify(options.arguments));
  }
  if (options.fallbackText) {
    params.set("fallbackText", options.fallbackText);
  }

  const owner = options.ownerOrAuthorName ?? environment.ownerOrAuthorName;
  const extensionName = options.extensionName ?? environment.extensionName;
  const query = params.toString();

  return `raycast://extensions/${encodeURIComponent(owner)}/${encodeURIComponent(extensionName)}/${encodeURIComponent(options.command)}${query ? `?${query}` : ""}`;
}

export function useFrecencySorting<T>(
  items: T[],
  options: {
    key: (item: T) => string;
    namespace?: string;
  },
): { data: T[]; visitItem: (item: T) => Promise<void> } {
  const namespace = options.namespace ?? currentPluginName ?? "default";
  const storageKey = `useFrecencySorting:${namespace}`;
  const [scores, setScores] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    let disposed = false;
    void LocalStorage.getItem<string>(storageKey).then((stored) => {
      if (!disposed) {
        setScores(tryParseJson<Record<string, number>>(stored, {}));
      }
    });
    return () => {
      disposed = true;
    };
  }, [storageKey]);

  const sorted = React.useMemo(
    () =>
      [...items].sort((left, right) => {
        const leftScore = scores[options.key(left)] ?? 0;
        const rightScore = scores[options.key(right)] ?? 0;
        return rightScore - leftScore;
      }),
    [items, options, scores],
  );

  const visitItem = React.useCallback(
    async (item: T) => {
      const key = options.key(item);
      setScores((previous) => {
        const next = {
          ...previous,
          [key]: (previous[key] ?? 0) + 1,
        };
        void LocalStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
    },
    [options, storageKey],
  );

  return { data: sorted, visitItem };
}

export function getRaycastUtils() {
  return {
    createDeeplink,
    DeeplinkType,
    executeSQL,
    FormValidation,
    getAvatarIcon,
    getFavicon,
    getProgressIcon,
    runAppleScript,
    showFailureToast,
    useAI,
    useCachedPromise,
    useCachedState,
    useExec,
    useFetch,
    useForm,
    useFrecencySorting,
    useLocalStorage,
    usePromise,
    useSQL,
    useStreamJSON,
    withCache,
  };
}
