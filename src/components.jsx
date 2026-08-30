import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { whitenBackground } from './whiten'
import PageNumber from './PageNumber'
import { containedSize, DEFAULT_EDIT, LETTER_H, LETTER_W } from './state'

export function PageImage({ src, className = '' }) {
  return <img src={src} alt="" className={`h-full w-full object-cover ${className}`} />
}

export function ScaleWrapper({ children, className = '', onClick }) {
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
    <div ref={containerRef} className={`relative ${className}`} onClick={onClick}>
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

export function useImageSize(src) {
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

export function SheetView({
  sheet,
  margin,
  gap,
  showNumbers,
  numberStyle,
  numberSize,
  numberOffset,
  contentShift,
  showHelperLines = false,
  helperTop = 6,
  helperLeft = 6,
  helperBottom = 6,
  helperRight = 6,
  selectedId,
  onSelectPage,
  onResizeStart,
  sheetW = 560,
  interactive = false,
}) {
  const [leftSlot, rightSlot] = sheet.slots
  const leftSize = useImageSize(leftSlot.page && !leftSlot.page.blank ? leftSlot.page.url : null)
  const rightSize = useImageSize(rightSlot.page && !rightSlot.page.blank ? rightSlot.page.url : null)

  const sheetH = (LETTER_H / LETTER_W) * sheetW
  const pxPerMm = sheetW / LETTER_W
  const marginPx = margin * pxPerMm
  const gapPx = gap * pxPerMm
  const usableW = (LETTER_W - margin * 2) * pxPerMm
  const usableH = (LETTER_H - margin * 2) * pxPerMm
  const halfW = (usableW - gapPx) / 2
  const leftX = marginPx
  const rightX = marginPx + halfW + gapPx
  const shiftPx = contentShift * pxPerMm

  const renderPage = (slot, size, x) => {
    const { page, number } = slot
    if (!page || page.blank) {
      return (
        <div
          className="absolute bg-white"
          style={{ left: `${x}px`, top: `${marginPx}px`, width: `${halfW}px`, height: `${usableH}px` }}
        />
      )
    }
    if (!size) {
      return (
        <div
          className="absolute bg-slate-100"
          style={{ left: `${x}px`, top: `${marginPx}px`, width: `${halfW}px`, height: `${usableH}px` }}
        />
      )
    }
    const edit = { ...DEFAULT_EDIT, ...page.edit }
    const { dw, dh } = containedSize(size.w, size.h, halfW, usableH)
    const dw2 = dw * edit.scale
    const dh2 = dh * edit.scale
    const cx = (halfW - dw2) / 2 + edit.x * pxPerMm
    const cy = (usableH - dh2) / 2 + edit.y * pxPerMm - shiftPx
    const selected = interactive && selectedId === page.id
    const numW = Math.round(halfW * 0.5 * numberSize)
    return (
      <div
        className="absolute"
        style={{ left: `${x}px`, top: `${marginPx}px`, width: `${halfW}px`, height: `${usableH}px` }}
      >
        <div
          className={`absolute border border-dashed border-slate-400/70 ${interactive ? 'cursor-pointer' : ''}`}
          style={{
            left: `${cx}px`,
            top: `${cy}px`,
            width: `${dw2}px`,
            height: `${dh2}px`,
            zIndex: selected ? 10 : 1,
          }}
          onClick={
            interactive
              ? (e) => {
                  e.stopPropagation()
                  onSelectPage(page.id)
                }
              : undefined
          }
        >
          <img src={page.url} alt="" className="h-full w-full select-none" draggable={false} />
          {selected && (
            <div className="pointer-events-none absolute inset-0 ring-4 ring-indigo-500" />
          )}
          {selected && onResizeStart && (
            <div
              onPointerDown={(e) => onResizeStart(e, page, e.currentTarget.parentElement)}
              className="absolute -right-2 -top-2 h-5 w-5 cursor-nesw-resize bg-indigo-600 ring-2 ring-white"
              title="Drag to resize"
            />
          )}
        </div>
        <span className="absolute bottom-0.5 left-0.5 bg-slate-900/70 px-1 py-0.5 text-[10px] leading-none text-white">
          {Math.round((dw2 / pxPerMm) * 10) / 10} × {Math.round((dh2 / pxPerMm) * 10) / 10} mm
        </span>
        {showNumbers && (
          <div
            className="pointer-events-none absolute left-1/2 -translate-x-1/2"
            style={{ bottom: `${numberOffset * pxPerMm}px` }}
          >
            <PageNumber number={number} style={numberStyle} width={numW} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className="relative bg-white"
      style={{ width: `${sheetW}px`, height: `${sheetH}px` }}
      onClick={interactive ? () => onSelectPage(null) : undefined}
    >
      {renderPage(leftSlot, leftSize, leftX)}
      {renderPage(rightSlot, rightSize, rightX)}
      {showHelperLines && (
        <div className="pointer-events-none absolute inset-0 z-10">
          <div
            className="absolute border-l-2 border-dashed border-red-500"
            style={{
              left: `${sheetW / 2}px`,
              top: `${marginPx}px`,
              height: `${usableH}px`,
            }}
          />
          <div
            className="absolute border-2 border-dashed border-red-500"
            style={{
              left: `${helperLeft * pxPerMm}px`,
              top: `${helperTop * pxPerMm}px`,
              width: `${(LETTER_W / 2 - helperRight - helperLeft) * pxPerMm}px`,
              height: `${(LETTER_H - helperTop - helperBottom) * pxPerMm}px`,
            }}
          />
          <div
            className="absolute border-2 border-dashed border-red-500"
            style={{
              left: `${(LETTER_W / 2 + helperRight) * pxPerMm}px`,
              top: `${helperTop * pxPerMm}px`,
              width: `${(LETTER_W / 2 - helperRight - helperLeft) * pxPerMm}px`,
              height: `${(LETTER_H - helperTop - helperBottom) * pxPerMm}px`,
            }}
          />
        </div>
      )}
      {interactive && (
        <div className="pointer-events-none absolute inset-0 z-20 border-2 border-slate-400" />
      )}
    </div>
  )
}

export function WhiteningDialog({ page, initialTolerance, initialFeather, onApply, onKeepOriginal, onClose }) {
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
        className="max-h-full w-full max-w-4xl overflow-auto bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Whitening background</h2>
            <p className="text-sm text-slate-500">{page.name}</p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-slate-500 transition hover:bg-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-center text-xs font-medium text-slate-500">Before</p>
            <div className="flex h-[36rem] items-center justify-center overflow-hidden bg-slate-100 ring-1 ring-slate-200">
              <img src={page.originalUrl} alt="Before" className="max-h-full max-w-full object-contain" />
            </div>
          </div>
          <div>
            <p className="mb-1 text-center text-xs font-medium text-slate-500">After</p>
            <div className="flex h-[36rem] items-center justify-center overflow-hidden bg-slate-100 ring-1 ring-slate-200">
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
            className="border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Keep original
          </button>
          <button
            onClick={rerun}
            disabled={busy}
            className="border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Re-run
          </button>
          <button
            onClick={() => onApply(page.id, afterUrl)}
            disabled={busy}
            className="bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            Confirm whitened
          </button>
        </div>
      </div>
    </div>
  )
}

export function SidePreview({
  left,
  right,
  leftIndex,
  rightIndex,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onClickPage,
  onRemove,
  dragIndex,
}) {
  const renderPage = (page, index, label) => {
    if (!page) return null
    return (
      <div
        key={page.id}
        draggable
        onDragStart={(e) => onDragStart(e, index)}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, index)}
        onDragEnd={onDragEnd}
        className={`group relative flex-1 cursor-pointer overflow-hidden ${dragIndex === index ? 'opacity-50' : ''}`}
        onClick={() => onClickPage(page)}
      >
        {page.blank ? (
          <div className="h-full w-full bg-white" />
        ) : (
          <PageImage src={page.url} />
        )}
        <span className="absolute left-1 top-1 bg-slate-900/70 px-1.5 py-0.5 text-xs font-medium text-white">
          {label}
        </span>
        {!page.blank && page.whitened && (
          <span className="absolute left-1 bottom-1 bg-emerald-600/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
            Whitened
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove(page.id)
          }}
          className="absolute right-1 top-1 bg-red-600/80 px-1.5 py-0.5 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100"
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-white">
      {renderPage(left, leftIndex, leftIndex + 1)}
      {renderPage(right, rightIndex, rightIndex + 1)}
    </div>
  )
}
