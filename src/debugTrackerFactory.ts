import * as vscode from 'vscode';
import { EditorDebugTracker } from './editorDebugTracker';
import { TerminalDebugTracker } from './terminalDebugTracker';

export class DebugTrackerFactory implements vscode.DebugAdapterTrackerFactory {

  createDebugAdapterTracker(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterTracker> {
    let sessionToCheck: vscode.DebugSession | undefined = session
    while (sessionToCheck) {
      if (sessionToCheck.configuration['searchable-debug-console.disabled'] === true) {
        return undefined;
      }
      sessionToCheck = sessionToCheck.parentSession;
    }
    //return new EditorDebugTracker(session);
    return new TerminalDebugTracker(session);
  }
}
