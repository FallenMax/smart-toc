export const appendChild = (parent: HTMLElement, child: HTMLElement) => {
  parent.appendChild(child)
  return () => {
    parent.removeChild(child)
  }
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  id: string,
): HTMLElementTagNameMap[K]
export function createElement(tagName: string, id: string): HTMLElement
export function createElement(tagName: string, id: string) {
  const $el = document.createElement(tagName)
  $el.id = id
  return $el
}
