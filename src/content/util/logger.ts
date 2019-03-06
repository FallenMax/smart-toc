import {
  createDecorator,
  AnyFunction,
  decorateObject,
  Decorator,
} from './decorator'

export const createLogger = (name: string) => (...args: any[]) => {
  console.info(`[${name}]`, ...args)
}

/**
 * 记录函数调用和返回
 *
 * 创建一个装饰器，装饰后的 fn 会记录调用参数和返回结果
 */
export const createLoggingDecorator = <T extends AnyFunction>(
  name: string,
  self: any = null,
): Decorator<T> => {
  const logger = createLogger(name)
  const decorator = createDecorator<T>({
    onCalled(params) {
      // @ts-ignore
      logger(...params)
    },
    onReturned(result) {
      logger(result)
    },
    onError(error) {
      logger(` <ERROR> `)
      console.error(error)
    },
  })
  return decorator
}

/**
 * 记录对象各个方法的调用情况
 * 并添加到 window.logged.*上
 */
export const logObject = <T = any>(object: T, namespace: string): T => {
  const loggers = {} as any
  const getLogger = (fnName: string) => {
    if (!loggers[fnName]) {
      loggers[fnName] = createLogger(`${namespace}:${fnName}`)
    }
    return loggers[fnName]
  }
  const loggedObject = decorateObject<T>(object, {
    onCalled(params, fnName) {
      getLogger(fnName)(...params)
    },
    onReturned(result, params, fnName) {
      getLogger(fnName)(result)
    },
    onError(error, params, fnName) {
      getLogger(fnName)(` <ERROR> `)
      console.error(error)
    },
  })

  // @ts-ignore
  if (typeof window !== 'undefined') {
    // @ts-ignore
    const w = window as any
    if (!w.logged) {
      w.logged = {}
    }
    w.logged[namespace] = object
  }
  return loggedObject
}
