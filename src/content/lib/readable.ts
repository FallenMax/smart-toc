import { num, px } from '../util/dom/px'
import { between } from '../util/math/between'
import { applyStyle } from '../util/dom/css'
import { Content, Heading } from '../types'
import { isDebugging } from '../util/env'

let readableMode = false

//-------------- container extender  --------------

const EXTENDER_ID = 'smarttoc-extender'
const appendExtender = (content: Content, topbarHeight: number): void => {
  const { article, scroller, headings } = content
  let extender: HTMLElement | null = scroller.dom.querySelector(
    '#' + EXTENDER_ID,
  )
  const extenderHeight = extender ? (extender as HTMLElement).offsetHeight : 0
  if (!extender) {
    extender = document.createElement('div')
    extender.id = EXTENDER_ID
    scroller.dom.appendChild(extender)
  }

  const visibleAreaBottom = Math.max(topbarHeight, scroller.rect.top)

  const getBottomHeading = (headings: Heading[]): Heading | undefined => {
    const [first, ...rest] = headings
    return (
      first &&
      rest.reduce(
        (lowest, cur) =>
          cur.fromArticleTop! > lowest.fromArticleTop! ? cur : lowest,
        first,
      )
    )
  }
  const bottomHeading = getBottomHeading(headings)
  if (!bottomHeading) {
    return
  }

  //  the top of last heading, when scrolled to bottom of scroller
  const bottomHeadingTop =
    scroller.rect.bottom -
    (scroller.dom.scrollHeight - extenderHeight) +
    article.fromScrollerTop +
    bottomHeading.fromArticleTop!

  const additionalVerticalSpaceNeeded = Math.max(
    0,
    bottomHeadingTop - visibleAreaBottom,
  )

  extender.style.height = additionalVerticalSpaceNeeded + 'px'
  if (isDebugging) {
    console.log('extender.style.height ', additionalVerticalSpaceNeeded)
  }
}
const removeExtender = (): void => {
  const extender = document.getElementById(EXTENDER_ID)
  if (extender) {
    extender.remove()
  }
}

//-------------- apply readable style --------------

let originStyle: string = ''
const applyReadableStyle = (article: HTMLElement): void => {
  if (readableMode) {
    return
  }

  readableMode = true
  originStyle = article.style.cssText

  const computed = window.getComputedStyle(article)
  if (!computed) throw new Error('article should be element')

  let bestWidth = between(12, num(computed.fontSize!), 16) * 66
  if (computed['box-sizing'] === 'border-box') {
    bestWidth += num(computed['padding-left']) + num(computed['padding-right'])
  }

  let readableStyle = {} as CSSStyleDeclaration
  if (!(num(computed.marginLeft!) || num(computed.marginRight!))) {
    readableStyle.marginLeft = 'auto'
    readableStyle.marginRight = 'auto'
  }
  readableStyle.maxWidth = px(bestWidth)

  applyStyle(article, readableStyle)
}
const removeReadableStyle = (article: HTMLElement): void => {
  if (readableMode) {
    applyStyle(article, originStyle)
    readableMode = false
  }
}

export const enterReadableMode = (
  content: Content,
  { topbarHeight }: { topbarHeight: number },
): void => {
  applyReadableStyle(content.article.dom)
  appendExtender(content, topbarHeight)
}
export const leaveReadableMode = (content: Content): void => {
  removeReadableStyle(content.article.dom)
  removeExtender()
}
