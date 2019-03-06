const isPromise = <T = any>(o: any): o is Promise<T> => {
  return typeof (o && o.then) === 'function'
}

export type AnyFunction = (...args: any[]) => any
export type Decorator<T extends AnyFunction> = (fn: T) => T

export interface DecoratorOptions<T extends AnyFunction> {
  onCalled?(params: Parameters<T>, fnName: string): void
  onReturned?(
    result: ReturnType<T>,
    params: Parameters<T>,
    fnName: string,
  ): void
  onError?(error: any, params: Parameters<T>, fnName: string): void
  fnName?: string
  self?: any
}

/** 创建一个函数装饰器 */
export function createDecorator<T extends AnyFunction>({
  onCalled,
  onReturned,
  onError,
  fnName,
  self = null,
}: DecoratorOptions<T>): Decorator<T> {
  const decorator = (fn) => {
    const decoratedFunction = ((...params: Parameters<T>): ReturnType<T> => {
      if (onCalled) {
        onCalled(params, fnName || fn.name)
      }

      try {
        const result = fn.apply(self, params) as ReturnType<T> | ReturnType<T>
        if (isPromise(result)) {
          return result.then(
            (result: ReturnType<T>) => {
              if (onReturned) {
                onReturned(result, params, fnName || fn.name)
              }
              return result
            },
            (error: any) => {
              if (onError) {
                onError(error, params, fnName || fn.name)
              }
              throw error
            },
          )
        } else {
          if (onReturned) {
            onReturned(result, params, fnName || fn.name)
          }
          return result
        }
      } catch (error) {
        if (onError) {
          onError(error, params, fnName || fn.name)
        }
        throw error
      }
    }) as T

    return decoratedFunction
  }
  return decorator
}

/** 装饰一个对象，对象的所有方法都会被装饰 */
export function decorateObject<T extends { [K: string]: any }>(
  object: T,
  options: DecoratorOptions<any>,
): T {
  for (const key in object) {
    const fn = object[key]
    if (key !== 'constructor' && typeof fn == 'function') {
      const decorator = createDecorator({
        ...options,
        self: object,
        fnName: key,
      })
      object[key] = decorator(fn as any) as any
    }
  }
  return object
}
