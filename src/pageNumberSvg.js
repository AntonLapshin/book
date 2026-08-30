import { formatPageNumber } from './numbering'

function escapeXml(s) {
  return s.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '&': return '&amp;'
      case "'": return '&apos;'
      case '"': return '&quot;'
      default: return c
    }
  })
}

const VB_W = 240
const VB_H = 56

export function pageNumberSvg({ number, style, width = VB_W, height = VB_H, color }) {
  const text = formatPageNumber(number, style)
  if (!text) return ''
  const isAncient = style === 'ancient'
  const ink = color ?? (isAncient ? '#b45309' : '#334155')
  const accent = isAncient ? '#d97706' : '#94a3b8'
  const ornament = isAncient ? '❖' : '◆'
  const fontFamily = isAncient
    ? "'Noto Sans Runic','Noto Sans Symbols 2',serif"
    : "'Times New Roman',Georgia,'DejaVu Serif',serif"

  const cx = VB_W / 2
  const cy = VB_H / 2
  const charW = isAncient ? 0.9 : 0.62
  const fontSize = Math.min(32, Math.floor((VB_W * 0.7) / Math.max(text.length, 1) / charW))
  const textW = text.length * fontSize * charW
  const gap = 18
  const ornSize = Math.max(10, fontSize * 0.5)
  const leftX = cx - textW / 2 - gap
  const rightX = cx + textW / 2 + gap
  const ruleY = cy + fontSize * 0.72

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${VB_W} ${VB_H}">
  <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-family="${fontFamily}" font-size="${fontSize}" fill="${ink}">${escapeXml(text)}</text>
  <text x="${leftX}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="${ornSize}" fill="${accent}">${ornament}</text>
  <text x="${rightX}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="${ornSize}" fill="${accent}">${ornament}</text>
  <line x1="${leftX + ornSize * 0.8}" y1="${ruleY}" x2="${rightX - ornSize * 0.8}" y2="${ruleY}" stroke="${accent}" stroke-width="1.2" stroke-opacity="0.55"/>
</svg>`
}
