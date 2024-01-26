import * as vscode from 'vscode';
import { DebugTracker } from './debugTracker';

export class DebugTrackerFactory implements vscode.DebugAdapterTrackerFactory {

  createDebugAdapterTracker(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterTracker> {
    return new DebugTracker(session);
  }
}
