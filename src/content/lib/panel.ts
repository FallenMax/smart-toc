import { Content } from '../types'
import { addCSS, removeCSS } from '../util/dom/css'
import { createDragger, Dragger, DragOffset } from './dragger'
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
  let isDestroyed = false
  let $panel: HTMLElement | undefined
  let $toc: HTMLElement | undefined
  let $handle: HTMLElement | undefined
  let dragger: Dragger | undefined

  const instance = {
    initialize() {
      if (isDestroyed || $panel) {
        return
      }

      addCSS(panelCss, 'smarttoc-panel-css')
      addCSS(tocCss, 'smarttoc-toc-css')

      $panel = document.createElement('nav')
      $panel.id = 'smarttoc-panel'
      container.appendChild($panel)

      $handle = document.createElement('div')
      $handle.id = 'smarttoc-handle'
      $handle.textContent = 'table of contents'
      $panel.appendChild($handle)
      dragger = createDragger({
        handle: $handle,
        container: $panel,
        initialOffset: lastOffset,
        onOffsetChange(offset) {
          lastOffset = offset
        },
      })
      dragger.start()

      $toc = document.createElement('div')
      $toc.id = 'smarttoc'
      $panel.appendChild($toc)

      const measurement = toc.getMeasurements()

      toc.render($toc)

      const applyReadableMode = (content: Content | undefined) => {
        if (content) {
          enterReadable(content)
        } else {
          leaveReadable()
        }
      }
      toc.on('contentChanged', applyReadableMode)
      applyReadableMode(toc.getContent())
    },
    destroy() {
      if (isDestroyed) {
        return
      }
      isDestroyed = true

      if ($panel) {
        $panel.remove()
        $panel = undefined
        leaveReadable()
        removeCSS('smarttoc-panel-css')
        removeCSS('smarttoc-toc-css')
        dragger?.destroy()
        dragger = undefined
      }
    },
  }

  instance.initialize()

  return instance
}

export type TocPanel = ReturnType<typeof createTocPanel>
