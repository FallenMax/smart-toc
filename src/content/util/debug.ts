export function draw(
  elem: HTMLElement | HTMLElement[] | null | undefined,
  color = 'red',
): void {
  if (elem) {
    if (Array.isArray(elem)) {
      elem.forEach((el) => {
        el.style.outline = '2px solid ' + color
      })
    } else {
      elem.style.outline = '2px solid ' + color
    }
  }
}
