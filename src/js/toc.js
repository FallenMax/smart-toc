import { insertCSS, px, num, log, draw, throttle, scrollTo, unique, safe, highlight, translate3d, applyStyle } from './helpers/util'
import tocCSS from '../style/toc.css'
import Stream from './helpers/stream'

const relayoutStream = function(article, $resize, $isShow) {
  const readableStyle = function(article) {
    let computed = window.getComputedStyle(article)
    let fontSize = num(computed.fontSize)
    let bestWidth = Math.min(Math.max(fontSize, 12), 16) * 66
    return Object.assign(
      (num(computed.marginLeft) || num(computed.marginRight)) ? {} : {
        marginLeft: 'auto',
        marginRight: 'auto'
      },
      num(computed.maxWidth) ? {} : {
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
    let anchor = node.id || [].slice.apply(node.children)
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
    (['auto', 'scroll'].includes(window.getComputedStyle(el).overflowY) &&
      (el.clientHeight + 1 < el.scrollHeight))
  while (elem && (elem !== document.body) && !canScroll(elem)) {
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

const activeHeadingStream = function(headings, $scroll, $relayout) {
  let $headingYs = $relayout.map(() => {
    let scrollY = window.scrollY // FIXME
    return headings.map(({ node }) => [
      scrollY + node.getBoundingClientRect().top,
      scrollY + node.getBoundingClientRect().bottom
    ])
  })

  let $curIndex = Stream.combine($headingYs, $scroll, function(headingYs, [scrollX, scrollY]) {
    let i = 0
    for (let len = headingYs.length; i < len; i++) {
      if (headingYs[i][0] > scrollY + 40) {
        break
      }
    }
    return Math.max(0, i - 1)
  })

  return $curIndex.unique()
}


const createHeadingDOM = function(headings) {
  function toTree(headings) {
    let i = 0
    let len = headings.length
    let tree = []
    let stack = [tree]
    const last = arr => arr.slice(-1)[0]

    function createChild(parent, heading) {
      parent.push({
        heading: heading || null,
        children: []
      })
      return last(parent).children
    }
    while (i < len) {
      let { level } = headings[i]
      if (level === stack.length) {
        let children = createChild(last(stack), headings[i])
        stack.push(children)
        i++
      } else if (level < stack.length) {
        stack.pop()
      } else if (level > stack.length) {
        let children = createChild(last(stack))
        stack.push(children)
      }
    }
    return tree
  }

  function toDOM(tree) {
    function toUL(array) {
      let ul = document.createElement('UL')
      array.forEach(child => {
        ul.appendChild(toLI(child))
      })
      return ul
    }

    function toLI({ heading, children }) {
      let li = document.createElement('LI')
      let ul
      if (heading) {
        let a = document.createElement('A')
        a.href = '#' + heading.anchor
        a.textContent = heading.node.textContent
        li.appendChild(a)
      }
      if (children && children.length) {
        ul = toUL(children)
        li.appendChild(ul)
      }
      return li
    }
    return toUL(tree)
  }

  let tree = toTree(headings)
  let dom = toDOM(tree)
  return dom
}


const makeSticky = function(options) {
  let { ref, popper, direction, gap, topMargin, $refChange, $scroll, $offset } = options
  let $refMetric = Stream.combine($refChange,
    () => {
      let refRect = ref.getBoundingClientRect()
      return {
        top: refRect.top + window.scrollY,
        right: refRect.right + window.scrollX,
        bottom: refRect.bottom + window.scrollY,
        left: refRect.left + window.scrollX,
        width: refRect.width,
        height: refRect.height
      }
    }
  )
  let popperMetric = popper.getBoundingClientRect()
  return Stream.combine($refMetric, $scroll, $offset,
    (article, [scrollX, scrollY], [offsetX, offsetY]) => {
      let x = direction === 'right' ? article.right + gap : article.left - gap - popperMetric.width
      x = Math.min(Math.max(0, x), window.innerWidth - popperMetric.width) // restrict to visible area
      let y = Math.max(topMargin, article.top - scrollY)
      return {
        position: 'fixed',
        left: 0,
        top: 0,
        transform: translate3d(x + offsetX, y + offsetY)
      }
    }
  )
}

const scrollToHeading = function({ node, anchor }, scrollElem = document.body, shouldPushState = false) {
  scrollTo({
    targetElem: node,
    scrollElem: scrollElem,
    topMargin: 30,
    maxDuration: 300,
    callback: () => {
      // highlight(node)  // shoud we ?
      if (shouldPushState) {
        history.pushState({ 'smart-toc': true, anchor }, null, '#' + anchor)
      }
    }
  })
}

const handlePopstate = function(headings) {
  function onPopstate(e) {
    let state = e.state || {}
    if (state['smart-toc']) {
      let { node } = headings.find(heading => (heading.anchor === state.anchor))
      scrollTo({
        targetElem: node,
        topMargin: 30,
        maxDuration: 300
      })
    }
  }
  window.addEventListener('popstate', onPopstate)
}

const calcContainerLayout = function(article) {
  let rect = article.getBoundingClientRect()
  let [fromLeft, fromRight] = [
    rect.left + window.scrollX,
    document.documentElement.offsetWidth - rect.right + window.scrollX
  ]
  return {
    direction: fromLeft > (fromRight + 20) ? 'left' : 'right', // or left ?
    gap: 150, // from content div
    topMargin: 50 // from viewport top
  }
}

const Handle = function({ $userOffset }) {
  const handleUserDrag = function(handle, $userOffset) {
    $userOffset([0, 0]) // [x, y]
    let [sClientX, sClientY] = [0, 0]
    let [sOffsetX, sOffsetY] = [0, 0]
    const stop = e => {
      e.stopPropagation()
      e.preventDefault()
    }
    const onMouseMove = throttle(e => {
      stop(e)
      let [dX, dY] = [e.clientX - sClientX, e.clientY - sClientY]
      $userOffset([sOffsetX + dX, sOffsetY + dY])
    })
    handle.addEventListener('mousedown', e => {
      if (e.button === 0) {
        stop(e)
        sClientX = e.clientX
        sClientY = e.clientY
        sOffsetX = $userOffset()[0]
        sOffsetY = $userOffset()[1]
        window.addEventListener('mousemove', onMouseMove)
      }
    })
    window.addEventListener('mouseup', () => {
      window.removeEventListener('mousemove', onMouseMove)
    })
  }

  let handle = document.createElement('DIV')
  handle.textContent = 'table of content'
  handle.classList.add('handle')
  handleUserDrag(handle, $userOffset)
  return handle
}

const TOC = function({ headings, $activeHeading, onClickHeading }) {
  const updateActiveHeading = function(container, activeIndex) {
    let activeLIs = [].slice.apply(container.querySelectorAll('.active'))
    activeLIs.forEach(li => {
      li.classList.remove('active')
    })
    let anchors = [].slice.apply(container.querySelectorAll('a'))
    let elem = anchors[activeIndex]
    elem.scrollIntoViewIfNeeded()
    while (elem !== container) {
      if (elem.tagName === 'LI') {
        elem.classList.add('active')
      }
      elem = elem.parentNode
    }
  }

  let toc = createHeadingDOM(headings)

  $activeHeading.subscribe(activeIndex => {
    updateActiveHeading(toc, activeIndex)
  })

  toc.addEventListener('click', onClickHeading, true)
  return toc
}

const Container = function({
  headings,
  $activeHeading,
  $isShow,
  $userOffset,
  onClickHeading
}) {

  let container = document.createElement('DIV')
  container.id = 'smarttoc'
  container.appendChild(Handle({ $userOffset }))
  container.appendChild(TOC({ headings, $activeHeading, onClickHeading }))
  let isLengthy = headings.filter(h => (h.level <= 2)).length > 50
  if (isLengthy) {
    container.classList.add('lengthy')
  }

  $isShow.subscribe(isShow => {
    if (!isShow) {
      container.classList.add('hidden')
    } else {
      container.classList.remove('hidden')
    }
  })

  return container
}

const mount = function(parent, elem) {
  if (!parent.contains(elem)) {
    parent.appendChild(elem)
  }
}

const Extender = function({ headings, scrollable, $isShow, $relayout, $extender }) {
  // toc: extend body height so we can scroll to the last heading
  let extender = document.createElement('DIV')
  extender.id = 'smarttoc-extender'
  Stream.combine($isShow, $relayout, (isShow) => {
    setTimeout(() => { // some delay to ensure page is stable ?
      let lastHeading = headings.slice(-1)[0].node
      let lastRect = lastHeading.getBoundingClientRect()
      let extenderHeight = 0
      if (scrollable === document.body) {
        let heightBelowLastRect = document.documentElement.scrollHeight -
          (lastRect.bottom + window.scrollY) - num(extender.style.height) // in case we are there already
        extenderHeight = isShow ? Math.max(window.innerHeight - lastRect.height - heightBelowLastRect, 0) : 0
      } else {
        let scrollRect = scrollable.getBoundingClientRect()
        let heightBelowLastRect = scrollRect.top + scrollable.scrollHeight - scrollable.scrollTop // bottom of scrollable relative to viewport
          -
          lastRect.bottom - num(extender.style.height) // in case we are there already
        extenderHeight = isShow ? Math.max(scrollRect.height - lastRect.height - heightBelowLastRect, 0) : 0
      }
      $extender({
        height: extenderHeight
      })
    }, 300)
  })
  return extender
}

export default function createTOC(article, headings) {

  headings = addAnchors(headings)
  const scrollable = getScrollParent(article)

  const $isShow = Stream(true)
  const $resize = Stream.fromEvent(window, 'resize')
    .filter(() => $isShow())
    .throttle(300)
  const $scroll = scrollStream(scrollable, $isShow)
  const $relayout = relayoutStream(article, $resize, $isShow)
  const $activeHeading = activeHeadingStream(headings, $scroll, $relayout)

  const $extender = Stream()
  const extender = Extender({ headings, scrollable, $isShow, $relayout, $extender })
  scrollable.appendChild(extender)
  $extender.subscribe(style => applyStyle(extender, style))



  const onClickHeading = function(e) {
    e.preventDefault()
    e.stopPropagation()
    const anchor = e.target.getAttribute('href').substr(1)
    const { node } = headings.find(heading => (heading.anchor === anchor))
    scrollToHeading({ node, anchor }, scrollable)
  }

  const $userOffset = Stream()

  insertCSS(tocCSS, 'smarttoc__css')
  const container = Container({
    headings,
    $activeHeading,
    $isShow,
    $userOffset,
    onClickHeading
  })
  mount(document.body, container)

  // toc: position (be sticky!)
  const containerLayout = calcContainerLayout(article)
  const $containerStyle = makeSticky({
    ref: article,
    popper: container,
    direction: containerLayout.direction,
    gap: containerLayout.gap,
    topMargin: containerLayout.topMargin,
    $refChange: $relayout,
    $scroll: $scroll,
    $offset: $userOffset
  })

  $containerStyle.subscribe(style =>
    applyStyle(container, style, true)
  )



  // // toc: also respond to 'back/forward'
  // handlePopstate(headings)

  // now show what we've found
  if (article.getBoundingClientRect().top > 30) {
    scrollTo({
      targetElem: article,
      scrollElem: scrollable,
      topMargin: 30,
      maxDuration: 600
    })
  }


  return {
    isShow: () => $isShow(),
    toggle: () => $isShow(!$isShow()),
    next: () => {
      if ($isShow()) {
        let nextIdx = Math.min(headings.length - 1, $activeHeading() + 1)
        scrollToHeading(headings[nextIdx], scrollable)
      }
    },
    prev: () => {
      if ($isShow()) {
        let prevIdx = Math.max(0, $activeHeading() - 1)
        scrollToHeading(headings[prevIdx], scrollable)
      }
    },
    dispose: () => {
      console.log('dispose')
      container && container.remove()
    }
  }
}
