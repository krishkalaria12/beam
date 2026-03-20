export type PaginationOptions<T = any> = {
  page: number;
  lastItem?: Flatten<T>;
  cursor?: any;
};

export type FunctionReturningPromise<T extends any[] = any[], U = any> = (...args: T) => Promise<U>;

export type FunctionReturningPaginatedPromise<
  T extends any[] = any[],
  U extends any[] = any[],
> = (...args: T) => (
  pagination: PaginationOptions<U>,
) => Promise<{
  data: U;
  hasMore?: boolean;
  cursor?: any;
}>;

export type UnwrapReturn<T extends FunctionReturningPromise | FunctionReturningPaginatedPromise> =
  T extends FunctionReturningPromise<any, infer U>
    ? Awaited<U>
    : T extends FunctionReturningPaginatedPromise<any, infer U>
      ? Awaited<U>
      : never;

export type Flatten<T> = T extends Array<infer U> ? U : T;

export type AsyncState<T> =
  | {
      isLoading: boolean;
      error?: undefined;
      data?: undefined;
    }
  | {
      isLoading: true;
      error?: Error | undefined;
      data?: T;
    }
  | {
      isLoading: false;
      error: Error;
      data?: undefined;
    }
  | {
      isLoading: false;
      error?: undefined;
      data: T;
    };

export type MutatePromise<T, U = T, V = any> = (
  asyncUpdate?: Promise<V>,
  options?: {
    optimisticUpdate?: (data: T | U) => T;
    rollbackOnError?: boolean | ((data: T | U) => T);
    shouldRevalidateAfter?: boolean;
  },
) => Promise<V>;

export type UsePromiseReturnType<T> = AsyncState<T> & {
  pagination?: {
    pageSize: number;
    hasMore: boolean;
    onLoadMore: () => void;
  };
  revalidate: () => Promise<T>;
  mutate: MutatePromise<T, undefined>;
};

export type UseCachedPromiseReturnType<T, U> = AsyncState<T> & {
  pagination?: {
    pageSize: number;
    hasMore: boolean;
    onLoadMore: () => void;
  };
  data: T | U;
  revalidate: () => void;
  mutate: MutatePromise<T | U>;
};
