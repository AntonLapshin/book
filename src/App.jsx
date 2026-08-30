import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react'
import { jsPDF } from 'jspdf'
import { whitenBackground } from './whiten'
import './index.css'

const LETTER_W = 279
const LETTER_H = 216
const DEFAULT_MARGIN = 10
const DEFAULT_TOLERANCE = 4
const DEFAULT_FEATHER = 1

function containedSize(naturalW, naturalH, slotW, slotH) {
  const ratio = naturalW / naturalH
  let dw = slotW
  let dh = slotW / ratio
  if (dh > slotH) {
    dh = slotH
    dw = slotH * ratio
  }
  return { dw, dh, x: (slotW - dw) / 2, y: (slotH - dh) / 2 }
}

function PageImage({ src, className = '' }) {
  return <img src={src} alt="" className={`h-full w-full object-cover ${className}`} />
}

function ScaleWrapper({ children, className = '' }) {
  const containerRef = useRef(null)
  const contentRef = useRef(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const container = containerRef.current
    const content = contentRef.current
    if (!container || !content) return
    const update = () => {
      const cw = container.clientWidth
      const ch = container.clientHeight
      const nw = content.offsetWidth
      const nh = content.offsetHeight
      if (!cw || !ch || !nw || !nh) return
      setScale(Math.min(cw / nw, ch / nh))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(container)
    ro.observe(content)
    return () => ro.disconnect()
  }, [children])

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      <div
        ref={contentRef}
        className="absolute left-0 top-0 origin-top-left"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function useImageSize(src) {
  const [size, setSize] = useState(null)
  useEffect(() => {
    if (!src) {
      setSize(null)
      return
    }
    let alive = true
    const img = new Image()
    img.onload = () => {
      if (alive) setSize({ w: img.naturalWidth, h: img.naturalHeight })
    }
    img.src = src
    return () => {
      alive = false
    }
  }, [src])
  return size
}

function SheetPreview({ left, right, margin, gap, cropMarks, sheetIndex, totalSheets }) {
  const leftSize = useImageSize(left && !left.blank ? left.url : null)
  const rightSize = useImageSize(right && !right.blank ? right.url : null)

  const sheetW = 560
  const sheetH = (LETTER_H / LETTER_W) * sheetW
  const pxPerMm = sheetW / LETTER_W
  const marginPx = margin * pxPerMm
  const gapPx = gap * pxPerMm
  const usableW = (LETTER_W - margin * 2) * pxPerMm
  const usableH = (LETTER_H - margin * 2) * pxPerMm
  const halfW = (usableW - gapPx) / 2
  const leftX = marginPx
  const rightX = marginPx + halfW + gapPx

  const renderPage = (page, size, x) => {
    if (!page || page.blank) {
      return (
        <div
          className="absolute overflow-hidden bg-white"
          style={{ left: `${x}px`, top: `${marginPx}px`, width: `${halfW}px`, height: `${usableH}px` }}
        />
      )
    }
    if (!size) {
      return (
        <div
          className="absolute overflow-hidden bg-slate-100"
          style={{ left: `${x}px`, top: `${marginPx}px`, width: `${halfW}px`, height: `${usableH}px` }}
        />
      )
    }
    const { dw, dh, x: ix, y: iy } = containedSize(size.w, size.h, halfW, usableH)
    return (
      <div
        className="absolute overflow-hidden"
        style={{ left: `${x}px`, top: `${marginPx}px`, width: `${halfW}px`, height: `${usableH}px` }}
      >
        <div
          className="absolute"
          style={{ left: `${ix}px`, top: `${iy}px`, width: `${dw}px`, height: `${dh}px` }}
        >
          <img src={page.url} alt="" className="h-full w-full" draggable={false} />
        </div>
        <span className="absolute bottom-0.5 left-0.5 rounded bg-slate-900/70 px-1 py-0.5 text-[10px] leading-none text-white">
          {Math.round((dw / pxPerMm) * 10) / 10} × {Math.round((dh / pxPerMm) * 10) / 10} mm
        </span>
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-slate-900 p-3">
      <p className="mb-2 text-center text-xs text-slate-400">
        Sheet {sheetIndex + 1} of {totalSheets} · {LETTER_W} × {LETTER_H} mm
      </p>
      <ScaleWrapper className="mx-auto h-48 w-full">
        <div
          className="relative overflow-hidden rounded bg-slate-200 shadow-lg"
          style={{ width: `${sheetW}px`, height: `${sheetH}px` }}
        >
          {renderPage(left, leftSize, leftX)}
          {renderPage(right, rightSize, rightX)}
          {cropMarks && (
            <div
              className="absolute border-l-2 border-dashed border-slate-500"
              style={{
                left: `${sheetW / 2}px`,
                top: `${marginPx}px`,
                height: `${usableH}px`,
              }}
            />
          )}
        </div>
      </ScaleWrapper>
    </div>
  )
}

function WhiteningDialog({ page, initialTolerance, initialFeather, onApply, onKeepOriginal, onClose }) {
  const [tolerance, setTolerance] = useState(initialTolerance)
  const [feather, setFeather] = useState(initialFeather)
  const [afterUrl, setAfterUrl] = useState(page.url)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const rerun = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const processed = await whitenBackground(page.originalUrl, { tolerance, feather })
      setAfterUrl(processed)
    } catch {
      setError('Failed to process image.')
    } finally {
      setBusy(false)
    }
  }, [page.originalUrl, tolerance, feather])

  useEffect(() => {
    rerun()
  }, [rerun])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-6" onClick={onClose}>
      <div
        className="max-h-full w-full max-w-4xl overflow-auto rounded-xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Whitening background</h2>
            <p className="text-sm text-slate-500">{page.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-slate-500 transition hover:bg-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-center text-xs font-medium text-slate-500">Before</p>
            <div className="flex h-[36rem] items-center justify-center overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
              <img src={page.originalUrl} alt="Before" className="max-h-full max-w-full object-contain" />
            </div>
          </div>
          <div>
            <p className="mb-1 text-center text-xs font-medium text-slate-500">After</p>
            <div className="flex h-[36rem] items-center justify-center overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
              {busy ? (
                <span className="text-sm text-slate-400">Processing…</span>
              ) : (
                <img src={afterUrl} alt="After" className="max-h-full max-w-full object-contain" />
              )}
            </div>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">Tolerance: {tolerance} px</span>
            <input
              type="range"
              min="0"
              max="64"
              step="1"
              value={tolerance}
              onChange={(e) => setTolerance(Number(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">Feather: {feather} px</span>
            <input
              type="range"
              min="0"
              max="8"
              step="1"
              value={feather}
              onChange={(e) => setFeather(Number(e.target.value))}
              className="w-full"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          <button
            onClick={() => onKeepOriginal(page.id)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Keep original
          </button>
          <button
            onClick={rerun}
            disabled={busy}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Re-run
          </button>
          <button
            onClick={() => onApply(page.id, afterUrl)}
            disabled={busy}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            Confirm whitened
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [pages, setPages] = useState([])
  const [dragIndex, setDragIndex] = useState(null)
  const [gap, setGap] = useState(0)
  const [margin, setMargin] = useState(DEFAULT_MARGIN)
  const [cropMarks, setCropMarks] = useState(false)
  const [whitenTolerance, setWhitenTolerance] = useState(DEFAULT_TOLERANCE)
  const [whitenFeather, setWhitenFeather] = useState(DEFAULT_FEATHER)
  const [dialogPage, setDialogPage] = useState(null)
  const fileInputRef = useRef(null)

  const addFiles = useCallback(async (files) => {
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
      newPages.push({ id, name: file.name, originalUrl, url, blank: false, whitened })
    }
    setPages((prev) => [...prev, ...newPages])
  }, [whitenTolerance, whitenFeather])

  const addBlank = useCallback(() => {
    setPages((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, name: 'Blank page', url: null, blank: true },
    ])
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

  const swap = useCallback((from, to) => {
    if (from === to) return
    setPages((prev) => {
      const next = [...prev]
      ;[next[from], next[to]] = [next[to], next[from]]
      return next
    })
  }, [])

  const onDragStart = useCallback((e, index) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }, [])

  const onDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback((e, index) => {
    e.preventDefault()
    const from = dragIndex ?? Number(e.dataTransfer.getData('text/plain'))
    setDragIndex(null)
    if (Number.isInteger(from)) swap(from, index)
  }, [dragIndex, swap])

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

    const placeImage = (img, x, y, w, h) => {
      const { dw, dh, x: ix, y: iy } = containedSize(img.naturalWidth, img.naturalHeight, w, h)
      doc.addImage(img, 'JPEG', x + ix, y + iy, dw, dh, undefined, 'FAST')
    }

    const placePage = (page, x, y, w, h) => {
      if (!page || page.blank) return
      placeImage(imgMap.get(page.id), x, y, w, h)
    }

    const imagePages = pages.filter((p) => !p.blank)
    const images = await Promise.all(imagePages.map((p) => loadImage(p.url)))
    const imgMap = new Map(imagePages.map((p, i) => [p.id, images[i]]))

    let sheet = 0
    const sheetCount = Math.ceil(pages.length / 2)
    for (let i = 0; i < sheetCount; i++) {
      if (sheet > 0) doc.addPage('letter', 'landscape')
      const left = pages[i * 2]
      const right = pages[i * 2 + 1]
      placePage(left, margin, margin, halfW, usableH)
      placePage(right, margin + halfW + gap, margin, halfW, usableH)
      if (cropMarks) {
        doc.setDrawColor(0)
        doc.setLineWidth(0.2)
        doc.setLineDashPattern([1.5, 1.5], 0)
        doc.line(LETTER_W / 2, margin, LETTER_W / 2, LETTER_H - margin)
        doc.setLineDashPattern([], 0)
      }
      sheet++
    }

    doc.save('book.pdf')
  }, [pages, gap, margin, cropMarks])

  const totalSheets = Math.ceil(pages.length / 2)

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-xl font-semibold">Book Maker</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              {pages.length} page{pages.length === 1 ? '' : 's'} · {totalSheets} US Letter sheet{totalSheets === 1 ? '' : 's'}
            </span>
            <button
              onClick={createPdf}
              disabled={pages.length === 0}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Create PDF
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[1fr_470px]">
        <section className="space-y-6">
          <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files)
                e.target.value = ''
              }}
            />
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                Upload pages
              </button>
              <button
                onClick={addBlank}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                + Blank page
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Each image becomes an A5 page. Drag to reorder.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {pages.map((page, i) => (
              <div
                key={page.id}
                draggable
                onDragStart={(e) => onDragStart(e, i)}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, i)}
                onDragEnd={() => setDragIndex(null)}
                className={`group overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200 ${
                  dragIndex === i ? 'opacity-50' : ''
                }`}
              >
                <div
                  className="relative aspect-[148/210] cursor-pointer"
                  onClick={() => !page.blank && setDialogPage(page)}
                >
                  {page.blank ? (
                    <div className="h-full w-full bg-white" />
                  ) : (
                    <PageImage src={page.url} />
                  )}
                  <span className="absolute left-1 top-1 rounded bg-slate-900/70 px-1.5 py-0.5 text-xs font-medium text-white">
                    {i + 1}
                  </span>
                  {!page.blank && page.whitened && (
                    <span className="absolute left-1 bottom-1 rounded bg-emerald-600/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      Whitened
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      remove(page.id)
                    }}
                    className="absolute right-1 top-1 rounded bg-red-600/80 px-1.5 py-0.5 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 p-1.5">
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="rounded px-2 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                    title="Move left"
                  >
                    ←
                  </button>
                  <span className="truncate px-1 text-xs text-slate-500">{page.name}</span>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === pages.length - 1}
                    className="rounded px-2 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                    title="Move right"
                  >
                    →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">US Letter margins</h2>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="40"
                step="1"
                value={margin}
                onChange={(e) => setMargin(Number(e.target.value))}
                className="flex-1"
              />
              <span className="w-12 text-right text-sm tabular-nums text-slate-600">{margin} mm</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Margin around the two A5 pages on each US Letter sheet.
            </p>
          </section>

          <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Page gap</h2>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={gap}
                onChange={(e) => setGap(Number(e.target.value))}
                className="flex-1"
              />
              <span className="w-12 text-right text-sm tabular-nums text-slate-600">{gap} mm</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Gap between the two A5 pages on each US Letter sheet.
            </p>
          </section>

          <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Crop marks</h2>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={cropMarks}
                onChange={(e) => setCropMarks(e.target.checked)}
                className="h-4 w-4 accent-indigo-600"
              />
              <span className="text-sm text-slate-600">Show center crop marks</span>
            </label>
            <p className="mt-2 text-xs text-slate-400">
              Draws a dashed line at the exact center of each sheet to help split it in half after
              printing.
            </p>
          </section>

          <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Whitening background</h2>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Tolerance</span>
                  <span className="tabular-nums text-slate-600">{whitenTolerance} px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="64"
                  step="1"
                  value={whitenTolerance}
                  onChange={(e) => setWhitenTolerance(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Feather</span>
                  <span className="tabular-nums text-slate-600">{whitenFeather} px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="8"
                  step="1"
                  value={whitenFeather}
                  onChange={(e) => setWhitenFeather(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <p className="text-xs text-slate-400">
                Applied to new uploads. Click a page to review or adjust its whitening.
              </p>
            </div>
          </section>

          <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Preview</h2>
            <div className="space-y-3">
              {Array.from({ length: totalSheets }, (_, i) => (
                <SheetPreview
                  key={i}
                  sheetIndex={i}
                  totalSheets={totalSheets}
                  left={pages[i * 2]}
                  right={pages[i * 2 + 1]}
                  margin={margin}
                  gap={gap}
                  cropMarks={cropMarks}
                />
              ))}
              {pages.length === 0 && (
                <p className="text-center text-sm text-slate-400">Upload pages to preview.</p>
              )}
            </div>
          </section>
        </aside>
      </main>

      {dialogPage && (
        <WhiteningDialog
          page={dialogPage}
          initialTolerance={whitenTolerance}
          initialFeather={whitenFeather}
          onApply={applyWhiten}
          onKeepOriginal={keepOriginal}
          onClose={() => setDialogPage(null)}
        />
      )}
    </div>
  )
}
