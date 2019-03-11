import m from 'mithril'
import { Heading, Article } from '../types'
import { smoothScroll } from '../lib/scroll'
import { toArray } from '../util/dom/to_array'

type MithrilEvent = {
  redraw: boolean
}

type HeadingNode = {
  level?: number
  heading?: Heading | undefined
  isActive?: boolean
  children: HeadingNode[]
}

const toTree = (headings: Heading[], activeHeading: number): HeadingNode => {
  const tree: HeadingNode = { level: 0, children: [] }
  const stack = [tree]
  const stackTop = () => stack.slice(-1)[0]

  let i = 0
  while (i < headings.length) {
    const { level } = headings[i]
    if (level === stack.length) {
      // is direct children
      const node: HeadingNode = {
        heading: { ...headings[i] },
        children: [],
      }
      stackTop().children.push(node)
      stack.push(node)
      if (i === activeHeading) {
        stack.forEach((node) => {
          node.isActive = true
        })
      }
      i++
    } else if (level < stack.length) {
      // is sibiling/parent
      stack.pop()
    } else if (level > stack.length) {
      // is grand child
      const node: HeadingNode = {
        heading: undefined,
        children: [],
      }
      stackTop().children.push(node)
      stack.push(node)
    }
  }
  return tree
}

const restrictScroll = function(e: WheelEvent & MithrilEvent) {
  const toc = e.currentTarget as HTMLElement
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

export const TocContent: m.FactoryComponent<{
  article: Article
  headings: Heading[]
  activeHeading: number
  onScrollToHeading(index: number): Promise<void>
}> = () => {
  let isScrollingToHeading = false

  const revealActiveHeading = (
    tocPanelDom: HTMLElement,
    headingDom: HTMLElement,
  ) => {
    const panelRect = tocPanelDom.getBoundingClientRect()
    const headingRect = headingDom.getBoundingClientRect()
    const isOutOfView =
      headingRect.top > panelRect.bottom || headingRect.bottom < panelRect.top
    if (isOutOfView) {
      const halfPanelHeight =
        tocPanelDom.offsetHeight / 2 - headingDom.offsetHeight / 2
      smoothScroll({
        target: headingDom,
        scroller: tocPanelDom as HTMLElement,
        topMargin: halfPanelHeight,
        maxDuration: 0,
      })
    }
  }

  return {
    onupdate(vnode) {
      if (isScrollingToHeading) {
        return
      }
      const activeHeadings = toArray(vnode.dom.querySelectorAll('.active'))
      const activeHeading = activeHeadings[activeHeadings.length - 1] // could have several '.active' headings (for multiple levels)
      if (activeHeading) {
        revealActiveHeading(
          vnode.dom as HTMLElement,
          activeHeading as HTMLElement,
        )
      }
    },
    view(vnode) {
      const { headings, activeHeading, onScrollToHeading } = vnode.attrs
      const tree = toTree(headings, activeHeading)

      const HeadingList = (nodes: HeadingNode[], { isRoot = false } = {}) =>
        m(
          'ul',
          {
            onwheel: isRoot && restrictScroll,
            onclick:
              isRoot &&
              (async (e: MouseEvent) => {
                e.preventDefault()
                e.stopPropagation()
                const index = Number((e.target as HTMLElement).dataset.index)
                if (!Number.isNaN(index)) {
                  isScrollingToHeading = true
                  await onScrollToHeading(index)
                  isScrollingToHeading = false
                }
              }),
          },
          nodes.map(HeadingItem),
        )

      const HeadingItem = (
        { heading, children, isActive }: HeadingNode,
        index: number,
      ) =>
        m(
          'li',
          { class: isActive ? 'active' : '', key: index },
          [
            heading &&
              m(
                'a',
                {
                  ...(heading.anchor ? { href: `#${heading.anchor}` } : {}),
                  [`data-index`]: heading.id,
                },
                heading.text,
              ),
            children && children.length && HeadingList(children),
          ].filter(Boolean),
        )

      return HeadingList(tree.children, { isRoot: true })
    },
  }
}
