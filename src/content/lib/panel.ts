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

export const createTocPanel = (options: { dom: HTMLElement; toc: Toc }) => {
  return {
    destroy() {},
  }
}

export type TocPanel = ReturnType<typeof createTocPanel>
