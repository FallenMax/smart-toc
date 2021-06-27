import { createDisposer } from '../util/disposer'
import { addCSS, removeCSS } from '../util/dom/css'
import { addClass, listen } from '../util/dom/el'
import { createEventEmitter } from '../util/event'
import { between } from '../util/math/between'
import draggerCss from './dragger.css'

type Drag = undefined | { startX: number; startY: number }

export type DragOffset = {
  x: number
  y: number
}

type Rect = {
  top: number
  left: number
  right: number
  bottom: number
  height: number
  width: number
}
const IS_DRAGGING_CLASS = 'smarttoc--is-dragging'

type DraggableEvent = {
  dragStateChanged: undefined
}
export type DragOptions = {
  handle: HTMLElement
  container: HTMLElement
  initialOffset?: DragOffset
  onOffsetChange?(offset: DragOffset): void
}

export const createDragger = (options: DragOptions) => {
  /** offset before each drag */
  let startOffset: DragOffset = { x: 0, y: 0 }
  const setStartOffset = (o: DragOffset) => {
    startOffset = o
    options?.onOffsetChange?.(startOffset)
  }
  /** actually rendered offset */
  let currentOffset: DragOffset = { x: 0, y: 0 }
  const setCurrentOffset = (o: DragOffset) => {
    currentOffset = o
    if (!target) return

    const { x, y } = currentOffset
    target.style.transform = `translate(${x}px, ${y}px)`
  }

  let drag: Drag | undefined = undefined
  let originalRect: Rect | undefined = undefined

  let handle: HTMLElement = options.handle
  let target: HTMLElement = options.container

  const getOriginalRect = (forceMeasure = false) => {
    if (!target) {
      return
    }
    if (!forceMeasure && originalRect) {
      return originalRect
    }
    const { left, top, width, height, bottom, right } =
      target.getBoundingClientRect()
    const { x, y } = currentOffset
    originalRect = {
      width,
      height,
      left: left - x,
      right: right - x,
      top: top - y,
      bottom: bottom - y,
    }
    return originalRect
  }
  const getBoundedOffset = (x: number, y: number, forceMeasure = false) => {
    const { left, top, right, bottom } = getOriginalRect(forceMeasure)!
    return {
      x: between(-left, x, window.innerWidth - right),
      y: between(-top, y, window.innerHeight - bottom),
    }
  }

  const mousedown = createDisposer()
  const onMouseDown = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (
      target.nodeName === 'INPUT' ||
      target.nodeName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      return
    }
    drag = {
      startX: e.screenX,
      startY: e.screenY,
    }

    originalRect = getOriginalRect(true)!
    setStartOffset({ ...currentOffset })
    mousedown.R(listen(document, 'mousemove', onMouseMove))
    mousedown.R(listen(document, 'mouseup', onMouseUp))
    mousedown.R(addClass(document.documentElement, IS_DRAGGING_CLASS))
    mousedown.R(() => (drag = undefined))
    instance.emit('dragStateChanged')
  }
  const onMouseMove = (e: MouseEvent) => {
    if (!drag) {
      console.warn('mouseup when not dragging')
    } else {
      const dx = startOffset.x + e.screenX - drag.startX
      const dy = startOffset.y + e.screenY - drag.startY
      const offset = getBoundedOffset(dx, dy)
      setCurrentOffset(offset)
    }
  }
  const onMouseUp = () => {
    setStartOffset({ ...currentOffset })
    mousedown.dispose()
    instance.emit('dragStateChanged')
  }

  const onResize = () => {
    let { x, y } = currentOffset
    const offset = getBoundedOffset(x, y)
    setCurrentOffset(offset)
    setStartOffset(offset)
  }

  const { R, dispose } = createDisposer()

  const instance = {
    ...createEventEmitter<DraggableEvent>(),

    start() {
      R(addCSS(draggerCss, 'smarttoc-dragger-css'))
      R(listen(handle, 'mousedown', onMouseDown))
      R(listen(window, 'resize', onResize))

      const { x, y } = options.initialOffset || { x: 0, y: 0 }
      const initialOffset = getBoundedOffset(x, y, true)
      setCurrentOffset(initialOffset)
      return dispose
    },
  }
  return instance
}
export type Dragger = ReturnType<typeof createDragger>

export type DraggableOptions = DragOptions & {
  handle: HTMLElement
  container: HTMLElement
}
