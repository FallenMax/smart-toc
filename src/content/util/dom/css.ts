export const toDash = (str: string) => {
  return str.replace(/([A-Z])/g, (match, p1) => '-' + p1.toLowerCase())
}

export const setStyle = (
  elem: HTMLElement,
  style: Partial<CSSStyleDeclaration> | string | undefined,
  important = true,
) => {
  if (style == null) {
    elem.removeAttribute('style')
    return
  }
  if (typeof style === 'string') {
    elem.setAttribute('style', style)
    return
  }

  for (let prop in style) {
    elem.style.setProperty(
      toDash(prop),
      style[prop] ?? null,
      important ? 'important' : undefined,
    )
  }
}

export const addCSS = (css: string, cssId: string) => {
  let style = document.getElementById(cssId)
  if (!style) {
    style = document.createElement('style')
    style.id = cssId
    style.textContent = css
    document.head.appendChild(style)
  }
  return () => {
    style?.remove()
  }
}

// '12px','12' => 12
export const fromPx = (size: string): number => {
  return +size.replace(/px/, '')
}

// 12 => '12px'
export const toPx = (size: number): string => {
  if (typeof size === 'number') {
    return size + 'px'
  } else {
    return size
  }
}
