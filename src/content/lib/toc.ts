import {
  Article,
  Content,
  Heading,
  Measurements as Measurements,
} from '../types'
import {
  getScrollElement,
  getScrollTop,
  smoothScroll,
} from '../util/dom/scroll'
import { createEventEmitter } from '../util/event'
import { noop } from '../util/noop'
import { extractArticle, extractHeadings, toTree } from './extract'

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
   * scroll to heading when clicked on toc
   */
  scrollOnClick?: boolean
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

const areHeadingsEqual = (
  a: Heading[] | undefined,
  b: Heading[] | undefined,
) => {
  if (a && b) {
    return (
      a.length === b.length &&
      a.every((ha, i) => {
        const hb = b[i]
        return ha.dom === hb.dom && ha.level === hb.level && ha.text === hb.text
      })
    )
  } else {
    return a === b
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
  gapFromScrollerTop,
  headingSelectors,
  appendPlaceholder = true,
  scrollOnClick = true,
}: TocOptions) => {
  let isDestroyed = false
  let content: Content | undefined
  let measurements: Measurements | undefined
  let dom: HTMLElement | undefined
  let headingTree: HeadingNode | undefined
  let activeHeading = -1
  let activeLIs = [] as HTMLElement[]

  const updateContent = (article: Article | undefined) => {
    measurements = undefined
    headingTree = undefined
    activeHeading = -1
    activeLIs = []
    if (article) {
      const headings = extractHeadings(article)
      const scroller = getScrollElement(article)
      if (headings && scroller) {
        content = { article, headings, scroller }
        instance.emit('contentChanged', content)
        return
      }
    }

    content = undefined
    instance.emit('contentChanged', content)
  }

  const updateMeasurements = () => {
    if (!content) {
      measurements = undefined
      return
    }
    measurements = {
      articleRect: content.article.getBoundingClientRect(),
      scrollerRect: content.scroller.getBoundingClientRect(),
      scrollY: getScrollTop(content.scroller),
      headingRects: content.headings.map((h) => h.dom.getBoundingClientRect()),
    }
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

  let unrender = noop
  const render = () => {
    if (!dom) {
      return
    }

    if (!content) {
      return
    }

    const fragment = new DocumentFragment()
    if (!headingTree) {
      headingTree = toTree(content.headings)
    }
    appendHeadingNode(fragment, headingTree)

    dom.appendChild(fragment)

    updateActiveHeading()

    if (scrollOnClick) {
      dom.addEventListener('click', handleHeadingClicked)
    }
    unrender = () => {
      if (dom) {
        dom.innerHTML = ''
        dom.removeEventListener('click', handleHeadingClicked)
      }
    }
  }

  let unbindArticleEvents = noop

  const updateActiveHeading = () => {
    const index = calcActiveHeading()
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

  const scrollToHeading = (index: number) => {
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

  const handleHeadingClicked = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    const index = Number(target?.dataset.headingIndex)
    if (Number.isNaN(index)) {
      return
    }
    if (scrollOnClick) {
      scrollToHeading(index)
    }
  }
  const calcActiveHeading = () => {
    if (!content) {
      return -1
    }
    const { scroller } = content
    if (!measurements) {
      updateMeasurements()
    }
    const m = measurements!

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

  const bindArticleEvents = () => {
    unbindArticleEvents()
    if (!content) {
      return noop
    }
    const { scroller } = content

    const emitter = scroller === document.body ? window : scroller
    emitter.addEventListener('scroll', updateActiveHeading)
    return () => {
      emitter.removeEventListener('scroll', updateActiveHeading)
    }
  }

  const instance = {
    ...createEventEmitter<TocEvent>(),
    initialize() {
      updateContent(getElement(article))
      updateMeasurements()
      render()
      unbindArticleEvents = bindArticleEvents()
    },
    getContent() {
      return content
    },
    getMeasurements() {
      if (content && !measurements) {
        updateMeasurements()
      }
      return measurements
    },

    goToHeading(index: number) {
      scrollToHeading(index)
    },
    goToNextHeading() {
      if (!content || activeHeading == null) {
        return
      }
      const next = (activeHeading + 1) % content.headings.length
      scrollToHeading(next)
    },
    goToPreviousHeading() {
      if (!content || activeHeading == null) {
        return
      }
      const next =
        (activeHeading - 1 + content.headings.length) % content.headings.length
      scrollToHeading(next)
    },
    render(d: HTMLElement) {
      if (dom !== d) {
        unrender()
        dom = d
      }
      render()
      return unrender
    },
    destroy() {
      if (isDestroyed) {
        return
      }
      unbindArticleEvents()
      isDestroyed = true
      content = undefined
      measurements = undefined
      headingTree = undefined
      activeLIs = []
      if (dom) {
        dom.innerHTML = ''
      }
      instance.removeAllListeners()
    },
  }

  instance.initialize()

  return instance
}

export type Toc = ReturnType<typeof createToc>
