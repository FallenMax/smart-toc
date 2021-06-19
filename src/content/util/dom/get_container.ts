export const getContainer = (id: string) => {
  let el = document.getElementById(id)
  if (!el) {
    el = document.createElement('div')
    document.body.append(el)
  }
  return el
}
