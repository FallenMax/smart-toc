import m from 'mithril'
import { Offset } from '../types'

type MithrilEvent = {
  redraw?: boolean
}

const stop = (e: Event) => {
  e.stopPropagation()
  e.preventDefault()
}

export interface HandleAttrs {
  userOffset: Offset
  onDrag(userOffset: Offset): void
}
export const Handle: m.FactoryComponent<HandleAttrs> = (vnode) => {
  let dragStart: Offset = { x: 0, y: 0 }
  let offset = { x: 0, y: 0 }

  const onDrag = (e: MouseEvent & MithrilEvent) => {
    stop(e)
    const [dX, dY] = [e.clientX - dragStart.x, e.clientY - dragStart.y]
    vnode.attrs.onDrag({ x: offset.x + dX, y: offset.y + dY })
  }

  const onDragEnd = (e: MouseEvent & MithrilEvent) => {
    window.removeEventListener('mousemove', onDrag)
    window.removeEventListener('mouseup', onDragEnd)
  }

  const onDragStart = (
    e: MouseEvent & MithrilEvent,
    vnode: m.Vnode<HandleAttrs>,
  ) => {
    if (e.button === 0) {
      stop(e)
      dragStart = {
        x: e.clientX,
        y: e.clientY,
      }
      offset = {
        ...vnode.attrs.userOffset,
      }
      window.addEventListener('mousemove', onDrag)
      window.addEventListener('mouseup', onDragEnd)
      m.redraw()
    }
  }

  return {
    view(vnode) {
      return m(
        '.handle',
        {
          onmousedown(e) {
            onDragStart(e, vnode)
          },
        },
        'table of contents',
      )
    },
  }
}
