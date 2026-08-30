import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LAYOUTS, getLayout } from './layout'
import { NUMBER_STYLES } from './numbering'
import { useBook } from './state'
import { WhiteningDialog, SidePreview } from './components'

export default function MainPage() {
  const navigate = useNavigate()
  const {
    pages,
    gap,
    setGap,
    margin,
    setMargin,
    cropMarks,
    setCropMarks,
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
    dialogPage,
    setDialogPage,
    addFiles,
    addBlank,
    swap,
    remove,
    applyWhiten,
    keepOriginal,
    createPdf,
  } = useBook()

  const [dragIndex, setDragIndex] = useState(null)
  const fileInputRef = useRef(null)

  const layout = getLayout(layoutId)

  const onDragStart = useCallback((e, index) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }, [])

  const onDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e, index) => {
      e.preventDefault()
      const from = dragIndex ?? Number(e.dataTransfer.getData('text/plain'))
      setDragIndex(null)
      if (Number.isInteger(from)) swap(from, index)
    },
    [dragIndex, swap],
  )

  const moveSide = useCallback(
    (si, dir) => {
      const target = si + dir
      const aLeft = si * 2
      const bLeft = target * 2
      if (target < 0 || bLeft >= pages.length) return
      if (aLeft < pages.length) swap(aLeft, bLeft)
      if (aLeft + 1 < pages.length) swap(aLeft + 1, bLeft + 1)
    },
    [pages.length, swap],
  )

  const sides = []
  for (let i = 0; i < pages.length; i += 2) {
    sides.push({ left: pages[i], right: pages[i + 1] ?? null, leftIndex: i, rightIndex: i + 1 })
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-xl font-semibold">Book Maker</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              {pages.length} page{pages.length === 1 ? '' : 's'}
            </span>
            <button
              onClick={() => navigate('/edit')}
              disabled={pages.length === 0}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Edit
            </button>
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
              Each image becomes one book page. Drag to reorder. Click a page to adjust whitening.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {sides.map((side, si) => (
              <div
                key={si}
                className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200"
              >
                <div className="aspect-[297/216] w-full">
                  <SidePreview
                    left={side.left}
                    right={side.right}
                    leftIndex={side.leftIndex}
                    rightIndex={side.rightIndex}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    onDragEnd={() => setDragIndex(null)}
                    onClickPage={(page) => !page.blank && setDialogPage(page)}
                    onRemove={remove}
                    dragIndex={dragIndex}
                  />
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 p-1.5">
                  <button
                    onClick={() => moveSide(si, -1)}
                    disabled={si === 0}
                    className="rounded px-2 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                    title="Move left"
                  >
                    ←
                  </button>
                  <span className="truncate px-1 text-xs text-slate-500">
                    Side {si + 1}
                  </span>
                  <button
                    onClick={() => moveSide(si, 1)}
                    disabled={si === sides.length - 1}
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
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Layout</h2>
            <select
              value={layoutId}
              onChange={(e) => setLayoutId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
            >
              {LAYOUTS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-400">{layout.description}</p>
          </section>

          <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Page numbers</h2>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={showNumbers}
                onChange={(e) => setShowNumbers(e.target.checked)}
                className="h-4 w-4 accent-indigo-600"
              />
              <span className="text-sm text-slate-600">Show page numbers</span>
            </label>
            {showNumbers && (
              <div className="mt-3">
                <select
                  value={numberStyle}
                  onChange={(e) => setNumberStyle(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                >
                  {NUMBER_STYLES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-400">
                  Rendered at the bottom center of every page.
                </p>
                <div className="mt-3 space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Size</span>
                      <span className="tabular-nums text-slate-600">{Math.round(numberSize * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.05"
                      value={numberSize}
                      onChange={(e) => setNumberSize(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Distance from bottom</span>
                      <span className="tabular-nums text-slate-600">{numberOffset} mm</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      step="1"
                      value={numberOffset}
                      onChange={(e) => setNumberOffset(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

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
              Margin around the two book pages on each US Letter sheet.
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
              Gap between the two book pages on each US Letter sheet.
            </p>
          </section>

          <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Content shift</h2>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={contentShift}
                onChange={(e) => setContentShift(Number(e.target.value))}
                className="flex-1"
              />
              <span className="w-12 text-right text-sm tabular-nums text-slate-600">{contentShift} mm</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Shifts all page content up by this amount to compensate for a larger top margin in
              uploaded images.
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
