import { Disposer } from '../../types'

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

export function listen<K extends keyof WindowEventMap>(
  target: Node | Window,
  type: K,
  listener: (this: Window, ev: WindowEventMap[K]) => any,
  options?: boolean | AddEventListenerOptions,
): Disposer
export function listen(
  target: Node | Window,
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
) {
  target.addEventListener(type, listener, options)
  return () => {
    target.removeEventListener(type, listener, options)
  }
}

export const addClass = (element: Element, className: string) => {
  element.classList.add(className)
  return () => {
    element.classList.remove(className)
  }
}
