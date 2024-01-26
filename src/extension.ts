import * as vscode from 'vscode';
import { DebugTrackerFactory } from './debugTrackerFactory';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
		vscode.debug.registerDebugAdapterTrackerFactory('*', new DebugTrackerFactory())
	  );
  }

export function deactivate() {}
