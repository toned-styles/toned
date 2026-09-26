# Toned for VS Code

This optional client runs the bundled Toned language server alongside TypeScript.
It supplies token completion, source navigation, diagnostics and revision-aware
literal edit proposals. Source inspection never executes application modules.

From an HQ checkout, run `pnpm --filter toned-vscode package`, then install
`vendor/toned/editors/vscode/dist/toned-vscode.vsix` with VS Code's **Extensions:
Install from VSIX** command. Open or reload this workspace. HQ's committed
`.vscode/settings.json` supplies its source directories and module mappings.
The VSIX is local; this extension is not yet published to the marketplace.

Use **Toned: Inspect Current Declaration**, **Toned: Show Index Status** and
**Toned: Restart Language Server** from the command palette. Results appear in
the Toned output channel. TypeScript remains responsible for general type errors;
Toned adds knowledge of token vocabularies and declaration ownership.

`toned.include` bounds indexing to relative directories, and `toned.modules`
maps module names (optionally containing one wildcard) to relative source paths.
Restarting happens automatically when these settings change. Generated and
dependency directories are excluded even if a watcher reports them. At most four
workspace folders have a server process, each with a 384 MiB V8 heap limit;
start-up is lazy when a supported document opens. Initialization has a ten-second
deadline. Restart and deactivation cancel pending initialization and terminate
and reap the owned server, forcibly if it ignores shutdown. Server indexing/query budgets
are documented in the compiler package. Full-document synchronization allows
bounded recovery after an oversized edit; unchanged sources reuse the index.

The extension is disabled in untrusted and virtual workspaces. It uses its own
bundled server, accepts no workspace executable path, and performs no telemetry
or network calls. Source edits are applied by the editor; no filesystem write
bridge is started by this client.

## Editor acceptance

The standalone fixture under `fixture/` contains its own system, tokens and sheet;
it does not require an HQ checkout. With VS Code installed, run:

```sh
VSCODE_EXECUTABLE_PATH="/Applications/Visual Studio Code.app/Contents/MacOS/Code" pnpm --filter toned-vscode test:editor
```

On Linux, set the variable to the installed GUI executable instead. The runner
uses a temporary copy of the fixture and fresh user/extension directories, then
removes them. It downloads nothing, disables the built-in TypeScript extension
for this test, and verifies Toned indexing, completion, hover, definition,
unsaved diagnostics and completion edits in the actual extension host. The
120-second deadline and process-group cleanup currently require macOS or Linux;
the extension itself also supports Windows. The HQ repository separately tests
its real source graph through its own stdio acceptance script.

Unexpected server crashes evict the failed workspace session and show a warning.
Opening another source document, running a Toned command, or selecting **Restart**
starts a fresh session; recovery does not automatically loop on a crashing index.
A slow transport close after confirmed process exit is reported and released.
If the OS has not confirmed termination, ownership is retained and the next stop
can retry, rather than permanently caching a rejected shutdown promise.
