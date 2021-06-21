import { Article, Content, Heading } from '../types'
import '../ui/toc.css'
import { getScrollElement } from '../util/dom/scroll'
import { createEventEmitter } from '../util/event'
import { extractHeadings } from './extract'

export type TocOptions = {
  /**
   * article element or elment id
   *
   * if not provided, article will be auto-detected from page (not guaranteed to be correct)
   */
  article?: HTMLElement | string
  /**
   * when scrolling article to reveal a heading, how much top space to preserve
   *
   * this is to avoid heading being covered by UI elements like sticky header)
   *
   * if not provided, this will be detected up first heading change
   */
  gapFromTop?: number
  /**
   * insert an empty div at the end of article
   *
   * this is to ensure that we can scroll to last heading, even if last paragraph is not tall enough,
   * the placeholder will be removed when toc is destroyed
   */
  appendPlaceholder?: boolean
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
export const createToc = (options: TocOptions) => {
  let isDestroyed = false
  let content: Content | undefined
  let metrics
  let dom: HTMLElement | undefined
  let headingTree: HeadingNode | undefined

  const updateContent = (article: Article | undefined) => {
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

  const updateMetrics = () => {
    if (!content) {
      metrics = undefined
      return
    }
    metrics = {
      articleRect: content.article.getBoundingClientRect(),
      scrollerRect: content.scroller.getBoundingClientRect(),
      headingRects: content.headings.map((h) => h.dom.getBoundingClientRect()),
    }
  }

  const render = () => {
    if (!dom) {
      return
    }

    const fragment = new DocumentFragment()

    content?.headings

    dom.innerHTML = ''
    dom.appendChild(fragment)
    // console.log('render', { content, dom, metrics })
  }

  const instance = {
    ...createEventEmitter<TocEvent>(),
    initialize() {
      updateContent(getElement(options.article))
      updateMetrics()
      render()
    },
    getContent() {
      return content
    },

    goToNextHeading() {},
    goToPreviousHeading() {},
    updateOptions(update: Partial<TocOptions>) {},
    render(d: HTMLElement) {
      dom = d
      render()
    },
    destroy() {
      if (isDestroyed) {
        return
      }

      isDestroyed = true
      content = undefined
      // TODO dom
      metrics = undefined
      headingTree = undefined
      instance.removeAllListeners()
    },
  }

  instance.initialize()

  return instance
}

export type Toc = ReturnType<typeof createToc>
