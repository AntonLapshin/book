const RUNES = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ']

export const NUMBER_STYLES = [
  { id: 'classic', label: 'Classic · Roman numerals' },
  { id: 'ancient', label: 'Ancient · Dragon runes' },
]

export function romanize(n) {
  if (n == null || n < 1) return ''
  const table = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let out = ''
  for (const [value, symbol] of table) {
    while (n >= value) {
      out += symbol
      n -= value
    }
  }
  return out
}

export function runicize(n) {
  if (n == null || n < 1) return ''
  return String(n)
    .split('')
    .map((digit) => RUNES[Number(digit)])
    .join('')
}

export function formatPageNumber(n, style) {
  if (n == null || n < 1) return ''
  if (style === 'ancient') return runicize(n)
  return romanize(n)
}
