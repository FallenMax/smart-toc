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
  type TocEvents = {
    articleChanged: undefined
    articleLayoutChanged: undefined
    activeHeadingChanged: undefined
  }

  return {
    getArticle() {},
    getHeadings() {},
    getScroller() {},

    goToNextHeading() {},
    goToPreviousHeading() {},
    updateOptions(update: Partial<TocOptions>) {},
    render(dom: HTMLElement) {},
    destroy() {},
  }
}

export type Toc = ReturnType<typeof createToc>
