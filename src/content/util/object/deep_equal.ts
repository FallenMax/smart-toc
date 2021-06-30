import { type } from './simple_type'

export const isDeepEqual = (
  a: any,
  b: any,
  options?: {
    ignoreEmptyKey?: boolean
    ignoreFunction?: boolean
  },
): boolean => {
  if (a === b) return true

  const { ignoreEmptyKey = false, ignoreFunction = false } = options || {}

  const typeA = type(a)
  const typeB = type(b)
  if (typeA !== typeB) {
    return false
  }

  if (typeA === 'array') {
    return (
      a.length === b.length &&
      a.every((item: any, i: number) =>
        isDeepEqual(item, b[i], {
          ignoreEmptyKey,
          ignoreFunction,
        }),
      )
    )
  }

  if (typeA === 'object') {
    const keysA = Object.keys(a)
      .sort()
      .filter((key) => !(a[key] === undefined && ignoreEmptyKey))
    const keysB = Object.keys(b)
      .sort()
      .filter((key) => !(b[key] === undefined && ignoreEmptyKey))
    return (
      keysA.length === keysB.length &&
      keysA.every((keyA, i) => {
        const keyB = keysB[i]
        return (
          keyA === keyB &&
          isDeepEqual(a[keyA], b[keyB], {
            ignoreEmptyKey,
            ignoreFunction,
          })
        )
      })
    )
  }

  if (typeA === 'date') {
    return (a as Date).getTime() === (b as Date).getTime()
  }

  if (typeA === 'function' && ignoreFunction) {
    return true
  }

  // NaN
  if (a !== a && b !== b) return true

  return a === b
}
