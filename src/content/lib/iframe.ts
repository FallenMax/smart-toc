const getIframes = (wnd: Window): HTMLIFrameElement[] => {
  let iframes: HTMLIFrameElement[] = []
  try {
    iframes = [].slice.apply(wnd.document.getElementsByTagName('iframe'))
  } catch (error) {
    // ignore
  }
  return iframes.reduce((prev, curIframe) => {
    const curWindow = curIframe.contentWindow
    return prev.concat(curIframe, curWindow ? getIframes(curWindow) : [])
  }, [] as HTMLIFrameElement[])
}

export const getContentWindow = (): Window => {
  const rootWindow = window.top

  const allIframes = getIframes(rootWindow)

  const allIframesWithArea = allIframes
    .map((iframe) => {
      return {
        iframe: iframe,
        area: iframe.offsetWidth * iframe.offsetHeight,
      }
    })
    .sort((a, b) => b.area - a.area)

  if (allIframesWithArea.length === 0) {
    return rootWindow
  }
  const largest = allIframesWithArea[0]

  const rootDocument = rootWindow.document.documentElement
  const rootArea = rootDocument.offsetWidth * rootDocument.offsetHeight

  return largest.area > rootArea * 0.5
    ? largest.iframe.contentWindow || rootWindow
    : rootWindow
}
