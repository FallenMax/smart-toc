import { Article, Heading, Scroller } from '../types'
import { getScrollElement } from '../util/dom/scroll'
import { createEventEmitter } from '../util/event'
import { extractHeadings } from './extract'

export type TocOptions = {
  /**
   * dom element or element id, where to render TOC
   *
   * if not present, you can use toc.render(dom) to render later
   */
  dom?: HTMLElement
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
  articleChanged: undefined | Article
  headingsChanged: undefined | Heading[]
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
  let article: Article | undefined
  let scroller: Scroller | undefined
  let headings: Heading[] | undefined

  const setArticle = (art: Article | undefined) => {
    if (art === article) {
      return
    }

    article = art
    instance.emit('articleChanged', art)

    setHeadings(article && extractHeadings(article))
    setScroller(article && getScrollElement(article))

    // TODO
  }

  const setHeadings = (hds: Heading[] | undefined) => {
    if (areHeadingsEqual(hds, headings)) {
      return
    }

    headings = hds
    instance.emit('headingsChanged', headings)

    // TODO
  }

  const setScroller = (scr: Scroller | undefined) => {
    if (scr === scroller) {
      return
    }

    scroller = scr
    // TODO rebind events
  }

  const instance = {
    ...createEventEmitter<TocEvent>(),
    initialize() {
      setArticle(getElement(options.article))
      if (options.dom) {
        instance.render(options.dom)
      }
    },
    getArticle() {
      return article
    },
    getHeadings() {
      return headings
    },
    getScroller() {},

    goToNextHeading() {},
    goToPreviousHeading() {},
    updateOptions(update: Partial<TocOptions>) {},
    render(dom: HTMLElement) {
      console.log('render', dom)
    },
    destroy() {
      instance.removeAllListeners()
    },
  }

  instance.initialize()

  return instance
}

export type Toc = ReturnType<typeof createToc>
