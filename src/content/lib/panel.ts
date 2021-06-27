import { Content, Disposer } from '../types'
import { addCSS } from '../util/dom/css'
import { appendChild, createElement } from '../util/dom/el'
import { createDragger, DragOffset } from './dragger'
import panelCss from './panel.css'
import { enterReadable, leaveReadable } from './readable'
import { Toc } from './toc'
import tocCss from './toc.css'

let lastOffset: DragOffset = {
  x: 0,
  y: 0,
}

const calcPlacement = (article): 'left' | 'right' => {
  const { left, right } = article
  const winWidth = window.innerWidth
  const panelMinWidth = 250
  const spaceRight = winWidth - right
  const spaceLeft = left
  const gap = 80
  return spaceRight < panelMinWidth + gap && spaceLeft > panelMinWidth + gap
    ? 'left'
    : 'right'
}

/**
 * floating toc panel
 *
 * - draggable
 * - remembers position between show/hide
 * - scroll to active heading if out of view
 * - auto-pick where to place panel
 */

export const createTocPanel = ({
  container,
  toc,
}: {
  container: HTMLElement
  toc: Toc
}) => {
  let disposers: Disposer[] = []
  const record = (cb: Disposer) => disposers.push(cb)
  const dispose = () => {
    disposers.reverse().forEach((d) => d()) // cancel each effect in reverse order
    disposers = []
  }

  const instance = {
    initialize() {
      record(addCSS(panelCss, 'smarttoc-panel-css'))
      record(addCSS(tocCss, 'smarttoc-toc-css'))

      const $panel = createElement('nav', 'smarttoc-panel')
      record(appendChild(container, $panel))

      const $handle = createElement('div', 'smarttoc-handle')
      $handle.textContent = 'table of contents'
      record(appendChild($panel, $handle))

      const dragger = createDragger({
        handle: $handle,
        container: $panel,
        initialOffset: lastOffset,
        onOffsetChange(offset) {
          lastOffset = offset
        },
      })
      record(dragger.start())

      const $toc = createElement('div', 'smarttoc')
      record(appendChild($panel, $toc))
      record(toc.render($toc))

      const applyReadableMode = (content: Content | undefined) => {
        if (content) {
          enterReadable(content)
        } else {
          leaveReadable()
        }
        return () => leaveReadable()
      }

      record(toc.on('contentChanged', applyReadableMode))
      record(applyReadableMode(toc.getContent()))
    },
    destroy() {
      dispose()
    },
  }

  instance.initialize()

  return instance
}

export type TocPanel = ReturnType<typeof createTocPanel>
