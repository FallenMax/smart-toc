import { num, px } from '../util/dom/px'
import { between } from '../util/math/between'
import { applyStyle } from '../util/dom/css'
import { Content, Heading } from '../types'
import { isDebugging } from '../util/env'
import { toArray } from '../util/dom/to_array'

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
    console.log('[extender] height: ', additionalVerticalSpaceNeeded)
  }
}
const removeExtender = (): void => {
  const extender = document.getElementById(EXTENDER_ID)
  if (extender) {
    extender.remove()
  }
}

//-------------- apply readable style --------------

const DATASET_ARTICLE = 'smarttocArticle'
const DATASET_ARTICLE__CAMELCASE = 'smarttoc-article'
const DATASET_ORIGIN_STYLE = 'smarttocOriginStyle'

const applyReadableStyle = (article: HTMLElement): void => {
  article.dataset[DATASET_ARTICLE] = '1'
  article.dataset[DATASET_ORIGIN_STYLE] = article.style.cssText

  const computed = window.getComputedStyle(article)
  if (!computed) throw new Error('article should be element')
  const rect = article.getBoundingClientRect()

  let bestWidth = between(12, num(computed.fontSize!), 16) * 66
  if (computed['box-sizing'] === 'border-box') {
    bestWidth += num(computed['padding-left']) + num(computed['padding-right'])
  }

  let readableStyle = {} as CSSStyleDeclaration
  if (bestWidth < rect.width) {
    readableStyle.maxWidth = px(bestWidth)
    if (!(num(computed.marginLeft!) || num(computed.marginRight!))) {
      readableStyle.marginLeft = 'auto'
      readableStyle.marginRight = 'auto'
    }
  }
  applyStyle(article, readableStyle)
}

const removeReadableStyle = (): void => {
  const articles = toArray(
    document.querySelectorAll(`[data-${DATASET_ARTICLE__CAMELCASE}]`),
  ) as HTMLElement[]
  articles.forEach((article) => {
    applyStyle(article, article.dataset[DATASET_ORIGIN_STYLE])
    delete article.dataset[DATASET_ARTICLE]
    delete article.dataset[DATASET_ORIGIN_STYLE]
  })
}

export const enterReadableMode = (
  content: Content,
  { topbarHeight }: { topbarHeight: number },
): void => {
  leaveReadableMode()

  if (isDebugging) {
    console.log('[readable mode] enter')
  }
  applyReadableStyle(content.article.dom)
  appendExtender(content, topbarHeight)
}

export const leaveReadableMode = (): void => {
  if (isDebugging) {
    console.log('[readable mode] leave')
  }
  removeReadableStyle()
  removeExtender()
}
