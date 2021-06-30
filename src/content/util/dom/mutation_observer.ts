export const listenMutation = (el: HTMLElement, cb: () => void) => {
  let observer: MutationObserver | undefined = new MutationObserver(cb)
  observer.observe(el, { attributes: true, childList: true, subtree: true })
  return () => {
    observer?.disconnect()
    observer = undefined
  }
}
