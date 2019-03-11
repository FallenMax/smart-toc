import m from 'mithril'
import tocCSS from '../style/toc.css'
import { addCSS } from '../util/dom/css'
import { Stream } from '../util/stream'
import { Offset, Heading, Article, Scroller } from '../types'
import { Handle } from './handle'
import { TocContent } from './toc_content'

const ROOT_ID = 'smarttoc-wrapper'
const CSS_ID = 'smarttoc__css'

function translate3d(x = 0, y = 0, z = 0): string {
  return `translate3d(${Math.round(x)}px, ${Math.round(y)}px, ${Math.round(
    z,
  )}px)`
}

const calcStyle = function(options: {
  article: Article
  scroller: Scroller
  offset: Offset
  topMargin: number
}): Partial<CSSStyleDeclaration> {
  const { article, scroller, offset, topMargin } = options

  //-------------- x --------------
  const { left, right } = article
  const winWidth = window.innerWidth
  const panelMinWidth = 250
  const spaceRight = winWidth - right
  const spaceLeft = left
  const gap = 80
  const x =
    spaceRight < panelMinWidth + gap && spaceLeft > panelMinWidth + gap
      ? Math.max(0, left - gap - panelMinWidth) // place at left
      : Math.min(right + gap, winWidth - panelMinWidth) // place at right

  //-------------- y --------------
  const scrollableTop = scroller.dom === document.body ? 0 : scroller.rect.top
  const y = Math.max(scrollableTop, topMargin) + 50

  const style = {
    transform: translate3d(x + offset.x, y + offset.y),
    maxHeight: `calc(100vh - ${y}px - 50px)`,
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

    const $redraw = Stream.merge([
      Stream.merge([$isShown, $offset, $article, $scroller]),
      Stream.merge([$headings, $activeHeading, $topbarHeight]),
    ]).log('redraw')

    let root = document.getElementById(ROOT_ID)
    if (!root) {
      root = document.body.appendChild(document.createElement('DIV'))
      root.id = ROOT_ID
    }
    addCSS(tocCSS, CSS_ID)

    const isTooManyHeadings = () =>
      $headings().filter((h) => h.level <= 2).length > 50

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
        return m(
          'nav#smarttoc',
          {
            class: isTooManyHeadings() ? 'lengthy' : '',
            style: calcStyle({
              article: $article(),
              scroller: $scroller(),
              offset: $offset(),
              topMargin: $topbarHeight() || 0,
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
