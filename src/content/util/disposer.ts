import { Disposer } from '../types'

export const createDisposer = () => {
  let disposers: Disposer[] = []
  const R = (cb: Disposer) => disposers.push(cb)
  const dispose = () => {
    disposers.reverse().forEach((d) => d()) // cancel each effect in reverse order
    disposers = []
  }
  return {
    /** record how to undo */
    R,
    dispose,
  }
}
