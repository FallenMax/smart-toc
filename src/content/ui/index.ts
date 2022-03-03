import m from 'mithril'
import tocCSS from '../style/toc.css'
import { Article, Heading, Offset, Scroller } from '../types'
import { addCSS } from '../util/dom/css'
import { Stream } from '../util/stream'
import { Handle } from './handle'
import { TocContent } from './toc_content'

const ROOT_ID = 'smarttoc-wrapper'
const CSS_ID = 'smarttoc__css'

const calcPlacement = function (article: Article): 'left' | 'right' {
  const { left, right } = article
  const winWidth = window.innerWidth
  const panelMinWidth = 250
  const spaceRight = winWidth - right
  const spaceLeft = left
  const gap = 80
  return spaceRight < panelMinWidth + gap && spaceLeft > panelMinWidth + gap
    ? 'left'
    : 'right'
}

const calcStyle = function (options: {
  article: Article
  scroller: Scroller
  offset: Offset
  topMargin: number
  placement: 'left' | 'right'
}): Partial<CSSStyleDeclaration> {
  const { article, scroller, offset, topMargin } = options

  //-------------- x --------------
  const { left, right } = article
  const winWidth = window.innerWidth
  const winHeight = window.innerHeight
  const panelMinWidth = 250
  const gap = 30

  // just make it in right bottom corner
  const x = winWidth - gap - panelMinWidth
  // const x =
  //   options.placement === 'left'
  //     ? Math.max(0, left - gap - panelMinWidth) // place at left
  //     : Math.min(right + gap, winWidth - panelMinWidth) // place at right

  //-------------- y --------------
  const scrollableTop = scroller.dom === document.body ? 0 : scroller.rect.top

  // just make it in right bottom corner
  const y = winHeight - gap - scrollableTop 
  // const y = Math.max(scrollableTop, topMargin) + 50

  // const style = {
  //   left: `${x + offset.x}px`,
  //   top: `${y + offset.y}px`,
  //   maxHeight: `calc(100vh - ${Math.max(scrollableTop, topMargin)}px - 50px)`,
  // }

  // just make it in right bottom corner
  const style = {
    right: `${gap - offset.x}px`,
    bottom: `${gap - offset.y}px`,
    // maxHeight: `250px`,
  }

  return style
}

export const ui = {
  render: (options: {
    $isShown: Stream<boolean>
    $offset: Stream<{ x: number; y: number }>
    $article: Stream<Article>
    $scroller: Stream<Scroller>
    $headings: Stream<Heading[]>
    $activeHeading: Stream<number>
    $topbarHeight: Stream<number>
    onDrag(offset: Offset): void
    onScrollToHeading(index: number): Promise<void>
  }) => {
    const {
      $isShown,
      $offset,
      $article,
      $scroller,
      $headings,
      $activeHeading,
      $topbarHeight,
      onDrag,
      onScrollToHeading,
    } = options

    const $redraw = Stream.merge(
      $isShown,
      $offset,
      $article,
      $scroller,
      $headings,
      $activeHeading,
      $topbarHeight,
    ).log('redraw')

    let root = document.getElementById(ROOT_ID)
    if (!root) {
      root = document.body.appendChild(document.createElement('DIV'))
      root.id = ROOT_ID
    }
    addCSS(tocCSS, CSS_ID)

    const isTooManyHeadings = () =>
      $headings().filter((h) => h.level <= 2).length > 50

    let initialPlacement: 'left' | 'right'

    m.mount(root, {
      view() {
        if (
          !$isShown() ||
          !$article() ||
          !$scroller() ||
          !($headings() && $headings().length)
        ) {
          return null
        }
        if (!initialPlacement) {
          // initialPlacement = calcPlacement($article())
          // set default placement to right
          initialPlacement = 'right'
        }

        return m(
          'nav#smarttoc',
          {
            class: isTooManyHeadings() ? 'lengthy' : '',
            style: calcStyle({
              article: $article(),
              scroller: $scroller(),
              offset: $offset(),
              topMargin: $topbarHeight() || 0,
              placement: initialPlacement,
            }),
          },
          [
            m(Handle, {
              userOffset: $offset(),
              onDrag,
            }),
            m(TocContent, {
              article: $article(),
              headings: $headings(),
              activeHeading: $activeHeading(),
              onScrollToHeading,
            }),
          ],
        )
      },
    })

    $redraw.subscribe(() => m.redraw())
  },

  dispose: () => {
    const root = document.getElementById(ROOT_ID)
    if (root) {
      m.mount(root, null)
      root.remove()
    }
  },
}
