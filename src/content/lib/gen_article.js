const random = (minOrMax = 100, max) => {
  if (typeof max === 'number') {
    return Math.floor(minOrMax + Math.random() * (max - minOrMax))
  } else {
    return Math.floor(Math.random() * minOrMax)
  }
}

const genText = (name = 'text') => {
  return `${name} random stuff ${random(1000)}. `.repeat(random(1, 10))
}

const genParagraphs = (max = 10) => {
  const ps = []
  for (let count = random(1, max); count >= 0; count--) {
    ps.push(m('p', genText()))
  }
  return ps
}
const genHeadings = (tags = ['h2', 'h3', 'h4'], max = 7, level = 1) => {
  const [first, ...rest] = tags
  if (first) {
    return [].concat(
      ...Array(random(1, max))
        .fill()
        .map(() => {
          return [
            { tag: first, level, text: genText(`${level}-${first}`) },
            ...genHeadings(rest, max, level + 1),
          ]
        }),
    )
  } else {
    return []
  }
}
const Headings = () => {
  return {
    view({ attrs: { tags, headings } }) {
      return headings.map((heading) => {
        return [
          m(heading.tag, heading.text),
          heading.level === tags.length ? genParagraphs() : undefined,
        ]
      })
    },
  }
}

export { random, headings, genHeadings, Headings }
