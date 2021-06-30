import { Article, Content, Heading, Measurements, Rect } from '../types'
import { createDisposer } from '../util/disposer'
import { addClass, appendChild, createElement, listen } from '../util/dom/el'
import {
  getScrollElement,
  getScrollTop,
  smoothScroll,
} from '../util/dom/scroll'
import { createEventEmitter } from '../util/event'
import { noop } from '../util/noop'
import { extractArticle, extractHeadings, toTree } from './extract'

const DEFAULT_TOP_MARGIN = 10

const measureContent = (content: Content): Measurements => {
  let scrollerRect: Rect = content.scroller.getBoundingClientRect()
  if (
    content.scroller === document.body ||
    content.scroller === document.documentElement
  ) {
    scrollerRect = {
      top: 0,
      left: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
      width: window.innerWidth,
      height: window.innerHeight,
    }
  }
  return {
    articleRect: content.article.getBoundingClientRect(),
    scrollerRect,
    scrollY: getScrollTop(content.scroller),
    headingRects: content.headings.map((h) => h.dom.getBoundingClientRect()),
  }
}

const extractContent = (article: Article | undefined) => {
  if (!article) {
    return undefined
  }
  const headings = extractHeadings(article)
  const scroller = getScrollElement(article)
  if (headings && scroller) {
    return { article, headings, scroller }
  } else {
    return undefined
  }
}

const scrollToHeading = (
  content: Content | undefined,
  index: number,
  topMargin: number,
) => {
  if (!content) {
    return
  }
  const { scroller, headings } = content
  const heading = headings[index]
  if (heading) {
    smoothScroll({
      target: heading.dom,
      scroller: scroller,
      topMargin: topMargin,
      onFinish() {
        // TODO measure
        // $triggerTopbarMeasure(heading.dom)
      },
    })
  }
}

const calcActiveHeading = (
  content: Content | undefined,
  measurements: Measurements | undefined,
  topMargin = DEFAULT_TOP_MARGIN,
) => {
  if (!content || !measurements) {
    return -1
  }
  const { scroller } = content
  const m = measurements

  const headingStart = topMargin + m.scrollerRect.top
  const scrollY = getScrollTop(scroller)

  for (let i = 0; i < m.headingRects.length; i++) {
    const rect = m.headingRects[i]
    let top = rect.top + m.scrollY - scrollY
    if (top > headingStart) {
      return Math.max(0, i - 1)
    }
  }
  return m.headingRects.length - 1
}

const appendExtenderToArticle = (
  content: Content,
  measurements: Measurements,
  topGap: number,
) => {
  const { article, scroller, headings } = content
  const { articleRect, scrollerRect, headingRects, scrollY } = measurements
  const { R, dispose } = createDisposer()

  const bottom = headingRects.sort((a, b) => b.bottom - a.bottom)[0]?.bottom
  if (bottom == null) {
    return dispose
  }

  const expectedYWhenScrolled = scrollerRect.top + topGap
  const actualYWhenScrolled =
    scrollerRect.bottom - (articleRect.bottom - bottom) // TODO consider scroller padding etc

  const requiredExtenderHeight = Math.max(
    0,
    actualYWhenScrolled - expectedYWhenScrolled,
  )

  console.log(`🚀 > expectedYWhenScrolled`, {
    expectedYWhenScrolled,
    actualYWhenScrolled,
    requiredExtenderHeight,
  })

  const extender = createElement('div', 'smarttoc-extender')
  R(appendChild(scroller, extender))
  extender.style.height = requiredExtenderHeight + 'px'

  return dispose
}

export type TocOptions = {
  /**
   * article element or element id
   *
   * if not provided, article will be auto-detected from page (not guaranteed to be correct)
   */
  article?: HTMLElement | string

  /**
   * heading selectors, one for each heading level
   *
   * @example
   * - ['h2', 'h3', 'h4'] will make toc scan `<h2>`, `<h3>`, `<h4>` as 3 levels of headings
   */
  headingSelectors?: string[]
  /**
   * when scrolling article to reveal a heading, how much top space to preserve
   */
  topMargin?: number
  /**
   * insert an empty div at the end of article
   *
   * this div extends article to ensure that we can scroll to last heading, in case last paragraph is not tall enough,
   * the placeholder will be removed when toc is destroyed
   *
   * @default true
   */
  appendExtender?: boolean

  /**
   * jump to clicked heading
   *
   * @default true
   */
  jumpOnClick?: boolean

  /**
   * highlight current heading when scroll on article
   *
   * @default true
   */
  highlightOnScroll?: boolean
}

export type TocEvent = {
  contentChanged: undefined | Content
  activeHeadingChanged: number
}

const getElement = (el: string | HTMLElement | undefined) => {
  if (typeof el === 'string') {
    return document.getElementById(el) ?? undefined
  }
  return el
}

const renderToc = (dom: HTMLElement, content: Content) => {
  const fragment = new DocumentFragment()
  const headingTree = toTree(content.headings)

  const appendHeadingNode = (
    parent: HTMLElement | DocumentFragment,
    node: HeadingNode,
  ) => {
    const { heading, children } = node

    if (heading) {
      const a = document.createElement('a')
      a.dataset.headingIndex = String(heading.index)
      a.textContent = heading.text
      parent.appendChild(a)
    }
    if (children?.length) {
      const ul = document.createElement('ul')
      for (let index = 0; index < children.length; index++) {
        const c = children[index]
        const li = document.createElement('li')
        appendHeadingNode(li, c)
        ul.appendChild(li)
      }
      parent.appendChild(ul)
    }
  }

  appendHeadingNode(fragment, headingTree)

  dom.appendChild(fragment)

  return () => {
    if (dom) {
      dom.innerHTML = ''
    }
  }
}

type HeadingNode = {
  heading?: Heading | undefined
  children?: HeadingNode[]
}

/**
 * - detect article if not provided
 * - detect headings
 * - detect scroller
 * - display headings, with current heading highlighted
 * - listen on article scroll and update heading
 * - click to scroll to heading
 * - observe on article/heading/scroller change
 * - emit event
 *   - article/heading/scroller change
 */
export const createToc = ({
  article = extractArticle(),
  topMargin = DEFAULT_TOP_MARGIN,
  headingSelectors,
  appendExtender = true,
  jumpOnClick = true,
  highlightOnScroll = true,
}: TocOptions) => {
  let content = extractContent(getElement(article))
  let dom: HTMLElement | undefined

  // derived states
  let measurements: Measurements | undefined
  function ensureMeasurements(content: Content) {
    if (!measurements) {
      measurements = measureContent(content)
    }
    return measurements
  }
  let activeHeading = -1

  const instance = {
    ...createEventEmitter<TocEvent>(),
    start(el?: HTMLElement) {
      dom = el

      const { R, dispose } = createDisposer()

      if (dom && content) {
        R(renderToc(dom, content))
      }

      if (appendExtender) {
        if (content) {
          R(
            appendExtenderToArticle(
              content,
              ensureMeasurements(content),
              topMargin,
            ),
          )
        }
      }

      // jump to active heading on click
      if (dom && jumpOnClick) {
        R(
          listen(dom, 'click', (e) => {
            const target = e.target as HTMLElement
            const index = Number(target?.dataset.headingIndex)
            if (Number.isNaN(index)) {
              return
            }
            if (jumpOnClick) {
              scrollToHeading(content, index, topMargin)
            }
          }),
        )
      }

      // highlight active heading on article scroll
      if (dom && content && highlightOnScroll) {
        let unhightlight = noop
        const highlight = (index: number) => {
          const { R, dispose } = createDisposer()
          if (dom) {
            let current = dom.querySelector(`[data-heading-index="${index}"]`)
            while (current && current !== dom) {
              if (current.tagName === 'LI') {
                R(addClass(current, 'active'))
              }
              current = current.parentElement
            }

            instance.emit('activeHeadingChanged', index)
          }
          return dispose
        }
        const emitter =
          content.scroller === document.body ? window : content.scroller
        R(
          listen(emitter, 'scroll', () => {
            const index = content
              ? calcActiveHeading(
                  content,
                  ensureMeasurements(content),
                  topMargin,
                )
              : -1
            if (index === activeHeading) {
              return noop
            }
            activeHeading = index
            unhightlight()
            unhightlight = highlight(index)
          }),
        )
        unhightlight = highlight(
          calcActiveHeading(content, ensureMeasurements(content), topMargin),
        )
      }

      return dispose
    },
    getContent() {
      return content
    },
    getMeasurements(forceMeasure = false) {
      if (content) {
        if (!measurements || forceMeasure) {
          measurements = measureContent(content)
        }
      }
      return measurements
    },
    getTopMargin() {
      return topMargin
    },

    goToHeading(index: number) {
      scrollToHeading(content, index, topMargin)
    },
    goToNextHeading() {
      if (!content || activeHeading === -1) {
        return
      }
      const next = (activeHeading + 1) % content.headings.length
      instance.goToHeading(next)
    },
    goToPreviousHeading() {
      if (!content || activeHeading === -1) {
        return
      }
      const next =
        (activeHeading - 1 + content.headings.length) % content.headings.length
      instance.goToHeading(next)
    },
  }

  return instance
}

export type Toc = ReturnType<typeof createToc>
