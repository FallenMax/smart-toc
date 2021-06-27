import { addCSS, removeCSS } from '../util/dom/css'
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

  let handle: HTMLElement | undefined = options.handle
  let target: HTMLElement | undefined = options.container

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
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    document.documentElement.classList.add(IS_DRAGGING_CLASS)
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
    drag = undefined

    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    document.documentElement.classList.remove(IS_DRAGGING_CLASS)
    instance.emit('dragStateChanged')
  }

  const onResize = () => {
    const { left, top, right, bottom } = getOriginalRect(true)!

    let { x, y } = currentOffset
    const offset = getBoundedOffset(x, y)
    setCurrentOffset(offset)
    setStartOffset(offset)
  }

  const destroy = () => {
    handle?.removeEventListener('mousedown', onMouseDown)
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    window.removeEventListener('resize', onResize)
    target = undefined
    handle = undefined
    removeCSS('smarttoc-dragger-css')
  }

  const instance = {
    ...createEventEmitter<DraggableEvent>(),

    start() {
      addCSS(draggerCss, 'smarttoc-dragger-css')
      handle!.addEventListener('mousedown', onMouseDown)
      window.addEventListener('resize', onResize)

      const { x, y } = options.initialOffset || { x: 0, y: 0 }
      const initialOffset = getBoundedOffset(x, y, true)
      setCurrentOffset(initialOffset)
      return destroy
    },
  }
  return instance
}
export type Dragger = ReturnType<typeof createDragger>

export type DraggableOptions = DragOptions & {
  handle: HTMLElement
  container: HTMLElement
}
