export const getContainer = (id: string) => {
  let el = document.getElementById(id)
  if (!el) {
    el = document.createElement('div')
    el.id = id
    document.body.append(el)
  }
  return el
}
