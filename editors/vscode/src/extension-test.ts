import { strict as assert } from 'node:assert'
import * as vscode from 'vscode'

/** Runs in an isolated real VS Code extension host; changes stay unsaved. */
export async function run() {
  const folder = vscode.workspace.workspaceFolders?.[0]
  assert.ok(folder)
  const uri = vscode.Uri.joinPath(folder.uri, 'src/badge.tsx')
  const document = await vscode.workspace.openTextDocument(uri)
  const editor = await vscode.window.showTextDocument(document)
  await vscode.extensions.getExtension('toned.toned-vscode')!.activate()
  const deadline = Date.now() + 90_000
  let statistics: {
    files?: number
    workspaces?: Record<string, { state: string }>
  } = {}
  do {
    statistics = await vscode.commands.executeCommand('toned.indexStatus')
    if (
      Object.values(statistics.workspaces ?? {}).every(
        (value) => value.state === 'complete',
      ) &&
      (statistics.files ?? 0) >= 3
    )
      break
    assert.ok(Date.now() < deadline, JSON.stringify(statistics))
    await new Promise((resolve) => setTimeout(resolve, 200))
  } while (Date.now() < deadline)
  assert.ok((statistics.files ?? 0) >= 3)
  assert.ok(
    Object.values(statistics.workspaces ?? {}).every(
      (value) => value.state === 'complete',
    ),
  )
  const text = document.getText(),
    match = /bgColor:\s*'([^']+)'/.exec(text)
  assert.ok(match)
  const position = document.positionAt(match.index + match[0].indexOf("'") + 1)
  editor.selection = new vscode.Selection(position, position)
  const result = await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider',
    uri,
    position,
  )
  assert.ok(
    result?.items.some((item) => item.label === 'primary'),
    'real editor completion should include the fixture primary token',
  )
  const hover = await vscode.commands.executeCommand('toned.inspectSelection')
  assert.ok(
    JSON.stringify(hover).includes('bgColor'),
    'Toned hover must name the actual declaration',
  )
  const definitions = await vscode.commands.executeCommand<
    (vscode.Location | vscode.LocationLink)[]
  >(
    'vscode.executeDefinitionProvider',
    uri,
    document.positionAt(match.index + 2),
  )
  assert.ok(
    definitions?.some((item) =>
      ('uri' in item ? item.uri : item.targetUri).path.endsWith('/tokens.ts'),
    ),
    'definition should reach the fixture vocabulary',
  )
  const finite = /radius:\s*'([^']+)'/.exec(text)
  assert.ok(finite)
  const valueStart = finite.index + finite[0].indexOf("'") + 1
  const valueRange = new vscode.Range(
    document.positionAt(valueStart),
    document.positionAt(valueStart + finite[1].length),
  )
  try {
    await editor.edit((edit) =>
      edit.replace(valueRange, '__toned_invalid_value__'),
    )
    const diagnosticDeadline = Date.now() + 10_000
    while (
      !vscode.languages
        .getDiagnostics(uri)
        .some((item) => item.source === 'toned' && item.code === 'token-value')
    ) {
      assert.ok(
        Date.now() < diagnosticDeadline,
        'Toned must diagnose the invalid unsaved token value',
      )
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    // Applying an editor completion must update the live buffer without writing the file.
    const completions =
      await vscode.commands.executeCommand<vscode.CompletionList>(
        'vscode.executeCompletionItemProvider',
        uri,
        document.positionAt(valueStart),
      )
    const primary = completions?.items.find((item) => item.label === 'full')
    assert.ok(primary)
    const range =
      primary.range instanceof vscode.Range
        ? primary.range
        : primary.range?.replacing
    assert.ok(range)
    assert.equal(typeof primary.insertText, 'string')
    await editor.edit((edit) =>
      edit.replace(range, primary.insertText as string),
    )
    const clearDeadline = Date.now() + 10_000
    while (
      vscode.languages
        .getDiagnostics(uri)
        .some((item) => item.source === 'toned' && item.code === 'token-value')
    ) {
      assert.ok(
        Date.now() < clearDeadline,
        'Valid completion must clear the diagnostic',
      )
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    assert.ok(document.getText().includes("radius: 'full'"))
    assert.equal(
      document.getText(),
      text,
      'Completing the original value restores the source',
    )
  } finally {
    await editor.edit((edit) =>
      edit.replace(
        new vscode.Range(
          document.positionAt(0),
          document.positionAt(document.getText().length),
        ),
        text,
      ),
    )
    await vscode.commands.executeCommand('workbench.action.files.revert')
  }
  console.log(
    'Toned real VS Code acceptance passed: standalone workspace indexing, completion, hover, definition, unsaved diagnostics and completion edits',
  )
}
