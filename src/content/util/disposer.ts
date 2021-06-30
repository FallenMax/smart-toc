import { Disposer } from '../types'

export const createDisposer = () => {
  let disposers: Disposer[] = []
  let isDisposed = false
  const R = (cb: Disposer) => {
    if (isDisposed) {
      throw new Error('already disposed')
    }
    disposers.push(cb)
  }
  const dispose = () => {
    if (isDisposed) {
      throw new Error('already disposed')
    }
    isDisposed = true
    disposers.reverse().forEach((d) => d()) // cancel each effect in reverse order
    disposers = []
  }
  return {
    /** record how to undo */
    R,
    dispose,
  }
}

export type Disposable = ReturnType<typeof createDisposer>
