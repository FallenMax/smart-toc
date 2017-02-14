import TOC from './TOC'
import Handle from './Handle'
import Stream from '../helpers/stream'
import { translate3d, applyStyle } from '../helpers/util'

const makeSticky = function(options) {
  let { ref, popper, direction, gap, $refChange, $scroll, $offset, $topMargin } = options
  let $refMetric = Stream.combine($refChange,
    () => {
      let refRect = ref.getBoundingClientRect()
      return {
        top: refRect.top + window.scrollY,
        right: refRect.right + window.scrollX,
        bottom: refRect.bottom + window.scrollY,
        left: refRect.left + window.scrollX,
        width: refRect.width,
        height: refRect.height
      }
    }
  )
  let popperMetric = popper.getBoundingClientRect()
  return Stream.combine($refMetric, $scroll, $offset, $topMargin,
    (article, [scrollX, scrollY], [offsetX, offsetY], topMargin) => {
      let x = direction === 'right' ? article.right + gap : article.left - gap - popperMetric.width
      x = Math.min(Math.max(0, x), window.innerWidth - popperMetric.width) // restrict to visible area
      let y = Math.max(topMargin, article.top - scrollY)
      return {
        position: 'fixed',
        left: 0,
        top: 0,
        transform: translate3d(x + offsetX, y + offsetY)
      }
    }
  )
}


const calcContainerLayout = function(article) {
  let rect = article.getBoundingClientRect()
  let [fromLeft, fromRight] = [
    rect.left + window.scrollX,
    document.documentElement.offsetWidth - rect.right + window.scrollX
  ]
  return {
    direction: fromLeft > fromRight + 50 ? 'left' : 'right' // I do like right more
  }
}


const Container = function({
  article,
  headings,
  $activeHeading,
  $isShow,
  $userOffset,
  $relayout,
  $scroll,
  $topbarHeight,
  onClickHeading
}) {
  let container = document.createElement('DIV')
  container.id = 'smarttoc'
  container.appendChild(Handle({ $userOffset }))
  container.appendChild(TOC({ headings, $activeHeading, onClickHeading }))

  let isLengthy = headings.filter(h => (h.level <= 2)).length > 50
  if (isLengthy) {
    container.classList.add('lengthy')
  }

  $isShow.subscribe(isShow => {
    if (!isShow) {
      container.classList.add('hidden')
    } else {
      container.classList.remove('hidden')
    }
  })

  setTimeout(() => {
    // wait until node is mounted
    // you can addEventListener() BEFORE adding to DOM
    // but elem.getBoundingRect() will return all zeros

    const containerLayout = calcContainerLayout(article)

    const $containerStyle = makeSticky({
      ref: article,
      popper: container,
      direction: containerLayout.direction,
      gap: 150,
      $topMargin: $topbarHeight.map(h => ((h || 0) + 50)),
      $refChange: $relayout,
      $scroll: $scroll,
      $offset: $userOffset
    })

    $containerStyle.subscribe(style => applyStyle(container, style, true))

  }, 0)

  return container
}


export default Container
