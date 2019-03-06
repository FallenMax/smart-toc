export const assert = (condition: any, message: string): void => {
  if (!condition) {
    throw new Error(message)
  }
}

export const assertNever = (o: never): never => {
  throw new TypeError('Unexpected type:' + JSON.stringify(o))
}
