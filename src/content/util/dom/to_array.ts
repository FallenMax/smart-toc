export const toArray = <T extends Node>(
  arr: NodeListOf<T> | HTMLCollectionOf<Element>,
): T[] => {
  return [].slice.apply(arr)
}
