export function assert(condition: any, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

export const assertNever = (o: never): never => {
  throw new TypeError('Unexpected type:' + JSON.stringify(o))
}
