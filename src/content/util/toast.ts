import toastCSS from '../style/toast.css'
import { addCSS } from './dom/css'

function setClass(
  elem: HTMLElement,
  names: string,
  delay?: number,
): number | undefined {
  if (delay == null) {
    elem.className = names
  } else {
    return window.setTimeout(() => {
      elem.className = names
    }, delay)
  }
}

let timers: (number | undefined)[] = []
export function showToast(msg: string) {
  addCSS(toastCSS, 'smarttoc-toast__css')
  const set = (classNames: string, delay?: number) => {
    return setClass(toast!, classNames, delay)
  }
  let toast = document.getElementById('smarttoc-toast') as HTMLElement | null
  if (!toast) {
    toast = document.createElement('DIV')
    toast.id = 'smarttoc-toast'
    document.body.appendChild(toast)
  }
  toast.textContent = msg

  timers.forEach(window.clearTimeout)

  set('')
  set('enter')
  timers = [
    set('enter enter-active', 0),
    set('leave', 3000),
    set('leave leave-active', 3000),
    set('', 3000 + 200),
  ]
}
