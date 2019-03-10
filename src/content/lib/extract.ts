import { isDebugging } from '../util/env'
import { draw } from '../util/debug'
import { Heading } from '../types'
import { toArray } from '../util/dom/to_array'

const getAncestors = function(elem: HTMLElement, maxDepth = -1): HTMLElement[] {
  const ancestors: HTMLElement[] = []
  let cur: HTMLElement | null = elem
  while (cur && maxDepth--) {
    ancestors.push(cur)
    cur = cur.parentElement
  }
  return ancestors
}

const ARTICLE_TAG_WEIGHTS: { [Selector: string]: number[] } = {
  h1: [0, 100, 60, 40, 30, 25, 22].map((s) => s * 0.4),
  h2: [0, 100, 60, 40, 30, 25, 22],
  h3: [0, 100, 60, 40, 30, 25, 22].map((s) => s * 0.5),
  h4: [0, 100, 60, 40, 30, 25, 22].map((s) => s * 0.5 * 0.5),
  h5: [0, 100, 60, 40, 30, 25, 22].map((s) => s * 0.5 * 0.5 * 0.5),
  strong: [0, 100, 60, 40, 30, 25, 22].map((s) => s * 0.5 * 0.5 * 0.5),
  h6: [0, 100, 60, 40, 30, 25, 22].map((s) => s * 0.5 * 0.5 * 0.5 * 0.5),
  article: [500],
  '.article': [500],
  '#article': [500],
  '.content': [101],
  sidebar: [-500, -100, -50],
  '.sidebar': [-500, -100, -50],
  '#sidebar': [-500, -100, -50],
  aside: [-500, -100, -50],
  '.aside': [-500, -100, -50],
  '#aside': [-500, -100, -50],
  nav: [-500, -100, -50],
  '.nav': [-500, -100, -50],
  '.navigation': [-500, -100, -50],
  '.toc': [-500, -100, -50],
  '.table-of-contents': [-500, -100, -50],
  '.comment': [-500, -100, -50],
}

const getElemsCommonLeft = (elems: HTMLElement[]): number | undefined => {
  if (!elems.length) {
    return undefined
  }
  const lefts: { [Left: number]: number } = {}
  elems.forEach((el) => {
    const left = el.getBoundingClientRect().left
    if (!lefts[left]) {
      lefts[left] = 0
    }
    lefts[left]++
  })
  const count = elems.length

  const isAligned = Object.keys(lefts).length <= Math.ceil(0.3 * count)
  if (!isAligned) {
    return undefined
  }
  const sortedByCount = Object.keys(lefts).sort((a, b) => lefts[b] - lefts[a])
  const most = Number(sortedByCount[0])
  return most
}

export const extractArticle = function(): HTMLElement | undefined {
  const elemScores = new Map<HTMLElement, number>()

  // weigh nodes by factor: "selector" "distance from this node"
  Object.keys(ARTICLE_TAG_WEIGHTS).forEach((selector) => {
    let elems = toArray(document.querySelectorAll(selector)) as HTMLElement[]
    if (selector.toLowerCase() === 'strong') {
      // for <strong> elements, only take them as heading when they align at left
      const commonLeft = getElemsCommonLeft(elems)
      if (commonLeft === undefined || commonLeft > window.innerWidth / 2) {
        elems = []
      } else {
        elems = elems.filter(
          (elem) => elem.getBoundingClientRect().left === commonLeft,
        )
      }
    }
    elems.forEach((elem) => {
      const weights = ARTICLE_TAG_WEIGHTS[selector]
      const ancestors = getAncestors(elem as HTMLElement, weights.length)
      ancestors.forEach((elem, distance) => {
        elemScores.set(
          elem,
          (elemScores.get(elem) || 0) + weights[distance] || 0,
        )
      })
    })
  })
  const sortedByScore = [...elemScores].sort((a, b) => b[1] - a[1])

  // pick top 5 node to re-weigh
  const candicates = sortedByScore
    .slice(0, 5)
    .filter(Boolean)
    .map(([elem, score]) => {
      return { elem, score }
    })

  // re-weigh by factor:  "take-lots-vertical-space", "contain-less-links", "not-too-narrow"
  const isTooNarrow = (e: HTMLElement) => e.scrollWidth < 400 // rule out sidebars
  candicates.forEach((candicate) => {
    if (isTooNarrow(candicate.elem)) {
      candicate.score = 0
      candicates.forEach((parent) => {
        if (parent.elem.contains(candicate.elem)) {
          parent.score *= 0.7
        }
      })
    }
  })

  const reweighted = candicates
    .map(({ elem, score }) => {
      return {
        elem,
        score:
          score *
          Math.log(
            (elem.scrollHeight * elem.scrollHeight) /
              (elem.querySelectorAll('a').length || 1),
          ),
      }
    })
    .sort((a, b) => b.score - a.score)
  const article = reweighted.length ? reweighted[0].elem : undefined
  if (isDebugging) {
    draw(article, 'red')
  }
  return article
}

const HEADING_TAG_WEIGHTS = {
  H1: 4,
  H2: 9,
  H3: 9,
  H4: 10,
  H5: 10,
  H6: 10,
  STRONG: 5,
}
export const extractHeadings = (articleDom: HTMLElement): Heading[] => {
  const isVisible = (elem: HTMLElement) => elem.offsetHeight !== 0
  type HeadingGroup = {
    tag: string
    elems: HTMLElement[]
    score: number
  }

  const isHeadingGroupVisible = (group: HeadingGroup) => {
    return group.elems.filter(isVisible).length >= group.elems.length * 0.5
  }

  const headingTagGroups: HeadingGroup[] = Object.keys(HEADING_TAG_WEIGHTS)
    .map(
      (tag): HeadingGroup => {
        let elems = toArray(
          articleDom.getElementsByTagName(tag),
        ) as HTMLElement[]
        if (tag.toLowerCase() === 'strong') {
          // for <strong> elements, only take them as heading when they align at left
          const commonLeft = getElemsCommonLeft(elems)
          if (commonLeft === undefined || commonLeft > window.innerWidth / 2) {
            elems = []
          } else {
            elems = elems.filter(
              (elem) => elem.getBoundingClientRect().left === commonLeft,
            )
          }
        }
        return {
          tag,
          elems,
          score: elems.length * HEADING_TAG_WEIGHTS[tag],
        }
      },
    )
    .filter((group) => group.score >= 10 && group.elems.length > 0)
    .filter((group) => isHeadingGroupVisible(group))
    .slice(0, 3)

  // use document sequence
  const headingTags = headingTagGroups.map((headings) => headings.tag)
  const acceptNode = (node: HTMLElement) => {
    const group = headingTagGroups.find((g) => g.tag === node.tagName)
    if (!group) {
      return NodeFilter.FILTER_SKIP
    }
    return group.elems.includes(node) && isVisible(node)
      ? NodeFilter.FILTER_ACCEPT
      : NodeFilter.FILTER_SKIP
  }
  const treeWalker = document.createTreeWalker(
    articleDom,
    NodeFilter.SHOW_ELEMENT,
    { acceptNode },
  )
  const headings: Heading[] = []
  let id = 0
  while (treeWalker.nextNode()) {
    const dom = treeWalker.currentNode as HTMLElement
    const anchor =
      dom.id ||
      toArray(dom.querySelectorAll('a'))
        .map((a) => {
          let href = a.getAttribute('href') || ''
          return href.startsWith('#') ? href.substr(1) : a.id
        })
        .filter(Boolean)[0]
    headings.push({
      dom,
      text: dom.textContent || '',
      level: headingTags.indexOf(dom.tagName) + 1,
      id,
      anchor,
    })
    id++
  }
  if (isDebugging) {
    if (headingTagGroups.length > 0) draw(headingTagGroups[0].elems, 'blue')
    if (headingTagGroups.length > 1) draw(headingTagGroups[1].elems, 'green')
    if (headingTagGroups.length > 2) draw(headingTagGroups[2].elems, 'yellow')
  }
  return headings
}
