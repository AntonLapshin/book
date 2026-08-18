import { useState, useRef, useCallback } from 'react'
import { jsPDF } from 'jspdf'
import './index.css'

const A4_W = 297
const A4_H = 210
const MARGIN = 10

function PageImage({ src, className = '' }) {
  return <img src={src} alt="" className={`h-full w-full object-cover ${className}`} />
}

export default function App() {
  const [pages, setPages] = useState([])
  const [dragIndex, setDragIndex] = useState(null)
  const fileInputRef = useRef(null)

  const addFiles = useCallback((files) => {
    const list = Array.from(files)
    const newPages = list.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      url: URL.createObjectURL(file),
    }))
    setPages((prev) => [...prev, ...newPages])
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

  const createPdf = useCallback(() => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true,
    })

    const usableW = A4_W - MARGIN * 2
    const usableH = A4_H - MARGIN * 2
    const halfW = usableW / 2

    const placeImage = (url, x, y, w, h) => {
      const img = new Image()
      img.src = url
      const ratio = img.naturalWidth / img.naturalHeight
      let dw = w
      let dh = w / ratio
      if (dh > h) {
        dh = h
        dw = h * ratio
      }
      doc.addImage(url, 'JPEG', x + (w - dw) / 2, y + (h - dh) / 2, dw, dh, undefined, 'FAST')
    }

    let sheet = 0
    const sheetCount = Math.ceil(pages.length / 2)
    for (let i = 0; i < sheetCount; i++) {
      if (sheet > 0) doc.addPage('a4', 'landscape')
      const left = pages[i * 2]
      const right = pages[i * 2 + 1]
      if (left) placeImage(left.url, MARGIN, MARGIN, halfW, usableH)
      if (right) placeImage(right.url, MARGIN + halfW, MARGIN, halfW, usableH)
      sheet++
    }

    doc.save('book.pdf')
  }, [pages])

  const totalSheets = Math.ceil(pages.length / 2)

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-xl font-semibold">Book Maker</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              {pages.length} page{pages.length === 1 ? '' : 's'} · {totalSheets} A4 sheet{totalSheets === 1 ? '' : 's'}
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

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-6 lg:grid-cols-[1fr_320px]">
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
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Upload pages
            </button>
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
                <div className="relative aspect-[148/210]">
                  <PageImage src={page.url} />
                  <span className="absolute left-1 top-1 rounded bg-slate-900/70 px-1.5 py-0.5 text-xs font-medium text-white">
                    {i + 1}
                  </span>
                  <button
                    onClick={() => remove(page.id)}
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
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Preview</h2>
            <div className="space-y-3">
              {Array.from({ length: totalSheets }, (_, i) => {
                const left = pages[i * 2]
                const right = pages[i * 2 + 1]
                return (
                  <div key={i} className="rounded-lg bg-slate-900 p-3">
                    <p className="mb-2 text-center text-xs text-slate-400">
                      Sheet {i + 1} of {totalSheets}
                    </p>
                    <div className="mx-auto flex aspect-[297/210] w-full gap-1 overflow-hidden rounded bg-white p-1 shadow-lg">
                      <div className="flex-1 overflow-hidden">
                        {left ? <PageImage src={left.url} /> : <div className="h-full bg-slate-100" />}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        {right ? <PageImage src={right.url} /> : <div className="h-full bg-slate-100" />}
                      </div>
                    </div>
                  </div>
                )
              })}
              {pages.length === 0 && (
                <p className="text-center text-sm text-slate-400">Upload pages to preview.</p>
              )}
            </div>
          </section>
        </aside>
      </main>
    </div>
  )
}
