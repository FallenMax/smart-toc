// '12px' => 12
export const num = (size: string | number | null = '0'): number => {
  if (!size) return NaN
  if (typeof size === 'number') return size
  if (/px$/.test(size)) {
    return +size.replace(/px/, '')
  }
  return NaN
}

// 12 => '12px'
export const px = (size: string | number = 0): string => {
  return num(size) + 'px'
}
