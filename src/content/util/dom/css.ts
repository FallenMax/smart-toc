import { px } from './px'

export function applyStyle(elem: HTMLElement, style = {}, reset = false): void {
  function toDash(str: string): string {
    return str.replace(/([A-Z])/g, (match, p1) => '-' + p1.toLowerCase())
  }
  if (reset) {
    // @ts-ignore
    elem.style = ''
  }
  if (typeof style === 'string') {
    // @ts-ignore
    elem.style = style
  } else {
    for (let prop in style) {
      if (typeof style[prop] === 'number') {
        elem.style.setProperty(toDash(prop), px(style[prop]), 'important')
      } else {
        elem.style.setProperty(toDash(prop), style[prop], 'important')
      }
    }
  }
}

export const addCSS = function(css: string, id: string): () => void {
  let style: HTMLStyleElement
  if (!document.getElementById(id)) {
    style = document.createElement('style')
    style.type = 'text/css'
    style.id = id
    style.textContent = css
    document.head.appendChild(style)
  }
  const removeCSS = () => {
    style.remove()
  }
  return removeCSS
}
