import { isDebugging } from './env'

export const logger = isDebugging
  ? console
  : {
      info(...args: any[]) {},
      warn(...args: any[]) {
        console.warn(...args)
      },
      error(...args: any[]) {
        console.error(...args)
      },
      table(...args: any[]) {},
    }
