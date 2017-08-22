import { throttle } from '../helpers/util'
import m from 'mithril'

const stop = e => {
  e.stopPropagation()
  e.preventDefault()
}

const Handle = function({ $userOffset }) {
  let [sClientX, sClientY] = [0, 0]
  let [sOffsetX, sOffsetY] = [0, 0]

  const onDrag = throttle(e => {
    stop(e)
    let [dX, dY] = [e.clientX - sClientX, e.clientY - sClientY]
    $userOffset([sOffsetX + dX, sOffsetY + dY])
  })

  const onDragEnd = e => {
    window.removeEventListener('mousemove', onDrag)
    window.removeEventListener('mouseup', onDragEnd)
  }

  const onDragStart = e => {
    if (e.button === 0) {
      stop(e)
      sClientX = e.clientX
      sClientY = e.clientY
      sOffsetX = $userOffset()[0]
      sOffsetY = $userOffset()[1]
      window.addEventListener('mousemove', onDrag)
      window.addEventListener('mouseup', onDragEnd)
    }
  }

  return {
    view() {
      return m(
        '.handle',
        {
          onmousedown: onDragStart
        },
        'table of contents'
      )
    }
  }
}

export default Handle
