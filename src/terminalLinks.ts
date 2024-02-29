import * as vscode from 'vscode';
import { mapTerminalDebugTrackers } from './terminalDebugTracker';

export interface Link extends vscode.TerminalLink {
    source: string;
    line: number;
    column: number;
}

export class LinkProvider implements vscode.TerminalLinkProvider<Link> {
    provideTerminalLinks(context: vscode.TerminalLinkContext, token: vscode.CancellationToken): vscode.ProviderResult<Link[]> {
        if (!mapTerminalDebugTrackers.has(context.terminal)) {
            return [];
        }
        const reLineNumber = context.line.match(/^\[(\d+)\]/);
        if (!reLineNumber) {
            return [];
        }
        const lineNumber = parseInt(reLineNumber[1]);
        return [mapTerminalDebugTrackers.get(context.terminal)!.linkMap.get(lineNumber)! as Link];

    }
    handleTerminalLink(link: Link): vscode.ProviderResult<void> {
        vscode.commands.executeCommand('vscode.openWith', vscode.Uri.file(link.source), 'default', { preview: true, selection: new vscode.Range(link.line - 1, 0, link.line - 1, link.column) });
    }
}