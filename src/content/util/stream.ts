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

let streamId = 0
const generateStreamName = (id: number) => {
  return `s_${id}`
}

class StreamClass<T extends VV> {
  public displayName?: string
  private id!: number
  private listeners: StreamListener<T>[] = []
  private dependents: StreamDependent<T>[] = []
  private value: T | undefined = undefined
  private changed: boolean = false
  private constructor() {}

  static isStream(o: any): o is Stream {
    return o && typeof o.subscribe === 'function'
  }

  static create<T extends VV>(init?: T | undefined, name?: string): Stream<T> {
    const stream$ = function(val?: T) {
      if (arguments.length === 0) {
        return stream$.value
      } else {
        if (typeof val === 'undefined') {
          if (isDebugging) {
            debugger
          }
          throw new Error('stream() value should not be undefined')
        }
        stream$.update(val)
        stream$.flush()
      }
    } as Stream<T>
    stream$.id = streamId++
    stream$.displayName = name || generateStreamName(stream$.id)
    stream$.value = init
    stream$.changed = false
    stream$.listeners = []
    stream$.dependents = []
    Object.setPrototypeOf(stream$, StreamClass.prototype)
    return stream$
  }

  static combine<T1 extends VV>(streams: [Stream<T1>]): Stream<[T1]>
  static combine<T1 extends VV, T2 extends VV>(
    streams: [Stream<T1>, Stream<T2>],
  ): Stream<[T1, T2]>
  static combine<T1 extends VV, T2 extends VV, T3 extends VV>(
    streams: [Stream<T1>, Stream<T2>, Stream<T3>],
  ): Stream<[T1, T2, T3]>
  static combine<T1 extends VV, T2 extends VV, T3 extends VV, T4 extends VV>(
    streams: [Stream<T1>, Stream<T2>, Stream<T3>, Stream<T4>],
  ): Stream<[T1, T2, T3, T4]>
  static combine<
    T1 extends VV,
    T2 extends VV,
    T3 extends VV,
    T4 extends VV,
    T5 extends VV
  >(
    streams: [Stream<T1>, Stream<T2>, Stream<T3>, Stream<T4>, Stream<T5>],
  ): Stream<[T1, T2, T3, T4, T5]>
  static combine(streams: Stream<any>[]): Stream<any> {
    const cached = streams.map((stream$) => stream$())
    const allHasValue = () =>
      cached.every((elem) => typeof elem !== 'undefined')

    const combined$ = Stream(
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

  static merge<A extends VV>(streams: [Stream<A>]): Stream<A>
  static merge<A extends VV, B extends VV>(
    streams: [Stream<A>, Stream<B>],
  ): Stream<A | B>
  static merge<A extends VV, B extends VV, C extends VV>(
    streams: [Stream<A>, Stream<B>, Stream<C>],
  ): Stream<A | B | C>
  static merge<A extends VV, B extends VV, C extends VV, D extends VV>(
    streams: [Stream<A>, Stream<B>, Stream<C>, Stream<D>],
  ): Stream<A | B | C | D>
  static merge<
    A extends VV,
    B extends VV,
    C extends VV,
    D extends VV,
    E extends VV
  >(
    streams: [Stream<A>, Stream<B>, Stream<C>, Stream<D>, Stream<E>],
  ): Stream<A | B | C | D | E>
  static merge(streams: Stream<any>[]): Stream<any> {
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
    const start$ = Stream(value)
    return Stream.merge([start$, (this as any) as Stream<T>])
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
      timer = window.setTimeout(function() {
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
}

export type Stream<T extends VV = any> = StreamClass<T> & StreamCallable<T>

Object.getOwnPropertyNames(StreamClass)
  .filter(
    (prop) => typeof StreamClass[prop] === 'function' && prop !== 'constructor',
  )
  .forEach((name) => {
    StreamClass.create[name] = StreamClass[name]
  })

export const Stream = StreamClass.create as typeof StreamClass['create'] &
  typeof StreamClass
