import { scrollTo } from '../helpers/util'
import m from 'mithril'
import Stream from '../helpers/stream'

const restrictScroll = function(e) {
  const toc = e.currentTarget
  const maxScroll = toc.scrollHeight - toc.offsetHeight
  if (toc.scrollTop + e.deltaY < 0) {
    toc.scrollTop = 0
    e.preventDefault()
  } else if (toc.scrollTop + e.deltaY > maxScroll) {
    toc.scrollTop = maxScroll
    e.preventDefault()
  }
  e.redraw = false
}

const TOC = function({ $headings, $activeHeading, onClickHeading }) {
  // $activeHeading.subscribe(activeIndex => {})
  const toTree = function(headings) {
    let i = 0
    let tree = { level: 0, children: [] }
    let stack = [tree]
    const top = arr => arr.slice(-1)[0]

    while (i < headings.length) {
      let { level, isActive } = headings[i]
      if (level === stack.length) {
        const node = {
          heading: headings[i],
          children: []
        }
        top(stack).children.push(node)
        stack.push(node)
        if (isActive) {
          stack.forEach(node => {
            if (node.heading) {
              node.heading.isActive = true
            }
          })
        }
        i++
      } else if (level < stack.length) {
        stack.pop()
      } else if (level > stack.length) {
        const node = {
          heading: null,
          children: []
        }
        top(stack).children.push(node)
        stack.push(node)
      }
    }
    return tree
  }

  const UL = (children, { isRoot = false } = {}) =>
    m(
      'ul',
      { onwheel: isRoot && restrictScroll, onclick: isRoot && onClickHeading },
      children.map(LI)
    )

  const LI = ({ heading, children }, index) =>
    m(
      'li',
      { class: heading && heading.isActive ? 'active' : '', key: index },
      [
        heading &&
          m('a', { href: `#${heading.anchor}` }, heading.node.textContent),
        children && children.length && UL(children)
      ].filter(Boolean)
    )

  return {
    oncreate({ dom }) {
      // scroll to heading if out of view
      $activeHeading.subscribe(index => {
        const target = [].slice.apply(dom.querySelectorAll('.active')).pop()
        const targetRect = target.getBoundingClientRect()
        const containerRect = dom.getBoundingClientRect()
        const outOfView =
          targetRect.top > containerRect.bottom ||
          targetRect.bottom < containerRect.top
        if (outOfView) {
          scrollTo({
            targetElem: target,
            scrollElem: dom,
            maxDuration: 0,
            topMargin: dom.offsetHeight / 2 - target.offsetHeight / 2
          })
        }
      })
      Stream.combine($headings, $activeHeading, () => null).subscribe(_ =>
        m.redraw()
      )
    },
    view() {
      $headings().forEach((h, i) => (h.isActive = i === $activeHeading()))
      const tree = toTree($headings())
      return UL(tree.children, { isRoot: true })
    }
  }
}

export default TOC
