import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { jsPDF } from 'jspdf'
import { whitenBackground } from './whiten'
import { getLayout, buildSheets } from './layout'
import { pageNumberToDataUrl } from './renderNumber'

export const LETTER_W = 279
export const LETTER_H = 216
export const DEFAULT_MARGIN = 0
export const DEFAULT_TOLERANCE = 4
export const DEFAULT_FEATHER = 1
export const DEFAULT_NUMBER_SIZE = 1
export const DEFAULT_NUMBER_OFFSET = 2
export const DEFAULT_CONTENT_SHIFT = 0
export const DEFAULT_HELPER_TOP = 6
export const DEFAULT_HELPER_LEFT = 6
export const DEFAULT_HELPER_BOTTOM = 6
export const DEFAULT_HELPER_RIGHT = 6

export const DEFAULT_EDIT = { x: 0, y: 0, scale: 1 }

export const PROJECT_TYPE = 'book-maker-project'
export const PROJECT_VERSION = 1

async function urlToDataUrl(url) {
  const res = await fetch(url)
  const blob = await res.blob()
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function dataUrlToObjectUrl(dataUrl) {
  const comma = dataUrl.indexOf(',')
  const meta = dataUrl.slice(0, comma)
  const mime = meta.match(/data:(.*?);/)?.[1] ?? 'image/png'
  const binary = atob(dataUrl.slice(comma + 1))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return URL.createObjectURL(new Blob([bytes], { type: mime }))
}

const BookContext = createContext(null)

export function containedSize(naturalW, naturalH, slotW, slotH) {
  const ratio = naturalW / naturalH
  let dw = slotW
  let dh = slotW / ratio
  if (dh > slotH) {
    dh = slotH
    dw = slotH * ratio
  }
  return { dw, dh, x: (slotW - dw) / 2, y: (slotH - dh) / 2 }
}

export function BookProvider({ children }) {
  const [pages, setPages] = useState([])
  const [gap, setGap] = useState(6)
  const [margin, setMargin] = useState(DEFAULT_MARGIN)
  const [whitenTolerance, setWhitenTolerance] = useState(DEFAULT_TOLERANCE)
  const [whitenFeather, setWhitenFeather] = useState(DEFAULT_FEATHER)
  const [layoutId, setLayoutId] = useState('default')
  const [showNumbers, setShowNumbers] = useState(true)
  const [numberStyle, setNumberStyle] = useState(() => getLayout('default').pageNumber.style)
  const [numberSize, setNumberSize] = useState(DEFAULT_NUMBER_SIZE)
  const [numberOffset, setNumberOffset] = useState(DEFAULT_NUMBER_OFFSET)
  const [contentShift, setContentShift] = useState(DEFAULT_CONTENT_SHIFT)
  const [showHelperLines, setShowHelperLines] = useState(false)
  const [helperTop, setHelperTop] = useState(DEFAULT_HELPER_TOP)
  const [helperLeft, setHelperLeft] = useState(DEFAULT_HELPER_LEFT)
  const [helperBottom, setHelperBottom] = useState(DEFAULT_HELPER_BOTTOM)
  const [helperRight, setHelperRight] = useState(DEFAULT_HELPER_RIGHT)
  const [dialogPage, setDialogPage] = useState(null)

  const addFiles = useCallback(
    async (files) => {
      const list = Array.from(files)
      const newPages = []
      for (const file of list) {
        const originalUrl = URL.createObjectURL(file)
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
        let url = originalUrl
        let whitened = false
        try {
          url = await whitenBackground(originalUrl, {
            tolerance: whitenTolerance,
            feather: whitenFeather,
          })
          whitened = true
        } catch {
          // fall back to original on failure
        }
        newPages.push({
          id,
          name: file.name,
          originalUrl,
          url,
          blank: false,
          whitened,
          edit: { ...DEFAULT_EDIT },
        })
      }
      setPages((prev) => [...prev, ...newPages])
    },
    [whitenTolerance, whitenFeather],
  )

  const addBlank = useCallback(() => {
    setPages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: 'Blank page',
        url: null,
        blank: true,
        edit: { ...DEFAULT_EDIT },
      },
    ])
  }, [])

  const swap = useCallback((from, to) => {
    if (from === to) return
    setPages((prev) => {
      const next = [...prev]
      ;[next[from], next[to]] = [next[to], next[from]]
      return next
    })
  }, [])

  const move = useCallback((index, dir) => {
    setPages((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }, [])

  const remove = useCallback((id) => {
    setPages((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const applyWhiten = useCallback((id, url) => {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, url, whitened: true } : p)))
    setDialogPage(null)
  }, [])

  const keepOriginal = useCallback((id) => {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, url: p.originalUrl, whitened: false } : p)),
    )
    setDialogPage(null)
  }, [])

  const editPage = useCallback((id, partial) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, edit: { ...DEFAULT_EDIT, ...p.edit, ...partial } } : p,
      ),
    )
  }, [])

  const loadImage = (url) =>
    new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })

  const createPdf = useCallback(async () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'letter',
      compress: true,
    })

    const usableW = LETTER_W - margin * 2
    const usableH = LETTER_H - margin * 2
    const halfW = (usableW - gap) / 2

    const placeImage = (img, x, y, w, h, edit) => {
      const { dw, dh } = containedSize(img.naturalWidth, img.naturalHeight, w, h)
      const edit2 = { ...DEFAULT_EDIT, ...edit }
      const dw2 = dw * edit2.scale
      const dh2 = dh * edit2.scale
      const cx = x + (w - dw2) / 2 + edit2.x
      const cy = y + (h - dh2) / 2 + edit2.y - contentShift
      doc.addImage(img, 'JPEG', cx, cy, dw2, dh2, undefined, 'FAST')
    }

    const placePage = (slot, x, y, w, h) => {
      const { page } = slot
      if (!page || page.blank) return
      placeImage(imgMap.get(page.id), x, y, w, h, page.edit)
    }

    const imagePages = pages.filter((p) => !p.blank)
    const images = await Promise.all(imagePages.map((p) => loadImage(p.url)))
    const imgMap = new Map(imagePages.map((p, i) => [p.id, images[i]]))

    const numberCache = new Map()
    const getNumberImage = async (number) => {
      if (number == null) return null
      const key = `${numberStyle}:${number}`
      if (!numberCache.has(key)) {
        numberCache.set(key, await pageNumberToDataUrl({ number, style: numberStyle }))
      }
      return numberCache.get(key)
    }

    const placeNumber = async (slot, x, y, w, h) => {
      const { number } = slot
      if (number == null) return
      const dataUrl = await getNumberImage(number)
      if (!dataUrl) return
      const numW = Math.min(w * 0.5 * numberSize, 60 * numberSize)
      const numH = (numW * 56) / 240
      const nx = x + (w - numW) / 2
      const ny = y + h - numH - numberOffset
      doc.addImage(dataUrl, 'PNG', nx, ny, numW, numH, undefined, 'FAST')
    }

    const layout = getLayout(layoutId)
    const sheets = buildSheets(pages, layout)
    const visibleSheets = sheets.filter((s) => s.slots.some((slot) => slot.page && !slot.page.blank))

    let pageIndex = 0
    for (const sheet of visibleSheets) {
      if (pageIndex > 0) doc.addPage('letter', 'landscape')
      const [leftSlot, rightSlot] = sheet.slots
      placePage(leftSlot, margin, margin, halfW, usableH)
      placePage(rightSlot, margin + halfW + gap, margin, halfW, usableH)
      if (showNumbers) {
        await placeNumber(leftSlot, margin, margin, halfW, usableH)
        await placeNumber(rightSlot, margin + halfW + gap, margin, halfW, usableH)
      }
      pageIndex++
    }

    doc.save('book.pdf')
  }, [pages, gap, margin, showNumbers, numberStyle, layoutId, numberSize, numberOffset, contentShift])

  const saveProject = useCallback(async () => {
    const serializedPages = await Promise.all(
      pages.map(async (p) => {
        const base = {
          id: p.id,
          name: p.name,
          blank: p.blank,
          whitened: p.whitened,
          edit: { ...DEFAULT_EDIT, ...p.edit },
        }
        if (p.blank) return base
        return {
          ...base,
          original: await urlToDataUrl(p.originalUrl),
          image: await urlToDataUrl(p.url),
        }
      }),
    )

    const project = {
      type: PROJECT_TYPE,
      version: PROJECT_VERSION,
      savedAt: new Date().toISOString(),
      settings: {
        gap,
        margin,
        whitenTolerance,
        whitenFeather,
        layoutId,
        showNumbers,
        numberStyle,
        numberSize,
        numberOffset,
        contentShift,
      },
      pages: serializedPages,
    }

    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'book-project.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [
    pages,
    gap,
    margin,
    whitenTolerance,
    whitenFeather,
    layoutId,
    showNumbers,
    numberStyle,
    numberSize,
    numberOffset,
    contentShift,
  ])

  const loadProject = useCallback(
    async (file) => {
      const text = await file.text()
      const project = JSON.parse(text)
      if (project.type !== PROJECT_TYPE) {
        throw new Error('Not a Book Maker project file.')
      }

      const s = project.settings ?? {}
      setGap(s.gap ?? 6)
      setMargin(s.margin ?? DEFAULT_MARGIN)
      setWhitenTolerance(s.whitenTolerance ?? DEFAULT_TOLERANCE)
      setWhitenFeather(s.whitenFeather ?? DEFAULT_FEATHER)
      setLayoutId(s.layoutId ?? 'default')
      setShowNumbers(s.showNumbers ?? true)
      setNumberStyle(s.numberStyle ?? getLayout('default').pageNumber.style)
      setNumberSize(s.numberSize ?? DEFAULT_NUMBER_SIZE)
      setNumberOffset(s.numberOffset ?? DEFAULT_NUMBER_OFFSET)
      setContentShift(s.contentShift ?? DEFAULT_CONTENT_SHIFT)

      const loaded = (project.pages ?? []).map((p) => {
        if (p.blank) {
          return { id: p.id, name: p.name, url: null, blank: true, edit: { ...DEFAULT_EDIT, ...p.edit } }
        }
        return {
          id: p.id,
          name: p.name,
          originalUrl: dataUrlToObjectUrl(p.original),
          url: dataUrlToObjectUrl(p.image),
          blank: false,
          whitened: !!p.whitened,
          edit: { ...DEFAULT_EDIT, ...p.edit },
        }
      })
      setPages(loaded)
      setDialogPage(null)
    },
    [],
  )

  const value = useMemo(
    () => ({
      pages,
      gap,
      setGap,
      margin,
      setMargin,
      whitenTolerance,
      setWhitenTolerance,
      whitenFeather,
      setWhitenFeather,
      layoutId,
      setLayoutId,
      showNumbers,
      setShowNumbers,
      numberStyle,
      setNumberStyle,
      numberSize,
      setNumberSize,
      numberOffset,
      setNumberOffset,
      contentShift,
      setContentShift,
      showHelperLines,
      setShowHelperLines,
      helperTop,
      setHelperTop,
      helperLeft,
      setHelperLeft,
      helperBottom,
      setHelperBottom,
      helperRight,
      setHelperRight,
      dialogPage,
      setDialogPage,
      addFiles,
      addBlank,
      swap,
      move,
      remove,
      applyWhiten,
      keepOriginal,
      editPage,
      createPdf,
      saveProject,
      loadProject,
    }),
    [
      pages,
      gap,
      margin,
      whitenTolerance,
      whitenFeather,
      layoutId,
      showNumbers,
      numberStyle,
      numberSize,
      numberOffset,
      contentShift,
      dialogPage,
      showHelperLines,
      helperTop,
      helperLeft,
      helperBottom,
      helperRight,
      addFiles,
      addBlank,
      swap,
      move,
      remove,
      applyWhiten,
      keepOriginal,
      editPage,
      createPdf,
      saveProject,
      loadProject,
    ],
  )

  return <BookContext.Provider value={value}>{children}</BookContext.Provider>
}

export function useBook() {
  const ctx = useContext(BookContext)
  if (!ctx) throw new Error('useBook must be used within a BookProvider')
  return ctx
}
