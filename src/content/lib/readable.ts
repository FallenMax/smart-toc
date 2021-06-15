import { Content } from '../types'
import { fromPx, setStyle, toPx } from '../util/dom/css'
import { logger } from '../util/logger'
import { between } from '../util/math/between'
import { noop } from '../util/noop'

const EXTENDER_ID = 'smarttoc-extender'
const addExtender = (content: Content, topbarHeight: number) => {
  const { article, scroller, headings } = content
  let extender: HTMLElement | null = scroller.dom.querySelector(
    '#' + EXTENDER_ID,
  )
  if (!extender) {
    extender = document.createElement('div')
    extender.id = EXTENDER_ID
    scroller.dom.appendChild(extender)
  }
  const extenderHeight = extender.offsetHeight

  const bottomHeading = headings.sort(
    (a, b) => b.fromArticleTop! - a.fromArticleTop!,
  )[0]
  if (!bottomHeading) {
    return noop
  }

  /**
   * @see ../../../doc/illustration.svg
   */
  const requiredExtenderHeight = Math.max(
    0,
    scroller.rect.bottom -
      (scroller.dom.scrollHeight - extenderHeight) +
      article.fromScrollerTop +
      bottomHeading.fromArticleTop! -
      Math.max(topbarHeight, scroller.rect.top),
  )

  extender.style.height = requiredExtenderHeight + 'px'

  logger.info('[extender] height: ', requiredExtenderHeight)
  return () => {
    extender?.remove()
  }
}

const addReadableStyle = (article: HTMLElement) => {
  const computed = window.getComputedStyle(article)
  const rect = article.getBoundingClientRect()

  let bestWidth = between(12, fromPx(computed.fontSize), 16) * 66
  if (computed.boxSizing === 'border-box') {
    bestWidth += fromPx(computed.paddingLeft) + fromPx(computed.paddingRight)
  }

  let readableStyle: Partial<CSSStyleDeclaration> = {}
  if (bestWidth < rect.width) {
    readableStyle.maxWidth = toPx(bestWidth)
    if (!(fromPx(computed.marginLeft) || fromPx(computed.marginRight))) {
      readableStyle.marginLeft = 'auto'
      readableStyle.marginRight = 'auto'
    }
  }

  const oldStyle = article.style.cssText
  setStyle(article, readableStyle)
  return () => {
    setStyle(article, oldStyle)
  }
}

let removeReadableStyle = noop
let removeExtender = noop

export const enterReadableMode = (
  content: Content,
  { topbarHeight }: { topbarHeight: number },
): void => {
  leaveReadableMode()

  removeReadableStyle = addReadableStyle(content.article.dom)

  // TODO addReadableStyle() changes layout of article, could require updating heading.fromArticleTop
  removeExtender = addExtender(content, topbarHeight)
}

export const leaveReadableMode = () => {
  removeReadableStyle()
  removeExtender()
}
