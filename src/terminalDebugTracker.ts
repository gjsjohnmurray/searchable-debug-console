import * as vscode from 'vscode';
import { TerminalPty } from './terminalPty';
import { Link } from './terminalLinks';

export const mapTerminalDebugTrackers: Map<vscode.Terminal, TerminalDebugTracker> = new Map<vscode.Terminal, TerminalDebugTracker>();

export class TerminalDebugTracker implements vscode.DebugAdapterTracker {

  private session: vscode.DebugSession;
  private terminal: vscode.Terminal | undefined;
  private pty: TerminalPty | undefined;
  private timeout: NodeJS.Timeout | undefined;
  private queuedMessages: any[] = [];
  private lineNumber: number = 0;
  public linkMap: Map<number, Link> = new Map<number, Link>();

  constructor(session: vscode.DebugSession) {
    this.session = session;
}
  private writeMessages(messages: any[]): boolean {
    const composeText = (message: any): string => {
      if (!message.body) {
        return `** [${new Date().toLocaleString()}] - ${message}`;
      }
      const output = message.body?.output.replace(/\n$/, '');
      this.linkMap.set(++this.lineNumber, { startIndex: 0, length: 2 + this.lineNumber.toString().length, tooltip: `${message.body.source.name}:${message.body.line}:${message.body.column} (${message.body.category})`, source: message.body.source.name, line: message.body.line, column: message.body.column});
      return `[${this.lineNumber}] ${output}`;
    };
    
    if (!this.pty) {
      return false;
    }

    messages.forEach((message) => {
      const output = `${composeText(message)}\r\n`;
      this.pty!.writeMessage(output);
    });
    return true;
  }

  onDidSendMessage(message: any): void {

    if (message.type === 'event' && message.event === 'output' && ['stdout', 'stderr'].includes(message.body?.category)) {
      this.queuedMessages.push(message);
      if (!this.timeout) {
        this.timeout= setTimeout(async () => {
          const messages = [ ...this.queuedMessages ];
          this.queuedMessages = [];
          this.timeout = undefined;
          if (!this.pty) {
            // First message has been output from the session, so we can create the terminal in the editor area
            this.pty = new TerminalPty();
            this.terminal = vscode.window.createTerminal({
              name: `Debug session ${this.session.name} (${this.session.type})`,
              pty: this.pty,
              location: { preserveFocus: true, viewColumn: vscode.ViewColumn.Beside },
              iconPath: new vscode.ThemeIcon('debug-console'),
              isTransient: true,
            });
            mapTerminalDebugTrackers.set(this.terminal, this);
            // Prepend a header to the initial message
            messages.unshift(`Debug session ${this.session.name} (${this.session.type}) [${new Date().toLocaleString()}]`);
            // Requeue messages and return, giving time for the terminal to be ready.
            // The initial messages will be written when timeout  happens after the next incoming message
            this.queuedMessages = [ ...messages ];
            return;
          }

          // Output the messages to our terminal
          const outcome = this.writeMessages(messages);
          if (outcome) {
            //console.log(`Appended ${messages.length} messages OK`)
          }
          else {
            console.log(`Failed to append ${messages.length} messages`);
            this.queuedMessages = [ ...messages, ...this.queuedMessages ];
          }
        },
        500
        );
      }
      //console.log(`**${outcome}: (${message.body.category}) from ${this.session.type} session ${this.session.name}: ${message.body.output} [${message.body.source.name}:${message.body.line}:${message.body.column}]`);
    }
  }

  onWillStartSession(): void {
    //console.log(`**Starting session ${this.session.name}, run.name = ${this.run?.name}`);
  }

  onWillStopSession(): void {
    this.writeMessages([`Stopping session ${this.session.name}`]);
    //console.log(`**Stopping session ${this.session.name}`);
  }

  onError(error: Error): void {
    if (error.message !== 'connection closed') {
      this.writeMessages([`Erroring session ${this.session.name}: error.message=${error.message}`]);
    }
    //console.log(`**Erroring session ${this.session.name}: error.message=${error.message}`);
  }

  onExit(code: number | undefined, signal: string | undefined): void {
    this.writeMessages([`Exiting session ${this.session.name}: code=${code}, signal=${signal}`]);
    //console.log(`**Exiting session ${this.session.name}: code=${code}, signal=${signal}`);
  }
}
