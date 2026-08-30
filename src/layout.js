import layouts from './layouts.json'

export const LAYOUTS = Object.values(layouts)

export function getLayout(id) {
  return layouts[id] ?? layouts.default
}

function makeBlank(index) {
  return {
    page: { id: `blank-${index}`, name: 'Blank page', url: null, blank: true },
    number: null,
  }
}

export function buildSheets(pages, layout) {
  const { signatureSize, sides } = layout.imposition
  const numbered = pages.map((page, i) => ({ page, number: i + 1 }))
  const padded = [...numbered]
  while (padded.length % signatureSize !== 0) {
    padded.push(makeBlank(padded.length))
  }
  const sheets = []
  let sheetNumber = 0
  for (let g = 0; g < padded.length; g += signatureSize) {
    sheetNumber++
    const group = padded.slice(g, g + signatureSize)
    for (const { side, slots } of sides) {
      sheets.push({
        sheetNumber,
        side,
        slots: slots.map((idx) => group[idx]),
      })
    }
  }
  return sheets
}
