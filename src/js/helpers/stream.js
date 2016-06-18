import { throttle } from './util'

// a stupid implementation of stream

const proto = {
  subscribe: function(cb, emitOnSubscribe = true) {
    if (emitOnSubscribe && this.value !== undefined) {
      cb(this.value)
    }
    this.listeners.push(cb)
    return this
  },
  unique: function() {
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
  map: function(f) {
    return Stream.combine(this, f)
  },
  filter: function(f) {
    return this.map(output => (f(output) ? output : undefined))
  },
  throttle: function(delay) {
    let $throttled = Stream(this.value)
    const emit = throttle(value => $throttled(value), delay)
    return this.subscribe(emit)
  }
}

const Stream = function Stream(initial) {
  let s = function(val) {
    if (val !== undefined) {
      s.value = val
      s.listeners.forEach(l => l(s.value))
    }
    return s.value
  }

  s.value = initial
  s.listeners = []

  Object.assign(s, proto)

  return s
}

Stream.combine = function(...streams) {
  let reducer = streams.pop()
  let cached = streams.map(s => s())
  let $combined = Stream(reducer(...cached))
  streams.forEach((stream, i) => {
    stream.subscribe(val => {
      cached[i] = val
      $combined(reducer(...cached))
    }, false)
  })
  return $combined
}

Stream.interval = function(int) {
  let $interval = Stream()
  setInterval(() => $interval(null), int)
  return $interval
}

Stream.fromEvent = function(elem, type) {
  let $event = Stream()
  elem.addEventListener(type, e => $event(e))
  return $event
}

export default Stream
