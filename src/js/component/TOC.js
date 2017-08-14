import { scrollTo } from '../helpers/util'

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

const TOC = function({ headings, $activeHeading, onClickHeading }) {
  const updateActiveHeading = function(container, activeIndex) {
    let activeLIs = [].slice.apply(container.querySelectorAll('.active'))
    activeLIs.forEach(li => {
      li.classList.remove('active')
    })
    let anchors = [].slice.apply(container.querySelectorAll('a'))
    let elem = anchors[activeIndex]
    const target = elem
    while (elem !== container) {
      if (elem.tagName === 'LI') {
        elem.classList.add('active')
      }
      elem = elem.parentNode
    }

    const targetRect = target.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    const outOfView =
      targetRect.top > containerRect.bottom ||
      targetRect.bottom < containerRect.top
    if (outOfView) {
      scrollTo({
        targetElem: target,
        scrollElem: container,
        maxDuration: 0,
        topMargin: container.offsetHeight / 2 - target.offsetHeight / 2
      })
    }
  }

  let toc = createHeadingDOM(headings)

  $activeHeading.subscribe(activeIndex => {
    updateActiveHeading(toc, activeIndex)
  })

  toc.addEventListener('click', onClickHeading, true)
  return toc
}

export default TOC
