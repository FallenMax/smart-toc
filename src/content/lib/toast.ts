import { addCSS } from '../util/dom/css'
import toastCSS from './toast.css'

let timers: (number | undefined)[] = []
const TOAST_ID = 'smarttoc-toast'

export const showToast = (message: string) => {
  addCSS(toastCSS, 'smarttoc-toast__css')
  let toast = document.getElementById(TOAST_ID) as HTMLElement
  if (!toast) {
    toast = document.createElement('DIV')
    toast.id = TOAST_ID
    document.body.appendChild(toast)
  }
  toast.textContent = message

  timers.forEach((timer) => window.clearTimeout(timer))

  const set = (classNames: string, delay?: number) => {
    if (delay == null) {
      toast.className = classNames
    } else {
      return window.setTimeout(() => {
        toast.className = classNames
      }, delay)
    }
  }
  timers = [
    set(''),
    set('enter'),
    set('enter enter-active', 0),
    set('leave', 3000),
    set('leave leave-active', 3000),
    set('', 3000 + 200),
  ]
}
