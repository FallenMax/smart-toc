import { assert, log, draw } from './util'

const pathToTop = function(elem, maxLvl = -1) {
  assert(elem, 'no element given')
  const path = []
  while (elem && maxLvl--) {
    path.push(elem)
    elem = elem.parentElement
  }
  return path
}

const isStrongAlsoHeading = function(rootElement = document) {
  return false
    // return rootElement.querySelectorAll('p > strong:only-child').length > 3
}

export const extractArticle = function(rootElement = document) {
  log('extracting article')

  const scores = new Map()

  function addScore(elem, inc) {
    scores.set(elem, (scores.get(elem) || 0) + inc)
  }

  function updateScore(elem, weight) {
    let path = pathToTop(elem, weight.length)
    path.forEach((elem, distance) => addScore(elem, weight[distance]))
  }

  // weigh nodes by factor: "selector", "distance from this node"
  const weights = {
    h1: [0, 100, 60, 40, 30, 25, 22].map(s => (s * 0.4)),
    h2: [0, 100, 60, 40, 30, 25, 22],
    h3: [0, 100, 60, 40, 30, 25, 22],
    h4: [0, 100, 60, 40, 30, 25, 22],
    h5: [0, 100, 60, 40, 30, 25, 22],
    h6: [0, 100, 60, 40, 30, 25, 22],
    article: [500],
    '.article': [500],
    '.content': [101],
    'sidebar': [-500],
    '.sidebar': [-500],
    'aside': [-500],
    '.aside': [-500],
    'nav': [-500],
    '.nav': [-500],
    '.navigation': [-500],
    '.toc': [-500],
    '.table-of-contents': [-500]
  }
  const selectors = Object.keys(weights)
  selectors
    .map(selector => [selector, [].slice.apply(rootElement.querySelectorAll(selector))])
    .forEach(([selector, elems]) =>
      elems.forEach(elem =>
        updateScore(elem, weights[selector])
      )
    )
  const sorted = [...scores].sort((a, b) => (b[1] - a[1]))

  // reweigh top 5 nodes by factor:  "take-lots-vertical-space", "contain-less-links"
  const candicates = sorted.slice(0, 5).filter(Boolean)
  const reweighted = candicates
    .map(([elem, score]) => [
      elem,
      score * Math.log(elem.scrollHeight / (elem.querySelectorAll('a').length || 1)),
      elem.scrollHeight,
      elem.querySelectorAll('a').length
    ])
    .sort((a, b) => (b[1] - a[1]))
  const article = reweighted.length ? reweighted[0][0] : null
  if (__DEV__) {
    log(sorted)
    log(reweighted)
    log(article)
    draw(article)
  }
  return article
}

export const extractHeadings = function(article) {
  log('extracting heading')

  // what to be considered as headings
  const tags = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].concat(
    isStrongAlsoHeading(article) ? 'STRONG' : [])
  const tagWeight = tag => ({ H1: 4, H2: 9, H3: 9, H4: 10, H5: 10, H6: 10, STRONG: 10 }[tag])
  const isMostlyVisible = headings => (headings.filter(h => h.offsetHeight).length >= headings.length * 0.5)
  const headingGroup = tags.map(tag => [].slice.apply(article.getElementsByTagName(tag)))
    .map((headings, i) => ({
      elems: headings,
      tag: tags[i],
      score: headings.length * tagWeight(tags[i])
    }))
    .filter(heading => heading.score >= 10)
    .filter(heading => isMostlyVisible(heading.elems))
    .slice(0, 3)

  // use document sequence
  const validTags = headingGroup.map(headings => headings.tag)
  const acceptNode = node => validTags.includes(node.tagName) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
  const treeWalker = document.createTreeWalker(
    article,
    NodeFilter.SHOW_ELEMENT, { acceptNode }
  )
  const headings = []
  while (treeWalker.nextNode()) {
    let node = treeWalker.currentNode
    headings.push({
      node,
      level: validTags.indexOf(node.tagName) + 1
    })
  }
  if (__DEV__) {
    const toElems = g => (g ? g.elems : [])
    draw(toElems(headingGroup[0]), 'blue')
    draw(toElems(headingGroup[1]), 'green')
    draw(toElems(headingGroup[2]), 'yellow')
  }
  return headings
}

export default function extract() {
  const article = extractArticle(document)
  const headings = article && extractHeadings(article)
  return [article, headings]
}
