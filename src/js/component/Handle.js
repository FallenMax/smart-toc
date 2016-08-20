import { throttle } from '../helpers/util'


const Handle = function({ $userOffset }) {
  const handleUserDrag = function(handle, $userOffset) {
    let [sClientX, sClientY] = [0, 0]
    let [sOffsetX, sOffsetY] = [0, 0]
    const stop = e => {
      e.stopPropagation()
      e.preventDefault()
    }
    const onMouseMove = throttle(e => {
      stop(e)
      let [dX, dY] = [e.clientX - sClientX, e.clientY - sClientY]
      $userOffset([sOffsetX + dX, sOffsetY + dY])
    })
    handle.addEventListener('mousedown', e => {
      if (e.button === 0) {
        stop(e)
        sClientX = e.clientX
        sClientY = e.clientY
        sOffsetX = $userOffset()[0]
        sOffsetY = $userOffset()[1]
        window.addEventListener('mousemove', onMouseMove)
      }
    })
    window.addEventListener('mouseup', () => {
      window.removeEventListener('mousemove', onMouseMove)
    })
  }

  let handle = document.createElement('DIV')
  handle.textContent = 'table of contents'
  handle.classList.add('handle')
  handleUserDrag(handle, $userOffset)
  return handle
}


export default Handle
