import m from 'mithril'
import { Toc } from './toc'

let offset = {
  x: 0,
  y: 0,
}

/**
 * draggable container, with default position
 */
export const TocPanel: m.FactoryComponent<{
  article: HTMLElement
  onDispose(): void
}> = () => {
  return {
    oninit(vnode) {},
    view() {
      return
    },
  }
}

export const createTocPanel = (options: { dom: HTMLElement; toc: Toc }) => {
  return {
    destroy() {},
  }
}

export type TocPanel = ReturnType<typeof createTocPanel>
