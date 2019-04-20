import { isDebugging } from '../util/env'
import { draw } from '../util/debug'

export const getScrollTop = (elem: HTMLElement): number => {
  if (elem === document.body) {
    return document.documentElement.scrollTop || document.body.scrollTop
  } else {
    return elem.scrollTop
  }
}

export const setScrollTop = (elem: HTMLElement, val: number): void => {
  if (elem === document.body) {
    document.documentElement.scrollTop = val
    window.scrollTo(window.scrollX, val)
  } else {
    elem.scrollTop = val
  }
}

export const canScroll = (el: HTMLElement) => {
  return (
    ['auto', 'scroll'].includes(window.getComputedStyle(el)!.overflowY!) &&
    el.clientHeight + 1 < el.scrollHeight
  )
}

export const getScrollElement = (elem: HTMLElement): HTMLElement => {
  while (elem && elem !== document.body && !canScroll(elem)) {
    elem = elem.parentElement!
  }
  if (isDebugging) {
    draw(elem, 'purple')
  }
  return elem
}

const easeOutQuad = (
  progress: number,
  start: number,
  distance: number,
): number => {
  return distance * progress * (2 - progress) + start
}

export const smoothScroll = ({
  target,
  scroller,
  topMargin = 0,
  maxDuration = 300,
  callback,
}: {
  target: HTMLElement
  scroller: HTMLElement
  maxDuration?: number
  topMargin?: number
  callback?(): void
}) => {
  const ease = easeOutQuad
  const targetTop = target.getBoundingClientRect().top
  const containerTop =
    scroller === document.body ? 0 : scroller.getBoundingClientRect().top

  const scrollStart = getScrollTop(scroller)
  const scrollEnd = targetTop - (containerTop - scrollStart) - topMargin

  const distance = scrollEnd - scrollStart
  const distanceRatio = Math.min(1, Math.abs(distance) / 10000)
  const duration = Math.max(
    10,
    maxDuration * distanceRatio * (2 - distanceRatio),
  )

  if (maxDuration === 0) {
    setScrollTop(scroller, scrollEnd)
    if (callback) {
      callback()
    }
    return
  }

  let startTime: number
  function update(timestamp: number) {
    if (!startTime) {
      startTime = timestamp
    }
    const progress = (timestamp - startTime) / duration
    if (progress < 1) {
      const scrollPos = ease(progress, scrollStart, distance)
      setScrollTop(scroller, scrollPos)
      window.requestAnimationFrame(update)
    } else {
      setScrollTop(scroller, scrollEnd)
      if (callback) {
        callback()
      }
    }
  }
  window.requestAnimationFrame(update)
}
