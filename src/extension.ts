import * as vscode from 'vscode';
import { DebugTrackerFactory } from './debugTrackerFactory';
import { LinkProvider } from './terminalLinks';
import { TerminalDebugTracker } from './terminalDebugTracker';

export function activate(context: vscode.ExtensionContext) {
  TerminalDebugTracker.ourViewColumn = context.workspaceState.get('ourViewColumn');
  context.subscriptions.push(
		vscode.debug.registerDebugAdapterTrackerFactory('*', new DebugTrackerFactory()),
    vscode.window.registerTerminalLinkProvider(new LinkProvider()),
    vscode.window.tabGroups.onDidChangeTabGroups((event) => {
      const mineOpened = event.opened?.find(group => group.viewColumn === TerminalDebugTracker.ourViewColumn);
      if (mineOpened) {
        context.workspaceState.update('ourViewColumn', TerminalDebugTracker.ourViewColumn);
      }
      const mineClosed = event.closed?.find(group => group.viewColumn === TerminalDebugTracker.ourViewColumn);
      if (mineClosed) {
        context.workspaceState.update('ourViewColumn', undefined);
      }
    }),
	  );
  }

export function deactivate() {}
