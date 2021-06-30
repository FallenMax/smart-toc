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
  index: number
  dom: HTMLElement
  level: number
  text: string
}

export type HeadingNode = {
  heading?: Heading | undefined
  children?: HeadingNode[]
}

export interface Content {
  article: Article
  scroller: Scroller
  headings: Heading[]
}

export type Measurements = {
  articleRect: Rect
  scrollerRect: Rect
  /** scroll position when measured  */
  scrollY: number
  headingRects: Rect[]
}

export interface Offset {
  x: number
  y: number
}

export type Disposer = () => void
