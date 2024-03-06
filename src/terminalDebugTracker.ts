import * as vscode from 'vscode';
import { TerminalPty } from './terminalPty';
import { Link } from './terminalLinks';

export const mapTerminalDebugTrackers: Map<vscode.Terminal, TerminalDebugTracker> = new Map<vscode.Terminal, TerminalDebugTracker>();

let ourFirstTerminalName: string | undefined = undefined;

export class TerminalDebugTracker implements vscode.DebugAdapterTracker {

  static ourViewColumn: vscode.ViewColumn | undefined = undefined;
  static sessionCount: number = 0;

  static closeTerminals() {
    mapTerminalDebugTrackers.forEach((_tracker, terminal) => {
      terminal.show(false);
      vscode.commands.executeCommand('workbench.action.terminal.killEditor');
    });
  }

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
        return `*** [${new Date().toLocaleString()}] - ${message}`;
      }
      const output = message.body?.output.replace(/\n$/, '');
      const color = message.body.category === 'stdout' ? '\x1b[34m' : message.body.category === 'stderr' ? '\x1b[31m' : '\x1b[33m';
      const lineNumber = ++this.lineNumber;
      if (message.body.source) {
        this.linkMap.set(lineNumber, { startIndex: 0, length: 2 + lineNumber.toString().length, tooltip: `${message.body.source?.name}:${message.body.line}:${message.body.column} (${message.body.category})`, sourcePath: message.body.source.path, line: message.body.line, column: message.body.column});
        return `${color}[${lineNumber}] ${output}${color ? '\x1b[0m' : ''}`;
      }
      return `${color}(${lineNumber}) ${output}${color ? '\x1b[0m' : ''}`;
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

  private get rootSession(): vscode.DebugSession {
    let session: vscode.DebugSession = this.session;
    while (session.parentSession) {
      session = session.parentSession;
    }
    return session;
  }

  onDidSendMessage(message: any): void {

    if (message.type === 'event' && message.event === 'output' && ['stdout', 'stderr', 'console', 'important'].includes(message.body?.category)) {
      this.queuedMessages.push(message);
      if (!this.timeout) {
        this.timeout= setTimeout(async () => {
          const messages = [ ...this.queuedMessages ];
          this.queuedMessages = [];
          this.timeout = undefined;
          if (!TerminalDebugTracker.ourViewColumn && ourFirstTerminalName) {
            vscode.window.tabGroups.all.forEach(group => {
              TerminalDebugTracker.ourViewColumn = group.tabs.find(tab => tab.label === ourFirstTerminalName)?.group?.viewColumn;
              if (TerminalDebugTracker.ourViewColumn) {
                return;
              }
            });
          }
          if (!this.pty) {
            // First message has been output from the session, so we can create the terminal in the editor area
            this.pty = new TerminalPty();
            const name = `Debug Output: ${this.rootSession.name.split(':')[0] ?? this.rootSession.name}`;
            this.terminal = vscode.window.createTerminal({
              name,
              pty: this.pty,
              location: { preserveFocus: true, viewColumn: TerminalDebugTracker.ourViewColumn !== undefined ? TerminalDebugTracker.ourViewColumn : vscode.ViewColumn.Beside },
              iconPath: new vscode.ThemeIcon('debug-console'),
              isTransient: true,
            });
            if (!ourFirstTerminalName) {
              ourFirstTerminalName = name;
            }
            mapTerminalDebugTrackers.set(this.terminal, this);
            this.terminal.dispose = () => {
              mapTerminalDebugTrackers.delete(this.terminal!);
              if (mapTerminalDebugTrackers.size === 0) {
                ourFirstTerminalName = undefined;
                TerminalDebugTracker.ourViewColumn = undefined;
              }
            }
            // Prepend a header to the initial message
            messages.unshift(`Debug session ${this.session.name} (${this.session.type}) [${new Date().toLocaleString()}]`);
            // Requeue messages and return, giving time for the terminal to be ready.
            // The initial messages will be written when timeout happens after the next incoming message
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
        50
        );
      }
      //console.log(`**${outcome}: (${message.body.category}) from ${this.session.type} session ${this.session.name}: ${message.body.output} [${message.body.source.name}:${message.body.line}:${message.body.column}]`);
    }
  }

  onWillStartSession(): void {
    // Close all leftover terminals if this is the first session of a new run
    if (!TerminalDebugTracker.sessionCount) {
      TerminalDebugTracker.closeTerminals();
      //mapTerminalDebugTrackers.clear();
    }

    TerminalDebugTracker.sessionCount++;
    //console.log(`**Starting session ${this.session.name}, run.name = ${this.run?.name}`);
  }

  onWillStopSession(): void {
    this.writeMessages([...this.queuedMessages, `Stopping session ${this.session.name}`]);
    this.queuedMessages = [];
    TerminalDebugTracker.sessionCount--;
    //console.log(`**Stopping session ${this.session.name}`);
  }

  onError(error: Error): void {
    if (error.message !== 'connection closed') {
      this.writeMessages([...this.queuedMessages, `Erroring session ${this.session.name}: error.message=${error.message}`]);
      this.queuedMessages = [];
    }
    //console.log(`**Erroring session ${this.session.name}: error.message=${error.message}`);
  }

  onExit(code: number | undefined, signal: string | undefined): void {
    this.writeMessages([...this.queuedMessages, `Exiting session ${this.session.name}: code=${code}, signal=${signal}`]);
    this.queuedMessages = [];
    //console.log(`**Exiting session ${this.session.name}: code=${code}, signal=${signal}`);
  }
}
