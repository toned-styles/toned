import type { Config, HostConditions } from '@toned/core'

const CONTROLLER = Symbol.for('@toned/react/styles-controller')
type Controller = {
  config: Config
  elementDescriptors(): Array<{ key: string }>
}
/** Public part names never share a namespace with controller internals. */
export function elementProps(
  controller: Controller,
  key: string,
  conditions?: HostConditions,
) {
  return controller.config.getProps.call(controller, key, conditions)
}
export function styleView(controller: Controller): object {
  const view = Object.create(null)
  Object.defineProperty(view, CONTROLLER, { value: controller })
  for (const { key } of controller.elementDescriptors())
    Object.defineProperty(view, key, {
      enumerable: true,
      get: () => elementProps(controller, key),
    })
  return Object.freeze(view)
}
export function controllerOf(view: object): Controller {
  const controller = (view as Record<symbol, unknown>)[CONTROLLER]
  if (!controller) throw new Error('Toned: expected a useStyles snapshot')
  return controller as Controller
}
