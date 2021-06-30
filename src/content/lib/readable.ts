import { Content } from '../types'
import { fromPx, setStyle, toPx } from '../util/dom/css'
import { between } from '../util/math/between'

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
