import * as vscode from 'vscode';
import { DebugTrackerFactory } from './debugTrackerFactory';
import { LinkProvider } from './terminalLinks';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
		vscode.debug.registerDebugAdapterTrackerFactory('*', new DebugTrackerFactory()),
    vscode.window.registerTerminalLinkProvider(new LinkProvider())
	  );
  }

export function deactivate() {}
