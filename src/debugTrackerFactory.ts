import * as vscode from 'vscode';
import { EditorDebugTracker } from './editorDebugTracker';
import { TerminalDebugTracker } from './terminalDebugTracker';

export class DebugTrackerFactory implements vscode.DebugAdapterTrackerFactory {

  createDebugAdapterTracker(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterTracker> {
    //return new EditorDebugTracker(session);
    return new TerminalDebugTracker(session);
  }
}
