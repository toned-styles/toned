import getConfig from './config.auto.ts'
import { defineContext, TokensContext } from './context.ts'

export default getConfig(TokensContext, defineContext({}))
