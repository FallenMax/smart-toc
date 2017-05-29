import { throttle } from './util'

const proto = {
  subscribe(cb, emitOnSubscribe = true) {
    if (emitOnSubscribe && this.value !== undefined) {
      cb(this.value)
    }
    this.listeners.push(cb)
  },
  addDependent(dependent) {
    this.dependents.push(dependent)
  },
  update(val) {
    this.value = val
    this.changed = true
    this.dependents.forEach(dep => dep.update(val))
  },
  flush() {
    if (this.changed) {
      this.changed = false
      this.listeners.forEach(l => l(this.value))
      this.dependents.forEach(dep => dep.flush())
    }
  },
  unique() {
    let lastValue = this.value
    let $unique = Stream(lastValue)
    this.subscribe(val => {
      if (val !== lastValue) {
        $unique(val)
        lastValue = val
      }
    })
    return $unique
  },
  map(f) {
    return Stream.combine(this, f)
  },
  filter(f) {
    return this.map(output => (f(output) ? output : undefined))
  },
  throttle(delay) {
    let $throttled = Stream(this.value)
    const emit = throttle($throttled, delay)
    this.subscribe(emit)
    return $throttled
  }
}

function Stream(init) {
  let s = function(val) {
    if (val === undefined) return s.value
    s.update(val)
    s.flush(val)
  }

  s.value = init
  s.changed = false
  s.listeners = []
  s.dependents = []

  return Object.assign(s, proto)
}

Stream.combine = function(...streams) {
  const combiner = streams.pop()
  let cached = streams.map(s => s())
  const combined = Stream(combiner(...cached))

  streams.forEach((s, i) => {
    const dependent = {
      update(val) {
        cached[i] = val
        combined.update(combiner(...cached))
      },
      flush() {
        combined.flush()
      }
    }
    s.addDependent(dependent)
  })

  return combined
}

Stream.interval = function(int) {
  let $interval = Stream()
  setInterval(() => $interval(null), int)
  return $interval
}

Stream.fromEvent = function(elem, type) {
  let $event = Stream()
  elem.addEventListener(type, $event)
  return $event
}

export default Stream
