export function log() {
  if (__DEV__) {
    console.log.apply(console, arguments)
  }
}

export function draw(elem, color = 'red') {
  if (__DEV__ && elem) {
    if (Array.isArray(elem)) {
      elem.forEach(el => {
        el.style.outline = '2px solid ' + color
      })
    } else {
      elem.style.outline = '2px solid ' + color
    }
  }
}

export function assert(condition, error) {
  if (!condition) {
    throw new Error(error)
  }
}

// '12px' => 12
export const num = (size = '0') =>
  typeof size === 'number' ? size : +size.replace(/px/, '')

// '12px' <= 12
export const px = (size = 0) => num(size) + 'px'

export function throttle(fn, delay) {
  if (delay) {
    let timer
    return function timerThrottled(...args) {
      clearTimeout(timer)
      timer = window.setTimeout(function() {
        fn(...args)
      }, delay)
    }
  } else {
    let request
    return function rafThrottled(...args) {
      cancelAnimationFrame(request)
      request = window.requestAnimationFrame(function() {
        fn(...args)
      })
    }
  }
}

export const safe = str =>
  str.replace(/\s+/g, '-')

export const unique = (function uniqueGenerator() {
  let set = new Set()
  return function unique(str) {
    let id = 1
    while (set.has(str)) {
      str = str.replace(/(\$\d+)?$/, '') + '$' + id
      id++
    }
    set.add(str)
    return str
  }
})()

// a stupid implementation of observable
export function Stream(initial, id = '') {
  let value = initial
  const listeners = []

  function stream(val) {
    if (val !== undefined) {
      value = val
      listeners.forEach(l => l(value))
    }
    return value
  }
  stream.subscribe = function(cb) {
    cb(value)
    listeners.push(cb)
    return stream
  }
  stream.id = id
  return stream
}

Stream.combine = function(streams, reducer = (...values) => [...values], id) {
  let cached = streams.map(s => s())
  let $combined = Stream(reducer(...cached), id)
  $combined.id
  streams.forEach((stream, i) => {
    stream.subscribe(val => {
      cached[i] = val
      $combined(reducer(...cached))
    })
  })
  return $combined
}

Stream.unique = function($stream, id) {
  let lastValue = $stream()
  let $unique = Stream(lastValue, id)
  $stream.subscribe(val => {
    if (val !== lastValue) {
      $unique(val)
      lastValue = val
    }
  })
  return $unique
}


export const scrollTo = (function scrollToFactory() {
  let request
  const easeOutQuad = function(t, b, c, d) {
    t /= d
    return -c * t * (t - 2) + b
  }
  return function scrollTo({ targetElem, topMargin = 0, maxDuration = 300, easeFn, callback }) {
    window.cancelAnimationFrame(request)
    let rect = targetElem.getBoundingClientRect()
    let endScrollTop = rect.top + window.scrollY - topMargin
    let startScrollTop = window.scrollY
    let distance = endScrollTop - startScrollTop
    let startTime
    let ease = easeFn || easeOutQuad
    let distanceRatio = Math.min(Math.abs(distance) / 10000, 1)
    let duration = Math.max(maxDuration * distanceRatio * (2 - distanceRatio), 10)

    function update(timestamp) {
      if (!startTime) {
        startTime = timestamp
      }
      let progress = (timestamp - startTime) / duration
      if (progress < 1) {
        document.body.scrollTop = ease(timestamp - startTime, startScrollTop, distance, duration)
        window.requestAnimationFrame(update)
      } else {
        document.body.scrollTop = endScrollTop
        if (callback) {
          callback()
        }
      }
    }
    window.requestAnimationFrame(update)
  }
})()

export function toDash(str) {
  return str.replace(/([A-Z])/g, (match, p1) => '-' + p1.toLowerCase())
}

export function applyStyle(elem, style = {}, reset = false) {
  if (reset) {
    elem.style = ''
  }
  if (typeof style === 'string') {
    elem.style = style
  } else {
    for (let prop in style) {
      if (typeof style[prop] === 'number') {
        elem.style.setProperty(toDash(prop), px(style[prop]), 'important')
      } else {
        elem.style.setProperty(toDash(prop), style[prop], 'important')
      }
    }
  }
}

export function translate3d(x = 0, y = 0, z = 0) {
  return `translate3d(${x}px, ${y}px, ${z}px)`
}
