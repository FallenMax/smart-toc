import { Stream } from './util/stream'
import { createEventEmitter } from './util/event'
import { getScrollElement, smoothScroll, getScrollTop } from './lib/scroll'
import { extractHeadings } from './lib/extract'
import { ui } from './ui/index'
import { Article, Scroller, Content, Heading } from './types'
import { enterReadableMode, leaveReadableMode } from './lib/readable'

export interface TocPreference {
  offset: {
    x: number
    y: number
  }
}

export interface TocEvents {
  error: {
    reason: string
  }
}

function activeHeadingStream({
  scroller,
  $isShown,
  $content,
  $topbarHeight,
  addDisposer,
}: {
  scroller: HTMLElement
  $isShown: Stream<boolean>
  $content: Stream<Content>
  $topbarHeight: Stream<number>
  addDisposer: (unsub: () => void) => number
}) {
  const calcActiveHeading = ({
    article,
    scroller,
    headings,
    topbarHeight,
  }: {
    article: Article
    scroller: Scroller
    headings: Heading[]
    topbarHeight: number
  }): number => {
    const visibleAreaHeight = Math.max(topbarHeight, scroller.rect.top)
    const scrollY = getScrollTop(scroller.dom)

    let i = 0
    for (; i < headings.length; i++) {
      const heading = headings[i]
      const headingRectTop =
        scroller.rect.top -
        scrollY +
        article.fromScrollerTop +
        heading.fromArticleTop!
      const isCompletelyVisible = headingRectTop >= visibleAreaHeight + 15
      if (isCompletelyVisible) {
        break
      }
    }
    // the 'nearly-visible' heading (headings[i-1]) is the current heading
    const curIndex = Math.max(0, i - 1)
    return curIndex
  }

  const $scroll = Stream.fromEvent(
    scroller === document.body ? window : scroller,
    'scroll',
    addDisposer,
  )
    .map(() => null)
    .startsWith(null)
    .log('scroll')

  const $activeHeading: Stream<number> = Stream.combine([
    $content,
    $topbarHeight,
    $scroll,
    $isShown,
  ])
    .filter(() => $isShown())
    .map(([content, topbarHeight, _]) => {
      const { article, scroller, headings } = content
      if (!(headings && headings.length)) {
        return 0
      } else {
        return calcActiveHeading({
          article,
          scroller,
          headings,
          topbarHeight: topbarHeight || 0,
        })
      }
    })

  return $activeHeading
}

function contentStream({
  $isShown,
  $periodicCheck,
  $triggerContentChange,
  article,
  scroller,
  addDisposer,
}: {
  article: HTMLElement
  scroller: HTMLElement
  $triggerContentChange: Stream<null>
  $isShown: Stream<boolean>
  $periodicCheck: Stream<null>
  addDisposer: (unsub: () => void) => number
}) {
  const $resize = Stream.fromEvent(window, 'resize', addDisposer)
    .throttle(100)
    .log('resize')

  const $content: Stream<Content> = Stream.merge([
    $triggerContentChange,
    $isShown,
    $resize,
    $periodicCheck,
  ])
    .filter(() => $isShown())
    .map(
      (): Content => {
        const articleRect = article.getBoundingClientRect()
        const scrollerRect =
          scroller === document.body || scroller === document.documentElement
            ? {
                left: 0,
                right: window.innerWidth,
                top: 0,
                bottom: window.innerHeight,
                height: window.innerHeight,
                width: window.innerWidth,
              }
            : scroller.getBoundingClientRect()
        const headings = extractHeadings(article)
        const scrollY = getScrollTop(scroller)
        const headingsMeasured = headings.map((h) => {
          const headingRect = h.dom.getBoundingClientRect()
          return {
            ...h,
            fromArticleTop: headingRect.top - articleRect.top,
          }
        })
        return {
          article: {
            dom: article,
            fromScrollerTop:
              article === scroller
                ? 0
                : articleRect.top - scrollerRect.top + scrollY,
            left: articleRect.left,
            right: articleRect.right,
            height: articleRect.height,
          },
          scroller: {
            dom: scroller,
            rect: scrollerRect,
          },
          headings: headingsMeasured,
        }
      },
    )

  return $content
}

function topbarStream($triggerTopbarMeasure: Stream<HTMLElement>) {
  const getTopbarHeight = (targetElem: HTMLElement): number => {
    const findFixedParent = (elem: HTMLElement | null) => {
      const isFixed = (elem: HTMLElement) => {
        let { position, zIndex } = window.getComputedStyle(elem)
        return position === 'fixed' && zIndex
      }
      while (elem && elem !== document.body && !isFixed(elem)) {
        elem = elem.parentElement
      }
      return elem === document.body ? null : elem
    }

    const { top, left, right, bottom } = targetElem.getBoundingClientRect()
    const leftTopmost = document.elementFromPoint(left + 1, top + 1)
    const rightTopmost = document.elementFromPoint(right - 1, top + 1)
    const leftTopFixed =
      leftTopmost && findFixedParent(leftTopmost as HTMLElement)
    const rightTopFixed =
      rightTopmost && findFixedParent(rightTopmost as HTMLElement)

    if (leftTopFixed && rightTopFixed && leftTopFixed === rightTopFixed) {
      return leftTopFixed.offsetHeight
    } else {
      return 0
    }
  }

  const $topbarHeightMeasured: Stream<number> = $triggerTopbarMeasure
    .throttle(50)
    .map((elem) => getTopbarHeight(elem))
    .unique()
    .log('topbarHeightMeasured')

  const $topbarHeight: Stream<number> = $topbarHeightMeasured.scan(
    (height, measured) => Math.max(height, measured),
    0 as number,
  )
  return $topbarHeight
}

export function createToc(options: {
  article: HTMLElement
  preference: TocPreference
}) {
  const article = options.article
  const scroller = getScrollElement(article)

  //-------------- Helpers --------------
  const disposers: (() => void)[] = []
  const addDisposer = (dispose: () => void) => disposers.push(dispose)
  const emitter = createEventEmitter<TocEvents>()

  //-------------- Triggers --------------
  const $triggerTopbarMeasure = Stream<HTMLElement>().log(
    'triggerTopbarMeasure',
  )
  const $triggerContentChange = Stream<null>(null).log('triggerContentChange')
  const $triggerIsShown = Stream<boolean>().log('triggerIsShown')
  const $periodicCheck = Stream.fromInterval(1000 * 60, addDisposer).log(
    'check',
  )

  //-------------- Observables --------------
  const $isShown = $triggerIsShown.unique().log('isShown')

  const $topbarHeight = topbarStream($triggerTopbarMeasure).log('topbarHeight')

  const $content = contentStream({
    $triggerContentChange,
    $periodicCheck,
    $isShown,
    article,
    scroller,
    addDisposer,
  }).log('content')

  const $activeHeading: Stream<number> = activeHeadingStream({
    scroller,
    $isShown,
    $content,
    $topbarHeight,
    addDisposer,
  }).log('activeHeading')

  const $offset = Stream<TocPreference['offset']>(
    options.preference.offset,
  ).log('offset')

  const $readableMode = Stream.combine([
    $isShown.unique(),
    $content.map((c) => c.article.height).unique(),
    $content.map((c) => c.scroller.rect.height).unique(),
    $content.map((c) => c.headings.length).unique(),
  ])
    .map(([isShown]) => isShown)
    .log('readable')

  //-------------- Effects --------------
  const scrollToHeading = (headingIndex: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const { headings, scroller } = $content()
      const topbarHeight = $topbarHeight()
      const heading = headings[headingIndex]
      if (heading) {
        smoothScroll({
          target: heading.dom,
          scroller: scroller.dom,
          topMargin: topbarHeight || 0 + 10,
          callback() {
            $triggerTopbarMeasure(heading.dom)
            resolve()
          },
        })
      } else {
        resolve()
      }
    })
  }

  $readableMode.subscribe((enableReadableMode) => {
    if (enableReadableMode) {
      enterReadableMode($content(), { topbarHeight: $topbarHeight() })
    } else {
      leaveReadableMode()
    }
    $triggerContentChange(null)
  })

  const validate = (content: Content): void => {
    const { article, headings, scroller } = content
    const isScrollerValid =
      document.documentElement === scroller.dom ||
      document.documentElement.contains(scroller.dom)
    const isArticleValid =
      scroller.dom === article.dom || scroller.dom.contains(article.dom)
    const isHeadingsValid =
      headings.length &&
      article.dom.contains(headings[0].dom) &&
      article.dom.contains(headings[headings.length - 1].dom)
    const isValid = isScrollerValid && isArticleValid && isHeadingsValid
    if (!isValid) {
      emitter.emit('error', { reason: 'Article Changed' })
    }
  }
  $content.subscribe(validate)

  ui.render({
    $isShown,
    $article: $content.map((c) => c.article),
    $scroller: $content.map((c) => c.scroller),
    $headings: $content.map((c) => c.headings),
    $offset,
    $activeHeading,
    $topbarHeight,
    onDrag(offset) {
      $offset(offset)
    },
    onScrollToHeading: scrollToHeading,
  })

  //-------------- Exposed Commands --------------

  const next = () => {
    const { headings } = $content()
    const activeHeading = $activeHeading()
    const nextIndex = Math.min(headings.length - 1, activeHeading + 1)
    scrollToHeading(nextIndex)
  }
  const prev = () => {
    const activeHeading = $activeHeading()
    const prevIndex = Math.max(0, activeHeading - 1)
    scrollToHeading(prevIndex)
  }
  const show = () => {
    $triggerIsShown(true)
  }
  const hide = () => {
    $triggerIsShown(false)
  }
  const toggle = () => {
    if ($isShown()) {
      hide()
    } else {
      show()
    }
  }
  const dispose = () => {
    hide()
    disposers.forEach((dispose) => dispose())
    emitter.removeAllListeners()
  }
  const getPreference = (): TocPreference => {
    return {
      offset: $offset(),
    }
  }

  return {
    ...emitter,
    show,
    hide,
    toggle,
    prev,
    next,
    getPreference,
    dispose,
  }
}

export type Toc = ReturnType<typeof createToc>
