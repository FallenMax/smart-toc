// '12px' => 12
export const num = (size: string | number = '0'): number =>
  typeof size === 'number' ? size : +size.replace(/px/, '')

// '12px' <= 12
export const px = (size: string | number = 0): string => num(size) + 'px'
