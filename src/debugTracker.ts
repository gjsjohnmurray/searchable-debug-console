import * as vscode from 'vscode';

export class DebugTracker implements vscode.DebugAdapterTracker {

  private session: vscode.DebugSession;
  private document: vscode.TextDocument | undefined;
  private editor: vscode.TextEditor | undefined;

  private timeout: NodeJS.Timeout | undefined;

  private queuedMessages: any[] = [];

  constructor(session: vscode.DebugSession) {
    this.session = session;
  }
  private async appendMessages(messages: any[]): Promise<boolean> {
    const composeText = (message: any): string => {
      if (!message.body) {
        return `** [${new Date().toLocaleString()}] - ${message}`;
      }
      const output = message.body?.output.replace(/\n$/, '');
      return `${output} [${message.body.source.name}:${message.body.line}:${message.body.column} (${message.body.category})]`
    }
    
    if (!this.editor) {
      return false;
    }
    return this.editor.edit((editBuilder) => {
      messages.forEach((message) => {
        editBuilder.insert(new vscode.Position(this.editor!.document.lineCount, 0), `${composeText(message)}\n`);
      });
    }, { undoStopBefore: false, undoStopAfter: false });
  }

  onDidSendMessage(message: any): void {

    if (message.type === 'event' && message.event === 'output' && ['stdout', 'stderr'].includes(message.body?.category)) {
      this.queuedMessages.push(message);
      if (!this.timeout) {
        this.timeout= setTimeout(async () => {
          const messages = [ ...this.queuedMessages ];
          this.queuedMessages = [];
          this.timeout = undefined;
          if (!this.document) {
              const document = await vscode.workspace.openTextDocument({ language: 'plaintext', content: `Debug session ${this.session.name} (${this.session.type}) [${new Date().toLocaleString()}]\n` });
              const editor = await vscode.window.showTextDocument(document, { preview: false, preserveFocus: true});
              this.document = document;
              this.editor = editor;
          }
          const outcome = await this.appendMessages(messages);
          if (outcome) {
            //console.log(`Appended ${messages.length} messages OK`)
          }
          else {
            console.log(`Failed to append ${messages.length} messages`)
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
    this.appendMessages([`Stopping session ${this.session.name}`]);
    //console.log(`**Stopping session ${this.session.name}`);
  }

  onError(error: Error): void {
    if (error.message !== 'connection closed') {
      this.appendMessages([`Erroring session ${this.session.name}: error.message=${error.message}`]);
    }
    //console.log(`**Erroring session ${this.session.name}: error.message=${error.message}`);
  }

  onExit(code: number | undefined, signal: string | undefined): void {
    this.appendMessages([`Exiting session ${this.session.name}: code=${code}, signal=${signal}`]);
    //console.log(`**Exiting session ${this.session.name}: code=${code}, signal=${signal}`);
  }
}
