export const fromArrayLike = <T>(arr: ArrayLike<T>): T[] => {
  return [].slice.apply(arr)
}
