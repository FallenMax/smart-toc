import { Content } from '../types'
import { fromPx, setStyle, toPx } from '../util/dom/css'
import { logger } from '../util/logger'
import { between } from '../util/math/between'
import { noop } from '../util/noop'

const EXTENDER_ID = 'smarttoc-extender'
const addExtender = (content: Content, topbarHeight: number) => {
  const { article, scroller, headings } = content
  let extender: HTMLElement | null = scroller.querySelector('#' + EXTENDER_ID)
  if (!extender) {
    extender = document.createElement('div')
    extender.id = EXTENDER_ID
    scroller.appendChild(extender)
  }
  const extenderHeight = extender.offsetHeight

  const bottomHeading = headings.sort((a, b) => b! - a.fromArticleTop!)[0]
  if (!bottomHeading) {
    return noop
  }

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

export const enterReadable = (content: Content) => {
  const { article } = content
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
