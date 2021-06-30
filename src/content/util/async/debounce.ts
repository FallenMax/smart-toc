export const debounce = <T extends (...args: any[]) => void>(
  fn: T,
  option: { delay: number; self?: any },
): T => {
  let timer: number | undefined

  const debounced = (...params: any[]) => {
    if (timer) {
      clearTimeout(timer)
      timer = undefined
    }

    timer = window.setTimeout(() => {
      fn.apply(option.self || null, params)
      timer = undefined
    }, option.delay)
  }
  return debounced as T
}
