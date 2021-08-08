import { assert } from './assert'
import { isDebugging } from './env'
import { createLogger } from './logger'

/** valid values */
type VV = number | boolean | string | null | object

interface StreamListener<T extends VV> {
  (value: T): void
}

interface StreamDependent<T extends VV> {
  updateDependent(val: T): void
  flushDependent(): void
}

// dirty workaround as typescript does not support callable class for now
interface StreamCallable<T extends VV> {
  (val: T | undefined): void
  (): T
}

type StreamTuple<T extends VV[]> = {
  // here tsc complains T[K] does not extends VV, but we know it should
  // - changing to `T[K] extends VV ?  Stream<T[K]> : never` fixes this error, but introduces further problems
  // @ts-ignore
  [K in keyof T]: Stream<T[K]>
}

let nextId = 0

class StreamClass<T extends VV> {
  public displayName?: string
  private listeners: StreamListener<T>[] = []
  private dependents: StreamDependent<T>[] = []
  private value: T | undefined = undefined
  private changed: boolean = false
  private constructor(value: T | undefined, name?: string) {
    this.displayName = name || `s_${nextId++}`
    this.value = value
  }

  static isStream(o: any): o is Stream {
    return o && typeof o.subscribe === 'function'
  }

  static create<T extends VV>(init?: T | undefined, name?: string): Stream<T> {
    const instance = new StreamClass<T>(init, name)

    const callable = function (val) {
      if (arguments.length === 0) {
        return stream$.value
      } else {
        assert(
          typeof val !== 'undefined',
          'sending `undefined` to a stream is not allowed',
        )
        stream$.update(val)
        stream$.flush()
      }
    } as StreamCallable<T>

    const stream$ = Object.assign(callable, instance)

    Object.setPrototypeOf(stream$, StreamClass.prototype)

    return stream$
  }

  static combine<T extends VV[]>(...streams: [...StreamTuple<T>]): Stream<T> {
    const cached = streams.map((stream$) => stream$()) as T // could be undefined thought
    const allHasValue = () =>
      cached.every((elem) => typeof elem !== 'undefined')

    const combined$ = Stream<T>(
      allHasValue() ? cached : undefined,
      `combine(${streams.map((s) => s.displayName).join(',')})`,
    )

    streams.forEach((stream, i) => {
      stream.dependents.push({
        updateDependent(val: any) {
          cached[i] = val
          if (allHasValue()) {
            combined$.update(cached)
          }
        },
        flushDependent() {
          combined$.flush()
        },
      })
    })
    return combined$
  }

  static merge<T extends VV[]>(
    ...streams: [...StreamTuple<T>]
  ): Stream<T[number]> {
    const merged$ = Stream(
      undefined,
      `merge(${streams.map((s) => s.displayName).join(',')})`,
    )
    streams.forEach((stream$) => {
      stream$.subscribe((val) => merged$(val))
    })
    return merged$
  }

  static flatten<T extends VV = VV>(
    highOrderStream: Stream<Stream<T>>,
  ): Stream<T> {
    const $flattened = Stream<T>(
      undefined,
      `flatten(${highOrderStream.displayName})`,
    )

    highOrderStream.unique().subscribe((stream) => {
      stream.subscribe((value) => {
        $flattened(value)
      })
    })

    return $flattened
  }

  static fromInterval(
    interval: number,
    callback?: (unsubscribe: () => void) => void,
  ) {
    const interval$ = Stream<null>(undefined, `interval(${interval})`)
    const timer = setInterval(() => interval$(null), interval)
    if (callback) {
      callback(() => clearInterval(timer))
    }
    return interval$
  }

  static fromEvent<T extends VV>(
    elem: {
      addEventListener(
        type: string,
        listener: (payload: T | undefined) => void,
      ): void
      removeEventListener(
        type: string,
        listener: (payload: T | undefined) => void,
      ): void
    },
    type: string,
    callback?: (unsubscribe: () => void) => void,
  ): Stream<T> {
    const event$ = Stream<T>(undefined, `event(${type})`)

    const listener = (payload: T | undefined) => {
      event$(payload == null ? (null as T) : payload)
    }
    elem.addEventListener(type, listener)

    if (callback) {
      callback(() => elem.removeEventListener(type, listener))
    }

    return event$
  }

  startsWith<S extends VV>(value: S): Stream<S | T> {
    const start$ = Stream<S>(value)
    return Stream.merge(start$, this.asStream())
  }

  subscribe(listener: StreamListener<T>, emitCurrent = true): () => void {
    if (emitCurrent && this.value !== undefined) {
      listener(this.value as T)
    }
    this.listeners.push(listener)

    return () => {
      this.unsubscribe(listener)
    }
  }

  unsubscribe(listener: StreamListener<T>): void {
    this.listeners = this.listeners.filter((l) => l !== listener)
  }

  map<V extends VV>(mapper: (val: T) => V): Stream<V> {
    const $mapped = Stream(
      typeof this.value === 'undefined' ? undefined : mapper(this.value),
      `map(${this.displayName})`,
    )
    this.subscribe((val) => {
      $mapped(mapper(val))
    })
    return $mapped
  }

  unique(): Stream<T> {
    const unique$ = Stream(this.value, `unique(${this.displayName})`)
    this.subscribe((val) => {
      if (val !== unique$()) {
        unique$(val)
      }
    })
    return unique$
  }

  flatten<V extends VV>(this: Stream<Stream<V>>): Stream<V> {
    const flattened$ = Stream<V>()
    this.subscribe((childStream) => {
      childStream.subscribe((innerValue) => {
        flattened$(innerValue)
      })
    })

    return flattened$
  }

  scan<V extends VV>(
    this: Stream<T>,
    reducer: (last: V, current: T) => V,
    initValue: V,
  ): Stream<V> {
    const scanned$ = Stream<V>(initValue)
    this.subscribe((current) => {
      scanned$(reducer(scanned$(), current))
    })
    return scanned$
  }

  switchLatest<V extends VV>(this: Stream<Stream<V>>): Stream<V> {
    const latest$ = Stream<V>()
    let unsubscribeLast = () => {}

    this.subscribe((childStream) => {
      unsubscribeLast()
      unsubscribeLast = childStream.subscribe((innerValue) => {
        latest$(innerValue)
      })
    })
    return latest$
  }

  filter<V extends T = T>(predict: (val: T) => boolean): Stream<V> {
    const filtered$ = Stream<V>(undefined, `filter(${this.displayName})`)
    this.subscribe((val) => {
      if (predict(val)) {
        filtered$(val as V)
      }
    })
    return filtered$
  }

  delay(delayInMs: number): Stream<T> {
    const delayed$ = Stream<T>(undefined, `delay(${this.displayName})`)
    this.subscribe((value) => {
      setTimeout(() => {
        delayed$(value)
      }, delayInMs)
    })
    return delayed$
  }

  debounce(delay: number): Stream<T> {
    const debounced$ = Stream<T>(undefined, `debounce(${this.displayName})`)

    let timer: number
    this.subscribe((val) => {
      clearTimeout(timer)
      timer = window.setTimeout(function () {
        debounced$(val)
      }, delay)
    })

    return debounced$
  }

  throttle(delay: number): Stream<T> {
    const throttled$ = Stream<T>(undefined, `throttle(${this.displayName})`)

    let lastEmit: number = -Infinity
    let timer: number
    const emit = (val: T) => {
      throttled$(val)
      lastEmit = performance.now()
    }

    this.subscribe((val) => {
      window.clearTimeout(timer)
      const timePassed = performance.now() - lastEmit
      if (timePassed < delay) {
        timer = window.setTimeout(() => {
          emit(val)
        }, delay - timePassed)
      } else {
        emit(val)
      }
    })

    return throttled$
  }

  log(name: string): this {
    this.displayName = name
    if (isDebugging) {
      const logger = createLogger('$' + name)
      this.subscribe(logger)
    }
    return this
  }

  setName(name: string): this {
    this.displayName = name
    return this
  }

  private update(val: T) {
    if (val === undefined) {
      if (isDebugging) {
        debugger
      }
      throw new TypeError(`update() received undefined`)
    }
    this.value = val
    this.changed = true
    this.dependents.forEach((dep) => dep.updateDependent(val))
  }

  private flush() {
    if (this.changed) {
      this.changed = false
      this.listeners.forEach((l) => l(this.value!))
      this.dependents.forEach((dep) => dep.flushDependent())
    }
  }

  private asStream(): Stream<T> {
    assert(typeof this === 'function', 'not callable Stream')
    return this as unknown as Stream<T>
  }
}

export type Stream<T extends VV = VV> = StreamClass<T> & StreamCallable<T>

export const Stream = Object.assign(
  StreamClass.create,

  // provides type
  StreamClass,

  // actually provides static methods
  Object.fromEntries(
    Object.getOwnPropertyNames(StreamClass)
      .map((key) => [key, StreamClass[key]])
      .filter((t) => typeof t[1] === 'function'),
  ) as {},
)
