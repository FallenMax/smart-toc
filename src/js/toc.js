import {
  insertCSS,
  num,
  log,
  draw,
  mount,
  scrollTo,
  unique,
  safe,
  applyStyle
} from './helpers/util'
import tocCSS from '../style/toc.css'
import Stream from './helpers/stream'
import Container from './component/Container'
import Extender from './component/Extender'

const relayoutStream = function(article, $resize, $isShow) {
  const readableStyle = function(article) {
    let computed = window.getComputedStyle(article)
    let fontSize = num(computed.fontSize)
    let bestWidth = Math.min(Math.max(fontSize, 12), 16) * 66
    if (computed['box-sizing'] === 'border-box') {
      bestWidth +=
        num(computed['padding-left']) + num(computed['padding-right'])
    }

    return Object.assign(
      num(computed.marginLeft) || num(computed.marginRight)
        ? {}
        : {
            marginLeft: 'auto',
            marginRight: 'auto'
          },
      num(computed.maxWidth)
        ? {}
        : {
            maxWidth: bestWidth
          }
    )
  }
  let oldStyle = article.style.cssText
  let newStyle = readableStyle(article)
  let $relayout = $isShow.map(isShow => {
    if (isShow) {
      applyStyle(article, newStyle)
      return article
    } else {
      applyStyle(article, oldStyle)
    }
  })
  return Stream.combine($relayout, $resize, () => null)
}

const addAnchors = function(headings) {
  const anchoredHeadings = headings.map(function({ node, level }) {
    let anchor =
      node.id ||
      [].slice
        .apply(node.children)
        .filter(elem => elem.tagName === 'A')
        .map(a => {
          let href = a.getAttribute('href') || ''
          return href.startsWith('#') ? href.substr(1) : a.id
        })
        .filter(Boolean)[0]
    if (!anchor) {
      anchor = node.id = unique(safe(node.textContent))
    } else {
      anchor = unique(anchor)
    }
    return { node, level, anchor }
  })
  return anchoredHeadings
}

const getScrollParent = function(elem) {
  const canScroll = el =>
    ['auto', 'scroll'].includes(window.getComputedStyle(el).overflowY) &&
    el.clientHeight + 1 < el.scrollHeight
  while (elem && elem !== document.body && !canScroll(elem)) {
    elem = elem.parentElement
  }
  log('scrollable', elem)
  draw(elem, 'purple')
  return elem
}

const scrollStream = function(scrollable, $isShow) {
  let $scroll = Stream([scrollable.scrollLeft, scrollable.scrollTop])
  let source = scrollable === document.body ? window : scrollable
  Stream.fromEvent(source, 'scroll')
    .filter(() => $isShow())
    .throttle()
    .subscribe(() => {
      $scroll([scrollable.scrollLeft, scrollable.scrollTop])
    })
  return $scroll
}

const activeHeadingStream = function(
  headings,
  $scroll,
  $relayout,
  $topbarHeight
) {
  let $headingYs = $relayout.map(() => {
    let scrollY = window.scrollY // FIXME
    return headings.map(({ node }) => [
      scrollY + node.getBoundingClientRect().top,
      scrollY + node.getBoundingClientRect().bottom
    ])
  })

  let $curIndex = Stream.combine($headingYs, $scroll, $topbarHeight, function(
    headingYs,
    [scrollX, scrollY],
    topbarHeight = 0
  ) {
    let i = 0
    for (let len = headingYs.length; i < len; i++) {
      if (headingYs[i][0] > scrollY + topbarHeight + 20) {
        break
      }
    }
    return Math.max(0, i - 1)
  })

  return $curIndex.unique()
}

const scrollToHeading = function(
  { node },
  scrollElem = document.body,
  onScrollEnd,
  topMargin = 0
) {
  scrollTo({
    targetElem: node,
    scrollElem: scrollElem,
    topMargin: topMargin,
    maxDuration: 300,
    callback: onScrollEnd && onScrollEnd.bind(null, node)
  })
}

const getTopBarHeight = function(topElem) {
  const findFixedParent = function(elem) {
    const isFixed = elem => {
      let { position, zIndex } = window.getComputedStyle(elem)
      return position === 'fixed' && zIndex
    }
    while (elem !== document.body && !isFixed(elem)) {
      elem = elem.parentElement
    }
    return elem === document.body ? null : elem
  }
  let { left, right, top } = topElem.getBoundingClientRect()
  let leftTopmost = document.elementFromPoint(left + 1, top + 1)
  let rightTopmost = document.elementFromPoint(right - 1, top + 1)
  if (
    leftTopmost &&
    rightTopmost &&
    leftTopmost !== topElem &&
    rightTopmost !== topElem
  ) {
    let leftFixed = findFixedParent(leftTopmost)
    let rightFixed = findFixedParent(rightTopmost)
    if (leftFixed && leftFixed === rightFixed) {
      return leftFixed.offsetHeight
    } else {
      return 0
    }
  } else {
    return 0
  }
}

const getTheme = function(article) {
  let elem = article
  try {
    const rgba = (...args) => args
    const rgb = (...args) => args
    const parseColor = str => eval(str)
    const getBgColor = elem =>
      parseColor(window.getComputedStyle(elem)['background-color'])
    const isTransparent = ([r, g, b, a]) => a === 0
    const isLight = ([r, g, b, a]) => r + g + b > 255 / 2 * 3
    while (elem && elem.parentElement) {
      const color = getBgColor(elem)
      console.log('color ', color)
      if (isTransparent(color)) {
        elem = elem.parentElement
      } else {
        return isLight(color) ? 'light' : 'dark'
      }
    }
    return 'light'
  } catch (e) {
    return 'light'
  }
}

export default function createTOC({ article, headings, userOffset = [0, 0] }) {
  headings = addAnchors(headings)
  insertCSS(tocCSS, 'smarttoc__css')

  const scrollable = getScrollParent(article)
  const theme = getTheme(article)

  const $isShow = Stream(true)
  const $topbarHeight = Stream()
  const $resize = Stream.combine(
    Stream.fromEvent(window, 'resize'),
    Stream.fromEvent(document, 'readystatechange'),
    Stream.fromEvent(document, 'load'),
    Stream.fromEvent(document, 'DOMContentLoaded'),
    () => null
  )
    .filter(() => $isShow())
    .throttle()
  const $scroll = scrollStream(scrollable, $isShow)
  const $relayout = relayoutStream(article, $resize, $isShow)
  const $activeHeading = activeHeadingStream(
    headings,
    $scroll,
    $relayout,
    $topbarHeight
  )
  const $userOffset = Stream(userOffset)

  scrollable.appendChild(Extender({ headings, scrollable, $isShow, $relayout }))

  const onScrollEnd = function(node) {
    if ($topbarHeight() == null) {
      setTimeout(() => {
        $topbarHeight(getTopBarHeight(node))
        if ($topbarHeight()) {
          scrollToHeading({ node }, scrollable, null, $topbarHeight() + 10)
        }
      }, 300)
    }
  }

  const onClickHeading = function(e) {
    e.preventDefault()
    e.stopPropagation()
    const anchor = e.target.getAttribute('href').substr(1)
    const heading = headings.find(heading => heading.anchor === anchor)
    scrollToHeading(
      heading,
      scrollable,
      onScrollEnd,
      ($topbarHeight() || 0) + 10
    )
  }

  const container = Container({
    article,
    headings,
    theme,
    $activeHeading,
    $isShow,
    $userOffset,
    $relayout,
    $scroll,
    $topbarHeight,
    onClickHeading
  })
  mount(document.body, container)

  // now show what we've found
  if (article.getBoundingClientRect().top > window.innerHeight - 50) {
    scrollToHeading(
      headings[0],
      scrollable,
      onScrollEnd,
      ($topbarHeight() || 0) + 10
    )
  }

  return {
    isValid: () =>
      document.body.contains(article) && article.contains(headings[0].node),

    isShow: () => $isShow(),

    toggle: () => $isShow(!$isShow()),

    next: () => {
      if ($isShow()) {
        let nextIdx = Math.min(headings.length - 1, $activeHeading() + 1)
        scrollToHeading(
          headings[nextIdx],
          scrollable,
          onScrollEnd,
          ($topbarHeight() || 0) + 10
        )
      }
    },

    prev: () => {
      if ($isShow()) {
        let prevIdx = Math.max(0, $activeHeading() - 1)
        scrollToHeading(
          headings[prevIdx],
          scrollable,
          onScrollEnd,
          ($topbarHeight() || 0) + 10
        )
      }
    },

    dispose: () => {
      log('dispose')
      $isShow(false)
      container && container.remove()
      return { userOffset: $userOffset() }
    }
  }
}
