import { throttle } from './util'

// a stupid implementation of stream
const easeOutQuad = function(t, b, c, d) {
  t /= d
  return -c * t * (t - 2) + b
}


const proto = {
  subscribe(cb, emitOnSubscribe = true) {
    if (emitOnSubscribe && this.value !== undefined) {
      cb(this.value)
    }
    this.listeners.push(cb)
    return this
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
    const emit = throttle(value => $throttled(value), delay)
    this.subscribe(emit)
    return $throttled
  },
  tween(easeFn = easeOutQuad, duration = 300, cb) {
    let $tweened = Stream(this.value)
    let current, target, request, startTime

    function update(timestamp) {
      if (!startTime) {
        startTime = timestamp
      }
      let progress = (timestamp - startTime) / duration
      if (progress < 1) {
        let now = easeFn(timestamp - startTime, current, target-current, duration)
        $tweened(now)
        requestAnimationFrame(update)
      } else {
        $tweened(target)
        if (cb) {
          cb(target)
        }
      }
    }

    function tweenTo(value) {
      cancelAnimationFrame(request)
      current = $tweened()
      target = value
      startTime = null
      request = requestAnimationFrame(update)
    }

    this.unique().subscribe(tweenTo)
    return $tweened
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
  elem.addEventListener(type, $event)
  return $event
}

export default Stream
