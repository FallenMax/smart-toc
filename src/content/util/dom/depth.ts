export type Point = [number, number]

export const depthOf = function(elem: HTMLElement | null): number | undefined {
  if (!elem) return undefined

  let depth = 0
  while (elem) {
    elem = elem.parentElement
    depth++
  }
  return depth
}

export const depthOfPoint = function([x, y]: Point): number | undefined {
  const elem = document.elementFromPoint(x, y)
  return elem ? depthOf(elem as HTMLElement) : undefined
}
