import Stream from '../helpers/stream'
import { num, applyStyle } from '../helpers/util'

const Extender = function({ headings, scrollable, $isShow, $relayout }) {
  const $extender = Stream()
  // toc: extend body height so we can scroll to the last heading
  let extender = document.createElement('DIV')
  extender.id = 'smarttoc-extender'
  Stream.combine($isShow, $relayout, isShow => {
    setTimeout(() => {
      // some delay to ensure page is stable ?
      let lastHeading = headings.slice(-1)[0].node
      let lastRect = lastHeading.getBoundingClientRect()
      let extenderHeight = 0
      if (scrollable === document.body) {
        let heightBelowLastRect =
          document.documentElement.scrollHeight -
          (lastRect.bottom + window.scrollY) -
          num(extender.style.height) // in case we are there already
        extenderHeight = isShow
          ? Math.max(
              window.innerHeight - lastRect.height - heightBelowLastRect,
              0
            )
          : 0
      } else {
        let scrollRect = scrollable.getBoundingClientRect()
        let heightBelowLastRect =
          scrollRect.top +
          scrollable.scrollHeight -
          scrollable.scrollTop - // bottom of scrollable relative to viewport
          lastRect.bottom -
          num(extender.style.height) // in case we are there already
        extenderHeight = isShow
          ? Math.max(
              scrollRect.height - lastRect.height - heightBelowLastRect,
              0
            )
          : 0
      }
      $extender({
        height: extenderHeight
      })
    }, 300)
  })
  $extender.subscribe(style => applyStyle(extender, style))
  return extender
}

export default Extender
