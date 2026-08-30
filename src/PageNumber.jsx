import { pageNumberSvg } from './pageNumberSvg'

export default function PageNumber({ number, style, color, width = 120 }) {
  if (number == null) return null
  const height = Math.round((width * 56) / 240)
  const svg = pageNumberSvg({ number, style, color, width, height })
  if (!svg) return null
  return <span dangerouslySetInnerHTML={{ __html: svg }} />
}
