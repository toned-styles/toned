/**
 * The `react-server` entry of `@toned/react`, chosen for React Server
 * Components.
 *
 * `useStyles` and `createElements` resolve here without hooks or context.
 * The rest of the package needs context or state, and its props (a renderer,
 * a derived stylesheet) cannot cross from a Server Component to a client one,
 * so those exports say where they belong instead of failing obscurely. The
 * client entry is not loaded: it imports hooks the server build of React does
 * not have.
 */
import type * as client from './index.ts'
import {
  createElements as serverCreateElements,
  useStyles as serverUseStyles,
} from './server.tsx'

export type * from './index.ts'
export { registerRenderer } from './server-registry.ts'

export const useStyles: typeof client.useStyles =
  serverUseStyles as unknown as typeof client.useStyles
export const createElements: typeof client.createElements =
  serverCreateElements as unknown as typeof client.createElements

const clientOnly = <T>(name: string): T =>
  (() => {
    throw new Error(
      `[toned] ${name} needs React context, so it cannot run in a Server Component. Use it from a file marked "use client".`,
    )
  }) as T

export const TonedProvider: typeof client.TonedProvider =
  clientOnly('TonedProvider')
export const ConfigProvider: typeof client.ConfigProvider =
  clientOnly('ConfigProvider')
export const StyleOverrides: typeof client.StyleOverrides =
  clientOnly('StyleOverrides')
export const useBind: typeof client.useBind = clientOnly('useBind')
export const bind: typeof client.bind = clientOnly('bind')
export const ContainerSizesContext = new Proxy(
  {},
  {
    get: () => clientOnly<() => never>('ContainerSizesContext')(),
  },
) as typeof client.ContainerSizesContext
