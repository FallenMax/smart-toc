import { Content } from '../types'
import { createDisposer } from '../util/disposer'
import { addCSS } from '../util/dom/css'
import { appendChild, createElement } from '../util/dom/el'
import { noop } from '../util/noop'
import { createDragger, DragOffset } from './dragger'
import panelCss from './panel.css'
import { enterReadable } from './readable'
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
  const { record, dispose } = createDisposer()

  const instance = {
    start() {
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
      record(toc.start($toc))

      let leaveReadable = noop
      const applyReadableMode = (content: Content | undefined) => {
        if (content) {
          leaveReadable()
          leaveReadable = enterReadable(content)
        } else {
          leaveReadable()
        }
        return () => leaveReadable()
      }

      record(toc.on('contentChanged', applyReadableMode))
      record(applyReadableMode(toc.getContent()))
      return dispose
    },
  }

  return instance
}

export type TocPanel = ReturnType<typeof createTocPanel>
