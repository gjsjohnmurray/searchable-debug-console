import * as vscode from 'vscode';

export class TerminalPty implements vscode.Pseudoterminal {
    onDidWrite: vscode.Event<string>;
    onDidOverrideDimensions?: vscode.Event<vscode.TerminalDimensions | undefined> | undefined;
    onDidClose?: vscode.Event<number | void> | undefined;
    onDidChangeName?: vscode.Event<string> | undefined;

    private readonly writeEmitter = new vscode.EventEmitter<string>();

    constructor() {
        this.onDidWrite = this.writeEmitter.event;
    }

    open(initialDimensions: vscode.TerminalDimensions | undefined): void {
    }

    close(): void {
    }

    writeMessage(message: string): void {
        this.writeEmitter.fire(message);
    }

    handleInput?(data: string): void {
        throw new Error('Input not accepted');
    }

    setDimensions?(dimensions: vscode.TerminalDimensions): void {
    }
    
}