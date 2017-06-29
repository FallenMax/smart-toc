import toastCSS from '../../style/toast.css'

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
      timer = setTimeout(function() {
        fn(...args)
      }, delay)
    }
  } else {
    let request
    return function rafThrottled(...args) {
      cancelAnimationFrame(request)
      request = requestAnimationFrame(function() {
        fn(...args)
      })
    }
  }
}

export const safe = str => str.replace(/\s+/g, '-')

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

export const getScroll = (elem, direction = 'top') => {
  if (elem === document.body) {
    return direction === 'top'
      ? document.documentElement.scrollTop
      : document.documentElement.scrollLeft
  } else {
    return direction === 'top' ? elem.scrollTop : elem.scrollLeft
  }
}
export const getTotalScroll = (elem, direction = 'top') => {
  return getScroll(elem, direction) + elem === document.body
    ? 0
    : direction === 'top'
      ? document.documentElement.scrollTop
      : document.documentElement.scrollLeft
}

export const setScroll = (elem, val, direction = 'top') => {
  if (elem === document.body) {
    if (direction === 'top') {
      document.documentElement.scrollTop = val
    } else {
      document.documentElement.scrollLeft = val
    }
  } else {
    if (direction === 'top') {
      elem.scrollTop = val
    } else {
      elem.scrollLeft = val
    }
  }
}

export const scrollTo = (function scrollToFactory() {
  let request
  const easeOutQuad = function(t, b, c, d) {
    t /= d
    return -c * t * (t - 2) + b
  }
  return function scrollTo({
    targetElem,
    scrollElem = document.body,
    topMargin = 0,
    maxDuration = 300,
    easeFn,
    callback
  }) {
    cancelAnimationFrame(request)
    let rect = targetElem.getBoundingClientRect()
    let endScrollTop = rect.top + getScroll(scrollElem) - topMargin
    let startScrollTop = getScroll(scrollElem)
    let distance = endScrollTop - startScrollTop
    let startTime
    let ease = easeFn || easeOutQuad
    let distanceRatio = Math.min(Math.abs(distance) / 10000, 1)
    let duration = Math.max(
      maxDuration * distanceRatio * (2 - distanceRatio),
      10
    )

    function update(timestamp) {
      if (!startTime) {
        startTime = timestamp
      }
      let progress = (timestamp - startTime) / duration
      if (progress < 1) {
        setScroll(
          scrollElem,
          ease(timestamp - startTime, startScrollTop, distance, duration)
        )
        requestAnimationFrame(update)
      } else {
        setScroll(scrollElem, endScrollTop)
        if (callback) {
          callback()
        }
      }
    }
    requestAnimationFrame(update)
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
  return `translate3d(${Math.round(x)}px, ${Math.round(y)}px, ${Math.round(
    z
  )}px)` // 0.5px => blurred text
}

function setClass(elem, names, delay) {
  if (delay === undefined) {
    elem.classList = names
  } else {
    return setTimeout(() => {
      elem.classList = names
    }, delay)
  }
}

export const toast = (function toastFactory() {
  let timers = []
  return function toast(msg) {
    let toast
    insertCSS(toastCSS, 'smarttoc-toast__css')
    if (document.getElementById('smarttoc-toast')) {
      toast = document.getElementById('smarttoc-toast')
    } else {
      toast = document.createElement('DIV')
      toast.id = 'smarttoc-toast'
      document.body.appendChild(toast)
    }
    toast.textContent = msg

    timers.forEach(clearTimeout)
    toast.classList = ''

    const set = setClass.bind(null, toast)

    toast.classList = 'enter'
    timers = [
      set('enter enter-active', 0),
      set('leave', 3000),
      set('leave leave-active', 3000),
      set('', 3000 + 200)
    ]
  }
})()

export const insertCSS = function(css, id) {
  if (!document.getElementById(id)) {
    let style = document.createElement('STYLE')
    style.type = 'text/css'
    style.id = id
    style.textContent = css
    document.head.appendChild(style)
    return
  }
}

export const mount = function(parent, elem) {
  if (!parent.contains(elem)) {
    parent.appendChild(elem)
  }
}
