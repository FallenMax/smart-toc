import TOC from './TOC'
import Handle from './Handle'
import Stream from '../helpers/stream'
import { translate3d, applyStyle, num, getScroll } from '../helpers/util'

const ARTICLE_TOC_GAP = 150

const makeSticky = function(options) {
  let {
    ref,
    scrollable,
    popper,
    direction,
    gap,
    $refChange,
    $scroll,
    $offset,
    $topMargin
  } = options
  let $refRect = Stream.combine($refChange, () => {
    let refRect = ref.getBoundingClientRect()
    let refStyle = window.getComputedStyle(ref)
    let scrollTop = getScroll(scrollable, 'top')
    let scrollLeft = getScroll(scrollable, 'left')
    let refFullRect = {
      top: refRect.top - scrollTop,
      right: refRect.right - scrollLeft,
      bottom: refRect.bottom - scrollTop,
      left: refRect.left - scrollLeft,
      width: refRect.width,
      height: refRect.height
    }
    if (refStyle['box-sizing'] === 'border-box') {
      refFullRect.left += num(refStyle['padding-left'])
      refFullRect.right -= num(refStyle['padding-right'])
      refFullRect.width -=
        num(refStyle['padding-left']) + num(refStyle['padding-right'])
    }
    return refFullRect
  })
  let popperMetric = popper.getBoundingClientRect()
  const scrollableTop =
    scrollable === document.body ? 0 : scrollable.getBoundingClientRect().top
  return Stream.combine(
    $refRect,
    $scroll,
    $offset,
    $topMargin,
    (ref, [scrollX, scrollY], [offsetX, offsetY], topMargin) => {
      let x =
        direction === 'right'
          ? ref.right + gap
          : ref.left - gap - popperMetric.width
      x = Math.min(Math.max(0, x), window.innerWidth - popperMetric.width) // restrict to visible area
      let y = Math.max(scrollableTop + topMargin, ref.top - scrollY)
      return {
        position: 'fixed',
        left: 0,
        top: 0,
        transform: translate3d(x + offsetX, y + offsetY)
      }
    }
  )
}

const getOptimalContainerPos = function(article) {
  const {
    top,
    left,
    right,
    bottom,
    height,
    width
  } = article.getBoundingClientRect()

  const depthOf = function(elem) {
    let depth = 0
    while (elem) {
      elem = elem.parentElement
      depth++
    }
    return depth
  }
  const depthOfPoint = function([x, y]) {
    const elem = document.elementFromPoint(x, y)
    return elem && depthOf(elem)
  }
  const gap = ARTICLE_TOC_GAP
  const testWidth = 200
  const testHeight = 400
  const leftSlotTestPoints = [
    left - gap - testWidth,
    left - gap - testWidth / 2,
    left - gap
  ]
    .map(x => [top, top + testHeight / 2, top + testHeight].map(y => [x, y]))
    .reduce((prev, cur) => prev.concat(cur), [])
  const rightSlotTestPoints = [
    right + gap,
    right + gap + testWidth / 2,
    right + gap + testWidth
  ]
    .map(x => [top, top + testHeight / 2, top + testHeight].map(y => [x, y]))
    .reduce((prev, cur) => prev.concat(cur), [])
  const leftDepths = leftSlotTestPoints.map(depthOfPoint).filter(Boolean)
  const rightDepths = rightSlotTestPoints.map(depthOfPoint).filter(Boolean)
  const leftAvgDepth = leftDepths.length
    ? leftDepths.reduce((a, b) => a + b, 0) / leftDepths.length
    : null
  const rightAvgDepth = rightDepths.length
    ? rightDepths.reduce((a, b) => a + b, 0) / rightDepths.length
    : null

  if (!leftAvgDepth) return { direction: 'right' }
  if (!rightAvgDepth) return { direction: 'left' }
  const spaceDiff = document.documentElement.offsetWidth - right - left
  const scoreDiff =
    spaceDiff * 1 + (rightAvgDepth - leftAvgDepth) * 9 * -10 + 20 // I do like right better
  return scoreDiff > 0 ? { direction: 'right' } : { direction: 'left' }
}

const Container = function({
  article,
  scrollable,
  $headings,
  theme,
  $activeHeading,
  $isShow,
  $userOffset,
  $relayout,
  $scroll,
  $topbarHeight,
  onClickHeading
}) {
  let container = document.createElement('DIV')
  container.id = 'smarttoc'
  container.appendChild(Handle({ $userOffset }))
  container.appendChild(TOC({ $headings, $activeHeading, onClickHeading }))

  const $isLengthy = $headings.map(
    headings => headings.filter(h => h.level <= 2).length > 50
  )
  $isLengthy.subscribe(
    isLengthy =>
      isLengthy
        ? container.classList.add('lengthy')
        : container.classList.remove('lengthy')
  )

  container.classList.add(theme || 'light')

  $isShow.subscribe(isShow => {
    if (!isShow) {
      container.classList.add('hidden')
    } else {
      container.classList.remove('hidden')
    }
  })

  setTimeout(() => {
    // wait until node is mounted
    // you can addEventListener() BEFORE adding to DOM
    // but elem.getBoundingRect() will return all zeros

    const { direction } = getOptimalContainerPos(article)

    const $containerStyle = makeSticky({
      ref: article,
      scrollable: scrollable,
      popper: container,
      direction: direction,
      gap: ARTICLE_TOC_GAP,
      $topMargin: $topbarHeight.map(h => (h || 0) + 50),
      $refChange: $relayout,
      $scroll: $scroll,
      $offset: $userOffset
    })

    $containerStyle.subscribe(style => applyStyle(container, style, true))
  }, 0)

  return container
}

export default Container
