export type Rect = {
  top: number
  left: number
  right: number
  bottom: number
  height: number
  width: number
}

export interface Article {
  dom: HTMLElement
  fromScrollerTop: number
  left: number
  right: number
  height: number
}

export interface Scroller {
  dom: HTMLElement
  rect: Rect
}

export interface Heading {
  dom: HTMLElement
  level: number
  text: string
  id: number
  anchor?: string
  fromArticleTop?: number
}

export interface Content {
  article: Article
  scroller: Scroller
  headings: Heading[]
}

export enum Theme {
  Light = 'light',
  Dark = 'dark',
}

export interface Offset {
  x: number
  y: number
}
