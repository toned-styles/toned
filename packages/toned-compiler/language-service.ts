/**
 * Browser-safe entry point: the transport-independent language service and
 * the index it reads. Nothing here imports Node built-ins or the LSP
 * transport, so it can run in a browser bundle or a Web Worker.
 */
export { DesignLanguageService } from './lsp/service.ts'
export { DesignProject, type ProjectOptions } from './project.ts'
