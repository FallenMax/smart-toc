export const createEventEmitter = <
  EventMap extends { [K: string]: any } = { [K: string]: any }
>() => {
  type Keys = keyof EventMap
  type KeysPayloadRequired = {
    [K in Keys]: EventMap[K] extends undefined ? never : K
  }[Keys]

  type KeysPayloadOptional = Exclude<Keys, KeysPayloadRequired>

  type Handler<K extends keyof EventMap> = (payload: EventMap[K]) => void

  let listeners = {} as { [K in Keys]: Handler<K>[] }

  const on = <K extends Keys>(event: K, handler: Handler<K>) => {
    if (!listeners[event]) {
      listeners[event] = []
    }
    if (!listeners[event].includes(handler)) {
      listeners[event].push(handler)
    }
  }

  const off = <K extends Keys>(event: K, handler: Handler<K>) => {
    if (listeners[event]) {
      listeners[event] = listeners[event].filter((h) => h !== handler)
    }
  }

  function emit<K extends KeysPayloadOptional>(
    event: K,
    payload?: EventMap[K],
  ): void
  function emit<K extends KeysPayloadRequired>(
    event: K,
    payload: EventMap[K],
  ): void
  function emit<K extends Keys>(event: K, payload?: EventMap[K]): void {
    if (listeners[event]) {
      listeners[event].forEach((handler) => {
        handler(payload!)
      })
    }
  }

  const removeAllListeners = () => {
    listeners = {} as { [K in Keys]: Handler<K>[] }
  }

  return { on, off, emit, removeAllListeners }
}
