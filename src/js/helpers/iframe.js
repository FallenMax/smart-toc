function getRootWindow() {
  let w = window
  while (w !== w.parent) {
    w = w.parent
  }
  return w
}

function getMaster(root) {
  if (root.frames.length === 0) {
    return root
  } else {
    const largestChild = [].slice.apply(root.document.getElementsByTagName('iframe'))
      .map(f => ({
        elem: f,
        area: f.offsetWidth * f.offsetHeight
      }))
      .sort((a, b) => (b.area - a.area))[0]
    const html = root.document.documentElement
    return largestChild.area / (html.offsetWidth * html.offsetHeight) > 0.5 ?
      largestChild.elem.contentWindow : root
  }
}

export function isMasterFrame(w) {
  const root = getRootWindow()
  const master = getMaster(root)
  return w === master
}
