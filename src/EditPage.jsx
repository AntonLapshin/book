import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildSheets, getLayout } from './layout'
import { useBook } from './state'
import { ScaleWrapper, SheetView } from './components'

export default function EditPage() {
  const navigate = useNavigate()
  const {
    pages,
    gap,
    margin,
    showNumbers,
    numberStyle,
    numberSize,
    numberOffset,
    contentShift,
    layoutId,
    editPage,
  } = useBook()

  const [sheetIndex, setSheetIndex] = useState(0)
  const [selectedPageId, setSelectedPageId] = useState(null)
  const [drag, setDrag] = useState(null)
  const [showHelperLines, setShowHelperLines] = useState(false)
  const [helperTop, setHelperTop] = useState(6)
  const [helperLeft, setHelperLeft] = useState(6)
  const [helperBottom, setHelperBottom] = useState(6)
  const [helperRight, setHelperRight] = useState(6)

  const layout = getLayout(layoutId)
  const sheets = buildSheets(pages, layout)
  const visibleSheets = sheets.filter((s) => s.slots.some((slot) => slot.page && !slot.page.blank))

  const selectedSheet = visibleSheets[sheetIndex] ?? null
  const selectedPage = pages.find((p) => p.id === selectedPageId) ?? null

  useEffect(() => {
    if (!drag) return
    const onMove = (e) => {
      const nx = drag.handleX + (e.clientX - drag.startX)
      const ny = drag.handleY + (e.clientY - drag.startY)
      const dist = Math.hypot(nx - drag.centerX, ny - drag.centerY)
      const scale = Math.max(0.2, (dist / drag.startDist) * drag.startScale)
      editPage(drag.id, { scale })
    }
    const onUp = () => setDrag(null)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [drag, editPage])

  const selectSheet = (index) => {
    setSheetIndex(index)
    setSelectedPageId(
      visibleSheets[index]?.slots.find((s) => s.page && !s.page.blank)?.page?.id ?? null,
    )
  }

  const adjust = (dx, dy) => {
    if (!selectedPage) return
    const edit = { ...selectedPage.edit }
    editPage(selectedPage.id, { x: (edit.x ?? 0) + dx, y: (edit.y ?? 0) + dy })
  }

  const handleResizeStart = (e, page, el) => {
    e.preventDefault()
    e.stopPropagation()
    const r = el.getBoundingClientRect()
    const centerX = r.left + r.width / 2
    const centerY = r.top + r.height / 2
    const handleX = r.right
    const handleY = r.top
    const startDist = Math.hypot(handleX - centerX, handleY - centerY)
    setDrag({
      id: page.id,
      startScale: page.edit?.scale ?? 1,
      centerX,
      centerY,
      handleX,
      handleY,
      startDist,
      startX: e.clientX,
      startY: e.clientY,
    })
  }

  const edit = selectedPage ? { ...selectedPage.edit } : { x: 0, y: 0, scale: 1 }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              ← Back
            </button>
            <h1 className="text-lg font-semibold">
              Edit layout · {pages.length} page{pages.length === 1 ? '' : 's'}
            </h1>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-3 py-1.5 text-slate-500 transition hover:bg-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-6">
        {selectedSheet ? (
          <>
            <div className="w-full">
              <p className="mb-2 text-center text-xs text-slate-400">
                Sheet {selectedSheet.sheetNumber} · Side {selectedSheet.side} · click a page to
                select it
              </p>
              <div className="mb-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showHelperLines}
                    onChange={(e) => setShowHelperLines(e.target.checked)}
                    className="h-4 w-4 accent-indigo-600"
                  />
                  <span className="text-sm text-slate-600">Show helper lines</span>
                </label>
                {showHelperLines && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                    {[
                      ['Top', helperTop, setHelperTop],
                      ['Left', helperLeft, setHelperLeft],
                      ['Bottom', helperBottom, setHelperBottom],
                      ['Right (center)', helperRight, setHelperRight],
                    ].map(([label, value, setter]) => (
                      <label key={label} className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500">{label}</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={value}
                          onChange={(e) => setter(Number(e.target.value))}
                          className="w-16 border border-slate-300 bg-white px-1.5 py-0.5 text-right text-sm tabular-nums text-slate-700"
                        />
                        <span className="text-xs text-slate-400">mm</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <ScaleWrapper
                className="mx-auto h-[58vh] w-full"
                onClick={() => setSelectedPageId(null)}
              >
                <SheetView
                  sheet={selectedSheet}
                  margin={margin}
                  gap={gap}
                  showNumbers={showNumbers}
                  numberStyle={numberStyle}
                  numberSize={numberSize}
                  numberOffset={numberOffset}
                  contentShift={contentShift}
                  showHelperLines={showHelperLines}
                  helperTop={helperTop}
                  helperLeft={helperLeft}
                  helperBottom={helperBottom}
                  helperRight={helperRight}
                  selectedId={selectedPageId}
                  onSelectPage={setSelectedPageId}
                  onResizeStart={handleResizeStart}
                  sheetW={1000}
                  interactive
                />
              </ScaleWrapper>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 bg-white px-6 py-3 shadow-sm ring-1 ring-slate-200">
              {selectedPage ? (
                <>
                  <span className="max-w-40 truncate text-sm font-medium text-slate-600">
                    {selectedPage.name}
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    <span />
                    <button
                      onClick={() => adjust(0, -1)}
                      className="h-9 w-9 bg-slate-100 text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <span />
                    <button
                      onClick={() => adjust(-1, 0)}
                      className="h-9 w-9 bg-slate-100 text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
                      title="Move left"
                    >
                      ←
                    </button>
                    <span className="flex h-9 w-9 items-center justify-center text-xs tabular-nums text-slate-400">
                      {Math.round(edit.scale * 100)}%
                    </span>
                    <button
                      onClick={() => adjust(1, 0)}
                      className="h-9 w-9 bg-slate-100 text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
                      title="Move right"
                    >
                      →
                    </button>
                    <span />
                    <button
                      onClick={() => adjust(0, 1)}
                      className="h-9 w-9 bg-slate-100 text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
                      title="Move down"
                    >
                      ↓
                    </button>
                    <span />
                  </div>
                  <div className="text-xs tabular-nums text-slate-400">
                    x {edit.x} mm · y {edit.y} mm
                  </div>
                </>
              ) : (
                <span className="text-sm text-slate-400">
                  Select a page to adjust its position and scale.
                </span>
              )}
            </div>
          </>
        ) : (
          <p className="text-slate-400">No pages to edit.</p>
        )}
      </main>

      <div className="border-t border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-6xl">
          <p className="mb-2 text-xs font-medium text-slate-500">Sides (each side = 2 pages)</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {visibleSheets.map((sheet, i) => {
              const [left, right] = sheet.slots
              const leftPage = left.page && !left.page.blank ? left.page : null
              const rightPage = right.page && !right.page.blank ? right.page : null
              return (
                <button
                  key={`${sheet.sheetNumber}-${sheet.side}`}
                  onClick={() => selectSheet(i)}
                  className={`shrink-0 p-1 ring-2 transition ${
                    i === sheetIndex
                      ? 'bg-indigo-50 ring-indigo-500'
                      : 'bg-white ring-slate-200 hover:ring-slate-300'
                  }`}
                >
                  <div className="mb-1 text-center text-[10px] font-medium text-slate-500">
                    Sheet {sheet.sheetNumber} · Side {sheet.side}
                  </div>
                  <div className="flex gap-1">
                    {[leftPage, rightPage].map((page, pi) => (
                      <div
                        key={pi}
                        className={`relative h-24 w-[4.5rem] overflow-hidden ${
                          page ? '' : 'bg-slate-100'
                        }`}
                      >
                        {page ? (
                          <img
                            src={page.url}
                            alt=""
                            className="h-full w-full object-cover"
                            draggable={false}
                          />
                        ) : null}
                        {page && (
                          <span
                            className={`absolute left-0.5 top-0.5 px-0.5 text-[9px] text-white ${
                              selectedPageId === page.id ? 'bg-indigo-600' : 'bg-slate-900/70'
                            }`}
                          >
                            {pi === 0 ? 'L' : 'R'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
