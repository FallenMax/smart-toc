export const depthOfElement = (elem: HTMLElement): number => {
  let depth = 1
  while (elem) {
    if (!elem.parentElement) {
      return depth
    }
    elem = elem.parentElement
    depth++
  }
  return depth
}

export const depthOfPoint = ([x, y]: [number, number]): number => {
  const elem = document.elementFromPoint(x, y) as HTMLElement
  return elem ? depthOfElement(elem) : 0
}
