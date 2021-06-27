import {
  Article,
  Content,
  Heading,
  Measurements as Measurements,
} from '../types'
import { createDisposer } from '../util/disposer'
import { listen } from '../util/dom/el'
import {
  getScrollElement,
  getScrollTop,
  smoothScroll,
} from '../util/dom/scroll'
import { createEventEmitter } from '../util/event'
import { noop } from '../util/noop'
import { extractArticle, extractHeadings, toTree } from './extract'

const scrollToHeading = (
  content: Content | undefined,
  index: number,
  gapFromScrollerTop: number | undefined,
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
      topMargin: gapFromScrollerTop ?? 0 + 10, // TODO measure topBar
      onFinish() {
        // TODO measure
        // $triggerTopbarMeasure(heading.dom)
      },
    })
  }
}

const measureContent = (content: Content) => {
  return {
    articleRect: content.article.getBoundingClientRect(),
    scrollerRect: content.scroller.getBoundingClientRect(),
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

const calcActiveHeading = (
  content: Content,
  measurements: Measurements,
  gapFromScrollerTop?: number,
) => {
  const { scroller } = content
  const m = measurements

  const visibleAreaTop = Math.max(gapFromScrollerTop ?? 0, m.scrollerRect.top)
  const scrollY = getScrollTop(scroller)

  for (let i = 0; i < m.headingRects.length; i++) {
    const rect = m.headingRects[i]
    let top = rect.top + m.scrollY - scrollY
    const isCompletelyVisible = top >= visibleAreaTop + 15
    if (isCompletelyVisible) {
      // the 'nearly-visible' heading is the current heading
      return Math.max(0, i - 1)
    }
  }
  return m.headingRects.length - 1
}

export type TocOptions = {
  /**
   * article element or elment id
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
   *
   * this helps avoid heading being covered by UI elements like sticky header).
   * if not provided, this will be detected up first heading change
   */
  gapFromScrollerTop?: number
  /**
   * insert an empty div at the end of article
   *
   * this is to ensure that we can scroll to last heading, even if last paragraph is not tall enough,
   * the placeholder will be removed when toc is destroyed
   */
  appendPlaceholder?: boolean

  /**
   * jump to clicked heading
   */
  jumpOnClick?: boolean
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
  gapFromScrollerTop,
  headingSelectors,
  appendPlaceholder = true,
  jumpOnClick = true,
}: TocOptions) => {
  let content = extractContent(getElement(article))
  let dom: HTMLElement | undefined

  // derived states
  let measurements: Measurements | undefined
  const ensureMeasurements = (content: Content) => {
    if (!measurements) {
      measurements = measureContent(content)
    }
    return measurements
  }
  let headingTree: HeadingNode | undefined
  let activeHeading = -1
  let activeLIs = [] as HTMLElement[]
  const clearDerivedStates = () => {
    measurements = undefined
    headingTree = undefined
    activeHeading = -1
    activeLIs = []
  }

  const render = (dom: HTMLElement) => {
    if (!content) {
      return noop
    }

    const fragment = new DocumentFragment()
    if (!headingTree) {
      headingTree = toTree(content.headings)
    }

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

    updateActiveHeading()

    return () => {
      if (dom) {
        dom.innerHTML = ''
      }
    }
  }

  const updateActiveHeading = () => {
    const index = content
      ? calcActiveHeading(
          content,
          ensureMeasurements(content),
          gapFromScrollerTop,
        )
      : -1
    if (index === activeHeading) {
      return
    }
    activeHeading = index

    if (dom) {
      activeLIs.forEach((li) => li.classList.remove('active'))
      let current = dom.querySelector(`[data-heading-index="${index}"]`)
      while (current && current !== dom) {
        if (current.tagName === 'LI') {
          activeLIs.push(current as HTMLElement)
          current.classList.add('active')
        }
        current = current.parentElement
      }
    }
    instance.emit('activeHeadingChanged', index)
  }

  const instance = {
    ...createEventEmitter<TocEvent>(),
    start(el?: HTMLElement) {
      dom = el

      const { R, dispose } = createDisposer()
      if (dom) {
        R(render(dom))
        if (jumpOnClick) {
          R(
            listen(dom, 'click', (e) => {
              const target = e.target as HTMLElement
              const index = Number(target?.dataset.headingIndex)
              if (Number.isNaN(index)) {
                return
              }
              if (jumpOnClick) {
                scrollToHeading(content, index, gapFromScrollerTop)
              }
            }),
          )
        }
        updateActiveHeading()
      }
      if (content) {
        const emitter =
          content.scroller === document.body ? window : content.scroller
        R(listen(emitter, 'scroll', updateActiveHeading))
      }

      return dispose
    },
    getContent() {
      return content
    },
    getMeasurements() {
      if (content && !measurements) {
        measurements = measureContent(content)
      }
      return measurements
    },

    goToHeading(index: number) {
      scrollToHeading(content, index, gapFromScrollerTop)
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
