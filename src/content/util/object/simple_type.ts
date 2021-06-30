export type TypeString =
  | 'null'
  | 'undefined'
  | 'array'
  | 'number'
  | 'string'
  | 'object'
  | 'boolean'
  | 'bigint'
  | 'symbol'
  | 'date'
  | 'function'

export const type = (o: any): TypeString => {
  if (o === null) return 'null'
  if (o === undefined) return 'undefined'
  if (Array.isArray(o)) return 'array'
  if (o instanceof Date) return 'date'

  return typeof o
}
