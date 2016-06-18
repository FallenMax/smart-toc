window.updateHistory = (function() {
  let history =
    `
0.2.1:
1. Minimal UI (removed shadow/radius)
2. Adds support for sites like *.github.io
(for nerds: they scrolls an article container instead of whole window)

0.2.5:
1. Better article extraction algorithm
2. Works on sites using iframe
3. Fix: cannot scroll to bottom on some sites
3. Smaller font size
`

  return history.split(/\n\n+/).filter(Boolean)
    .map(s => s.split(/\n/).filter(Boolean))
    .map(([version, ...message]) => ({
      [version.replace(':', '')]: message.join('\n')
    }))
    .reduce((prev, cur) => Object.assign(prev, cur), {})

})()
