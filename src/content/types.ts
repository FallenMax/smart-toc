export type Rect = {
  top: number
  left: number
  right: number
  bottom: number
  height: number
  width: number
}

export type Article = HTMLElement

export type Scroller = HTMLElement

export type Heading = {
  dom: HTMLElement
  level: number
  text: string
}

export interface Content {
  article: Article
  scroller: Scroller
  headings: Heading[]
}

export interface Offset {
  x: number
  y: number
}

export type Disposer = () => void
