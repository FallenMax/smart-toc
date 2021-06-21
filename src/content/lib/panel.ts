import { Toc } from './toc'

let offset = {
  x: 0,
  y: 0,
}

/**
 * floating toc panel
 *
 * - draggable
 * - remembers position between show/hide
 * - scroll to active heading if out of view
 * - auto-pick where to place panel
 */

export const createTocPanel = ({ toc }: { toc: Toc }) => {
  let isDestroyed = false
  let $panel: HTMLElement | undefined
  let $toc: HTMLElement | undefined
  let $handle: HTMLElement | undefined

  const instance = {
    initialize() {},
    render(container: HTMLElement) {
      if (isDestroyed || $panel) {
        return
      }

      $panel = document.createElement('nav')
      $panel.id = 'smarttoc'
      container.appendChild($panel)

      $toc = document.createElement('div')
      container.appendChild($toc)
      toc.render($toc)

      $handle = document.createElement('div')
      container.appendChild($handle)
      // TODO handle
    },
    destroy() {
      if (isDestroyed) {
        return
      }
      isDestroyed = true
      if ($panel) {
        $panel.remove()
      }
    },
  }

  instance.initialize()

  return instance
}

export type TocPanel = ReturnType<typeof createTocPanel>
