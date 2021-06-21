import { Content, Heading, HeadingNode } from '../types'
import { fromArrayLike } from '../util/arraylike'
import { highlight } from '../util/dom/highlight'
import { canScroll, getScrollElement } from '../util/dom/scroll'
import { isDebugging } from '../util/env'
import { logger } from '../util/logger'
import { between } from '../util/math/between'

/** ancestors starting from self, at most `maxDepth` elements */
const getAncestors = (elem: HTMLElement, maxDepth = -1): HTMLElement[] => {
  const ancestors: HTMLElement[] = []
  let cur: HTMLElement | null = elem
  while (cur && maxDepth--) {
    ancestors.push(cur)
    cur = cur.parentElement
  }
  return ancestors
}

// if most elements aligned at some left boundary, return this boundary
const getCommonLeftBoundary = (elems: HTMLElement[]): number | undefined => {
  if (!elems.length) {
    return undefined
  }

  const countByLeft = new Map<number, number>()
  elems.forEach((el) => {
    const left = el.getBoundingClientRect().left
    if (typeof left === 'number') {
      countByLeft.set(left, (countByLeft.get(left) ?? 0) + 1)
    }
  })

  const mostCommon = [...countByLeft.entries()]
    .map(([left, count]) => ({ left, count }))
    .sort((a, b) => b.count - a.left)[0]

  return mostCommon && mostCommon.count > elems.length * 0.5
    ? mostCommon.left
    : undefined
}

const WEIGHTS_BY_SELECTOR_DISTANCE: { [Selector: string]: number[] } = {
  h1: [0, 100, 60, 40, 30, 25, 22, 18].map((s) => s * 0.4),
  h2: [0, 100, 60, 40, 30, 25, 22, 18],
  h3: [0, 100, 60, 40, 30, 25, 22, 18].map((s) => s * 0.5),
  h4: [0, 100, 60, 40, 30, 25, 22, 18].map((s) => s * 0.5 * 0.5),
  h5: [0, 100, 60, 40, 30, 25, 22, 18].map((s) => s * 0.5 * 0.5 * 0.5),
  h6: [0, 100, 60, 40, 30, 25, 22, 18].map((s) => s * 0.5 * 0.5 * 0.5 * 0.5),
  strong: [0, 100, 60, 40, 30, 25, 22, 18].map((s) => s * 0.5 * 0.5 * 0.5),
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

/**
 * How do we know which element is most likely the article? (i.e. contains the article, with minimal irrelevant clutters)
 *
 * Here is the idea:
 * An article element X should contain lots of child/grandchild elements like h2, h3, h4...
 * these elements contributes to the probabilty of "X is the article element".
 *
 * At the same time, elements like nav, sidebar, aside negatively contributes. If an element X contains any of these
 * elements, X is unlikely to be article element, the real article is perhaps deep down in X's descendants, or somewhere else.
 *
 * Note that their amount of contribution (we call score) should vary by distance: the further down they are from X, the less contribution X get.
 * This allows nearer and more relevant candicates win the race, or we will always ends with document.documentElement.
 *
 * So here we look at every meaningful elements like h1, h2, h3 and negative elements like .sidebar, nav, .comment, count scores of their
 * ancestors, the one who get most points wins.
 */
export const extractArticle = (): HTMLElement | undefined => {
  /** candicate scores */
  const scores = new Map<HTMLElement, number>()

  // weigh nodes by factor: "selector" "distance from this node"
  Object.keys(WEIGHTS_BY_SELECTOR_DISTANCE).forEach((selector) => {
    let elems = fromArrayLike(
      document.querySelectorAll(selector),
    ) as HTMLElement[]
    if (selector.toLowerCase() === 'strong') {
      // for non-standard heading elements, only count them as heading when they mostly aligned at left
      const left = getCommonLeftBoundary(elems)
      if (left == null) {
        elems = []
      } else {
        elems = elems.filter(
          (elem) => elem.getBoundingClientRect().left === left,
        )
      }
    }
    elems.forEach((elem) => {
      const byDistance = WEIGHTS_BY_SELECTOR_DISTANCE[selector]
      const ancestors = getAncestors(elem, byDistance.length)
      ancestors.forEach((elem, distance) => {
        scores.set(elem, (scores.get(elem) ?? 0) + byDistance[distance] ?? 0)
      })
    })
  })
  const candicatesAll = [...scores]
    .map(([elem, score]) => {
      return { elem, score }
    })
    .sort((a, b) => b.score - a.score)

  // pick top 5 nodes and adjust with additional factors
  const candicates = candicatesAll
    .slice(0, 5)
    .filter(Boolean)
    .map(({ elem, score }) => {
      const height = elem.scrollHeight
      const width = elem.scrollWidth
      const linksPer20px = between(
        0,
        elem.querySelectorAll('a').length / ((height || 1) / 20),
        1,
      )

      const factors = {
        // narrow elements, likely comment sidebar etc. punishment should propagate
        width: width < 400 ? 0 : 1,
        widthFromChildren: 1,
        // punish scrollable elements (article should be INSIDE scrollable, not IS scrollable)
        scroll: canScroll(elem) && elem !== document.body ? 0 : 1,
        height: between(0, Math.sqrt(height) / 100, 1),
        // punish elements with large link density (they are more likely to be comment list, post list etc.)
        linkDensity: between(0, Math.pow(1 - linksPer20px, 2), 1),
      }
      return {
        elem,
        score: score,
        factors: factors,
      }
    })

  // propagate punishement of being narrow
  candicates.forEach((child) => {
    candicates.forEach((parent) => {
      if (parent.elem.contains(child.elem)) {
        parent.factors.widthFromChildren *= child.factors.width
      }
    })
  })

  const finalCandicates = candicates.map((c) => {
    const f = c.factors
    const finalScore =
      c.score *
      f.height *
      f.linkDensity *
      f.scroll *
      f.width *
      f.widthFromChildren
    return { ...c, finalScore }
  })
  finalCandicates.sort((a, b) => b.finalScore - a.finalScore)

  const article = finalCandicates[0].elem

  if (isDebugging) {
    logger.info('[extract] extractArticle', {
      scores,
      candicatesAll,
      finalCandicates,
    })
    highlight(article, 'red')
    logger.table(
      finalCandicates.map((c) => ({
        elem: c.elem,
        score: c.score,
        ...c.factors,
        final: c.finalScore,
      })),
    )
  }

  return article
}

const WEIGHT_BY_TAG: { [Tag: string]: number } = {
  H1: 4,
  H2: 9,
  H3: 9,
  H4: 10,
  H5: 10,
  H6: 10,
  STRONG: 5,
}

const getElemAnchor = (elem: HTMLElement): string | undefined => {
  if (elem.id) {
    return elem.id
  }
  const links = elem.querySelectorAll('a')
  for (let index = 0; index < links.length; index++) {
    const link = links[index]
    const href = link.href || ''
    if (href.startsWith('#')) {
      return href.substr(1)
    }
    if (link.id) {
      return link.id
    }
  }
  return undefined
}

type HeadingGroup = {
  tag: string
  elems: HTMLElement[]
  score: number
}

const isElemVisible = (elem: HTMLElement) => {
  if (elem.offsetHeight === 0 || elem.offsetWidth === 0) {
    return false
  }
  const styles = window.getComputedStyle(elem)
  if (styles.display === 'none') {
    return false
  }
  if (styles.opacity === '0') {
    return false
  }
  if (styles.visibility === 'invisible') {
    return false
  }
  return true
}

export const toTree = (headings: Heading[]) => {
  const tree: HeadingNode = {}
  const stack = [tree]

  const goUp = () => {
    stack.pop()
    console.log('up', stack, tree)
  }
  const goDown = () => {
    const stackTop = stack[stack.length - 1]
    if (!stackTop.children) {
      stackTop.children = []
    }
    if (!stackTop.children.length) {
      stackTop.children.push({})
    }
    stack.push(stackTop.children[stackTop.children.length - 1])
    console.log('down', stack, tree)
  }
  const appendHeading = (heading?: Heading) => {
    const stackTop = stack[stack.length - 1]
    if (!stackTop.children) {
      stackTop.children = []
    }
    stackTop.children.push({
      heading,
    })
    console.log('append', stack, tree)
  }

  headings.forEach((heading, i) => {
    const { level } = heading

    while (stack.length > level + 1) {
      goUp()
    }
    while (stack.length < level + 1) {
      goDown()
    }
    if (stack.length === level + 1) {
      appendHeading(heading)
    }
  })

  return tree
}

export const extractHeadings = (articleDom: HTMLElement): Heading[] => {
  const headingTagGroups: HeadingGroup[] = Object.keys(WEIGHT_BY_TAG)
    .map((tag) => {
      let elems = fromArrayLike(
        articleDom.getElementsByTagName(tag),
      ) as HTMLElement[]

      // for <strong> elements, only count them in when they generally align at left
      if (tag === 'STRONG') {
        const commonLeft = getCommonLeftBoundary(elems)
        if (commonLeft == null) {
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
        score: elems.length * WEIGHT_BY_TAG[tag],
      }
    })
    .filter((group) => group.score >= 10 && group.elems.length > 0)
    .filter(
      // is group basically visible ?
      (group) =>
        group.elems.filter(isElemVisible).length >= group.elems.length * 0.5,
    )
    .slice(0, 3)
    .map((group) => {
      return {
        ...group,
        elems: group.elems.filter(isElemVisible),
      }
    })

  const headingElements = new Set(...headingTagGroups.map((g) => g.elems))

  const headingTags = headingTagGroups.map((headings) => headings.tag)

  // sort heading nodes using document sequence
  const headings: Heading[] = []

  {
    const walker = document.createTreeWalker(
      articleDom,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode(node: HTMLElement) {
          return headingElements.has(node)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP
        },
      },
    )

    let index = 0
    while (walker.nextNode()) {
      const dom = walker.currentNode as HTMLElement
      const level = headingTags.indexOf(dom.tagName)
      const text = dom.textContent || ''
      const heading = { dom, level, text, index }
      headings.push(heading)

      index++
    }
  }
  if (isDebugging) {
    headingTagGroups.forEach((group, i) => {
      highlight(group.elems, ['blue', 'green', 'yellow'][i])
    })
    logger.info('[extract] extractHeadings', {
      headingTagGroups,
      headings: headings,
    })
    logger.table(headings)
  }

  return headings
}

export const extractContent = (): Content | undefined => {
  const article = extractArticle()
  if (!article) {
    return undefined
  }
  const headings = extractHeadings(article)
  if (!headings || !headings.length) {
    return undefined
  }
  const scroller = getScrollElement(article)

  return { article, headings, scroller }
}

const getIframesRecursive = (win: Window | null): HTMLIFrameElement[] => {
  if (!win) {
    return []
  }

  let iframes: HTMLIFrameElement[] = []
  try {
    iframes = [].slice.apply(win.document.getElementsByTagName('iframe'))
  } catch (error) {
    // ignore
  }
  const allIframes: HTMLIFrameElement[] = []
  iframes.forEach((f) => {
    allIframes.push(f, ...getIframesRecursive(f.contentWindow))
  })
  return allIframes
}

/**
 * window most likely to host main article among all iframe windows
 */
export const detectMainWindow = (): Window => {
  const topWin = window.top

  const iframes = getIframesRecursive(topWin)
  if (iframes.length === 0) {
    return topWin
  }

  const iframesWithArea = iframes
    .map((iframe) => {
      return {
        iframe: iframe,
        area: iframe.offsetWidth * iframe.offsetHeight,
      }
    })
    .sort((a, b) => b.area - a.area)

  const largest = iframesWithArea[0]

  const topDoc = topWin.document.documentElement
  const topArea = topDoc.offsetWidth * topDoc.offsetHeight

  return largest.area > topArea * 0.5
    ? largest.iframe.contentWindow || topWin
    : topWin
}
