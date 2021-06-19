import { Article, Heading } from '../types'
import { createEventEmitter } from '../util/event'

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
   */
  gapFromTop?: number
  /**
   * insert an empty div at the end of article
   *
   * this is to ensure we can scroll to last heading, even if last paragraph is not tall enough,
   * the placeholder will be removed when toc is destroyed
   */
  appendPlaceholder?: boolean
}

export type TocEvent = {
  articleChanged: { article: Article; headings: Heading[] }
  activeHeadingChanged: number
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
  const instance = {
    ...createEventEmitter<TocEvent>(),
    getArticle() {},
    getHeadings() {},
    getScroller() {},

    goToNextHeading() {},
    goToPreviousHeading() {},
    updateOptions(update: Partial<TocOptions>) {},
    render(dom: HTMLElement) {},
    destroy() {},
  }
  return instance
}

export type Toc = ReturnType<typeof createToc>
