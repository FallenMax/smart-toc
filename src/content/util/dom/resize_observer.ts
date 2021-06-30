export const listenResize = (el: HTMLElement, cb: () => void) => {
  let observer: ResizeObserver | undefined = new ResizeObserver(cb)
  observer.observe(el)
  return () => {
    observer?.disconnect()
    observer = undefined
  }
}
