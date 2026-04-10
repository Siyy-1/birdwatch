declare const describe: (name: string, fn: () => void) => void
declare const it: (name: string, fn: () => void | Promise<void>) => void
declare const beforeEach: (fn: () => void | Promise<void>) => void
declare const afterEach: (fn: () => void | Promise<void>) => void

declare const expect: (actual: unknown) => {
  toBe(expected: unknown): void
  toBeNull(): void
  toBeTruthy(): void
  toHaveLength(length: number): void
}

declare namespace jest {
  interface MockInstance<Args extends unknown[] = unknown[], Return = unknown> {
    (...args: Args): Return
    mockRejectedValue(value: unknown): this
    mockResolvedValue(value: unknown): this
    mockReturnValue(value: unknown): this
  }

  type Mocked<T> = {
    [K in keyof T]: T[K] extends (...args: infer Args) => infer Return
      ? MockInstance<Args, Return>
      : T[K] extends object
        ? Mocked<T[K]>
        : T[K]
  }

  function clearAllMocks(): void
  function fn(): MockInstance
  function mock(moduleName: string, factory?: () => unknown): void
  function restoreAllMocks(): void
  function spyOn<T extends object, K extends keyof T>(object: T, methodName: K): MockInstance
}
