import { px, num, log, throttle, scrollTo, unique, safe, toDash, translate3d, applyStyle, Stream } from './util'

const createHandle = function() {
  let handle = document.createElement('DIV')
  handle.textContent = 'table of content'
  handle.classList.add('handle')
  return handle
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

const createContainer = function() {
  let container = document.createElement('DIV')
  container.id = 'smarttoc'
  return container
}

const insertCSS = function() {
  let style = document.createElement('STYLE')
  style.type = 'text/css'
  style.id = 'smarttoc_css'
  style.textContent = __CSS_TOC__.replace(/;/g, ' !important;') // will be replaced when built
  document.head.appendChild(style)
  return
}

const addAnchors = function(headings) {
  const anchoredHeadings = headings.map(function({ node, level }, i) {
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
      unique(anchor)
    }
    // if (__DEV__) {
    //   node.textContent += '$' + i
    // }

    return { node, level, anchor }
  })
  return anchoredHeadings
}


const scrollStream = function() {
  let $scrollY = Stream([window.scrollX, window.scrollY])
  window.addEventListener('scroll', throttle(
    () => $scrollY([window.scrollX, window.scrollY])
  ))
  return $scrollY
}

const resizeStream = function() {
  let $resize = Stream(null)
  window.addEventListener('resize', throttle(
    () => $resize(null), 300
  ))
  return $resize
}

// make article slightly easier to read?
const calcArticleStyle = function(article) {
  let articleFontSize = num(window.getComputedStyle(article).fontSize)
  let bestContentWidth = Math.max(articleFontSize, 12) * 66
  return {
    marginLeft: 'auto',
    marginRight: 'auto',
    maxWidth: bestContentWidth,
    overflowX: 'visible',
    position: 'relative'
  }
}

// where should us put our shiny toc
const calcContainerLayout = function(article) {
  let rect = article.getBoundingClientRect()
  let [fromLeft, fromRight] = [
    rect.left + window.scrollX,
    document.documentElement.offsetWidth - rect.right + window.scrollX
  ]
  return {
    direction: fromLeft > (fromRight + 20) ? 'left' : 'right', // or left ?
    gap: 50, // from content div
    topMargin: 50 // from viewport top
  }
}

const makeSticky = function(options) {
  let { ref, popper, direction, gap, topMargin, $refChange, $scroll, $offset } = options
  let anyParentHasTransform = (function(elem) { // any "transform: *"  will break our 'position: fixed"
    while (elem) {
      let style = window.getComputedStyle(elem)
      for (let prop in style) {
        if (style.hasOwnProperty(prop)) {
          if (/(t|T)ransform/.test(prop) && /matrix/.test(style[prop])) {
            return true
          }
        }
      }
      elem = elem.parentElement
    }
    return false
  })(popper)
  let $refMetric = Stream.combine([$refChange],
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
    },
    'refMetric'
  )
  let popperMetric = popper.getBoundingClientRect()
  return Stream.combine([$refMetric, $scroll, $offset],
    ({ top, right, bottom, left }, [scrollX, scrollY], [offsetX, offsetY]) => {
      if (top < scrollY + topMargin) { // stick at viewport top
        if (!anyParentHasTransform) {
          let style = {
            position: 'fixed',
            top: topMargin,
            left: direction === 'left' ? left - gap - popperMetric.width - scrollX : right + gap - scrollX
          }
          if (offsetX || offsetY) {
            style.transform = translate3d(offsetX, offsetY)
          }
          return style
        } else {
          return {
            position: 'absolute',
            top: 0,
            [direction]: -gap - popperMetric.width,
            transform: translate3d(offsetX, scrollY + topMargin - top + offsetY)
          }
        }
      } else { // follow ref
        let style = {
          position: 'absolute',
          top: 0,
          [direction]: -gap - popperMetric.width
        }
        if (offsetX || offsetY) {
          style.transform = translate3d(offsetX, offsetY)
        }
        return style
      }
    },
    'sticky'
  )
}

const activeHeadingStream = function($scroll, $articleUpdate, headings) {
  let $headingYs = Stream.combine([$articleUpdate], function() {
    let scrollY = window.scrollY
    return headings.map(({ node }) => [
      scrollY + node.getBoundingClientRect().top,
      scrollY + node.getBoundingClientRect().bottom
    ])
  })

  let $curIndex = Stream.combine([$headingYs, $scroll], function(headingYs, [scrollX, scrollY]) {
    let i = 0
    for (let len = headingYs.length; i < len; i++) {
      if (headingYs[i][0] > scrollY + 40) {
        break
      }
    }
    return Math.max(0, i - 1)
  })

  return Stream.unique($curIndex, 'curIndex')
}

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

const handleClickHeading = function(container, headings) {
  function onClick(e) {
    e.preventDefault()
    e.stopPropagation()
    let anchor = e.target.getAttribute('href').substr(1)
    let { node } = headings.find(heading => (heading.anchor === anchor))
    scrollTo({
      targetElem: node,
      topMargin: 30,
      maxDuration: 300,
      callback: () => {
        history.pushState({ 'smart-toc': true, anchor }, null, '#' + anchor)
      }
    })
  }
  container.addEventListener('click', onClick, true)
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


const handleUserDrag = function(handle) {
  let $userOffset = Stream([0, 0]) // [x, y]
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
  return $userOffset
}

export default function createTOC(article, _headings) {
  // set up basic events
  const $isShow = Stream(true, 'isShow')

  const $scroll = Stream.combine([$isShow, scrollStream()],
    (isShow, scroll) => (isShow ? scroll : undefined)
  )
  const $resize = Stream.combine([$isShow, resizeStream()],
    (isShow, resize) => (isShow ? resize : undefined)
  )

  // headings: they might need some <a>nchors
  const headings = addAnchors(_headings)

  // article: apply some style
  const oldArticleStyle = article.style.cssText
  const newArticleStyle = calcArticleStyle(article)
  const $articleUpdate = Stream.combine([$isShow, $resize],
    (isShow) => {
      applyStyle(article, isShow ? newArticleStyle : oldArticleStyle)
      return isShow ? null : undefined // do not trigger further updates if not shown
    }
  )

  // toc: generate one!
  insertCSS()
  const container = createContainer()
  const handle = createHandle()
  const toc = createHeadingDOM(headings)
  container.appendChild(handle)
  container.appendChild(toc)
  article.appendChild(container)

  // toc: allow user drag around
  const $userOffset = handleUserDrag(handle)

  // toc: position (be sticky!)
  const containerLayout = calcContainerLayout(article)
  const $containerStyle = makeSticky({
    ref: article,
    popper: container,
    direction: containerLayout.direction,
    gap: containerLayout.gap,
    topMargin: containerLayout.topMargin,
    $refChange: $articleUpdate,
    $scroll: $scroll,
    $offset: $userOffset
  })
  $containerStyle.subscribe(style => applyStyle(container, style, true))

  // toc: highlight current heading
  const $activeHeading = activeHeadingStream($scroll, $articleUpdate, headings)
  $activeHeading.subscribe(activeIndex => {
    updateActiveHeading(container, activeIndex)
  })

  // toc: extend body height so we can scroll to the last heading
  let extender = document.createElement('DIV')
  extender.id = 'smarttoc-extender'
  document.body.appendChild(extender)
  Stream.combine([$isShow, $articleUpdate],
    (isShow) => {
      let lastHeading = headings.slice(-1)[0].node
      let lastRect = lastHeading.getBoundingClientRect()
      let heightBelowLastRect = document.documentElement.scrollHeight - (lastRect.bottom + window.scrollY) - num(extender.style.height) // in case we are there already
      let extenderHeight = isShow ? Math.max(window.innerHeight - lastRect.height - heightBelowLastRect, 0) : 0
      applyStyle(extender, {
        height: extenderHeight
      })
    }
  )

  // toc: when anchor clicked, scroll (smoothly) to heading
  handleClickHeading(toc, headings)

  // toc: also respond to 'back/forward'
  handlePopstate(headings)

  // toc: allow user to toggle on/off
  $isShow.subscribe(isShow => {
    if (!isShow) {
      container.classList.add('hidden')
    } else {
      container.classList.remove('hidden')
    }
  })

  return {
    toggle: () => $isShow(!$isShow())
  }
}
