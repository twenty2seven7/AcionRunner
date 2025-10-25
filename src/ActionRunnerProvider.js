const vscode = require('vscode');
const path = require('path');
const fs = require('fs');



class ActionRunnerProvider {

    constructor(context) {
        this._context = context;
        this._view = undefined;
        this._config_path = undefined;
    };


    async _handleMessage(message) {
        switch (message.command) {
            case 'refresh':
                this.refresh();
                break;
            case 'addAction':
                await this.addAction();
                break;
            case 'openSettings':
                await this.openSettings();
                break;
            case 'runAction':
                await this.runAction(message.actionId);
                break;
            case 'editActionFile':
                await this.editActionFile(message.actionId);
                break;
            case 'showActionRow':
                await this.showActionRow(message.actionId);
                break;
            case 'deleteAction':
                await this.deleteAction(message.actionId);
                break;
        }
    };


    _set_config_path(webviewView) {
        if (webviewView.viewType === 'projectActionRunnerView') {
            this._config_path = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.vscode', 'actions_runner.json');
        } else {
            this._config_path = path.join(this._context.globalStorageUri.fsPath, 'actions_runner.json');
        }
        fs.mkdirSync(path.dirname(this._config_path), { recursive: true });
        if (!fs.existsSync(this._config_path)) {
            fs.writeFileSync(this._config_path, JSON.stringify({}, null, 2));
        }
    }


    _getActions() {
        let actions = new Map();
        try {
            if (fs.existsSync(this._config_path)) {
                const actions_file = fs.readFileSync(this._config_path, 'utf8');
                actions = new Map(Object.entries(JSON.parse(actions_file)));
            }
        } catch (err) {
            console.error('Failed to read actions config:', err);
        }
        return actions;
    }


    // MARK: HTML context
    _getHtmlForWebview(actions) {
        const styleUri = this._view.webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'resources', 'style.css'));
        const startIconUri = this._view.webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'resources', 'start.svg'));
        const scriptIconUri = this._view.webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'resources', 'script.svg'));
        const editIconUri = this._view.webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'resources', 'edit.svg'));
        const deleteIconUri = this._view.webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'resources', 'delete.svg'));
        let HTML_context = '';
        HTML_context +=
        `<!DOCTYPE html>\n` +
        `   <head>\n`;
        HTML_context +=
        `   </head>\n` +
        `       <meta charset="UTF-8">\n` +
        `       <meta name="viewport" content="width=device-width, initial-scale=1.0">\n` +
        `       <link href="${styleUri}" rel="stylesheet">\n` +
        `   <body>\n`;
        HTML_context +=
        `       <div class="actions-list">\n`;
        if (actions.size == 0) {
            HTML_context +=
        `           <h3> No events added. </h3>\n`;
        } else {
            for (const [actionId, action] of actions) {
                let description = action.description || "Run: " + action.path;
                let info = 
                    `name: ${action.name}\n` +
                    `type: ${action.type}\n` +
                    `description: ${action.description}\n` +
                    `path: ${action.path}\n` +
                    `args: ${action.args.map(a => `&quot;${a}&quot;`).join(' ') || ''}`;
                HTML_context +=
        `           <div class="action-card" title="${info}">\n` +
        `               <div class="action-card-buttons">\n` +
        `                   <button class="button-start" onclick="runAction('${actionId}')"> <img src="${startIconUri}"> </button>\n` +
        `               </div>\n` +
        `               <div class="action-card-text">\n` +
        `                   <div class="action-name"> ${action.name} </div>\n`;
                HTML_context +=
        `                   <div class="action-description"> ${description} </div>\n`;
                HTML_context +=
        `               </div>\n` +
        `               <div class="action-card-buttons">\n`;
                if (!['bin', 'exe'].includes(action.type)) {
                    HTML_context +=
        `                   <button class="button-edit" onclick="editActionFile('${actionId}')"> <img src="${scriptIconUri}"> </button>\n`;
                }
                HTML_context +=
        `                   <button class="button-edit" onclick="showActionRow('${actionId}')"> <img src="${editIconUri}"> </button>\n` +
        `                   <button class="button-delete" onclick="deleteAction('${actionId}')"> <img src="${deleteIconUri}"> </button>\n` +
        `               </div>\n` +
        `           </div>\n`;
            }
            HTML_context +=
        `           <script> \n` +
        `               const vscode = acquireVsCodeApi();\n` +
        `               function runAction(id) {\n` +
        `                   vscode.postMessage({command: "runAction", actionId: id})\n` +
        `               }\n` +
        `               function editActionFile(id) {\n` +
        `                   vscode.postMessage({command: "editActionFile", actionId: id})\n` +
        `               }\n` +
        `               function showActionRow(id) {\n` +
        `               vscode.postMessage({command: "showActionRow", actionId: id})\n` +
        `               }\n` +
        `               function deleteAction(id) {\n` +
        `                   vscode.postMessage({command: "deleteAction", actionId: id})\n` +
        `               }\n` +
        `           </script> \n`;
        }
        HTML_context +=
        `       </div>\n` +
        `   </body>\n` +
        `</html>\n`;
        return HTML_context;
    }


    resolveWebviewView(webviewView) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this._context.extensionUri, 'resources')]
        };
        this._set_config_path(webviewView);
        webviewView.webview.onDidReceiveMessage((message) => this._handleMessage(message));
        this.refresh();
    }


    // MARK: VIEW commands

    refresh() {
        let actions = {};
        if (this._view) {
            actions = this._getActions();
        }
        this._view.webview.html = this._getHtmlForWebview(actions);
    };


    async addAction() {
        const action_type = await vscode.window.showQuickPick(
            ['text', 'python', 'node', 'bash', 'bin', 'bat', 'exe'],
            { placeHolder: 'Select script type', canPickMany: false }
        ) || 'text';

        const fileUri = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: 'Select action file',
            filters: {
                'All files': ['*']
            }
        });
        if (!fileUri || fileUri.length === 0) {
            return;
        }
        const actionPath = fileUri[0].fsPath;
        const defaultName = path.basename(actionPath);
        const name = await vscode.window.showInputBox({
            prompt: 'Action name',
            value: defaultName,
            validateInput: function(value) {
                return value.trim() ? null : 'Name cannot be empty';
            }
        });
        if (!name) {
            return;
        }

        const description = await vscode.window.showInputBox({
            prompt: 'Script description (optional)',
            placeHolder: 'A brief description of what the script does'
        });

        let actions = this._getActions();
        const newAction = {
            name: name.trim(),
            type: action_type,
            description: description ? description.trim() : '',
            path: actionPath,
            args: []
        };
        actions.set(Date.now().toString(), newAction);
        fs.writeFileSync(this._config_path, JSON.stringify(Object.fromEntries(actions), null, 2), 'utf8');
        vscode.window.showInformationMessage('Action "' + name + '" added');
        this.refresh();
    };


    async openSettings() {
        const doc = await vscode.workspace.openTextDocument(this._config_path);
        await vscode.window.showTextDocument(doc);
    };


    // MARK: Actions methods

    _argsResolve(args) {
        if (!Array.isArray(args) || args.length === 0) {
            return '';
        }
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const workspaceFolder = workspaceFolders && workspaceFolders.length > 0
            ? workspaceFolders[0].uri.fsPath
            : '';

        const activeEditor = vscode.window.activeTextEditor;
        const fileUri = activeEditor?.document?.uri;
        const filePath = fileUri ? fileUri.fsPath : '';
        const fileDirname = filePath ? path.dirname(filePath) : '';
        const fileBasename = filePath ? path.basename(filePath) : '';
        const fileExtname = filePath ? path.extname(filePath) : '';
        const fileBasenameNoExt = fileBasename.replace(fileExtname, '');

        const vars = {
            '${workspaceFolder}': workspaceFolder,
            '${file}': filePath,
            '${fileDirname}': fileDirname,
            '${fileBasename}': fileBasename,
            '${fileExtname}': fileExtname,
            '${fileBasenameNoExt}': fileBasenameNoExt,
        };

        return args
            .map(arg => {
                let str = String(arg);
                for (const [key, value] of Object.entries(vars)) {
                    if (str.includes(key)) {
                        str = str.replaceAll(key, value);
                    }
                }
                return str;
            });
    }

    async runAction(actionId) {
        if (!fs.existsSync(this._config_path)) {
            vscode.window.showErrorMessage('Config not found.');
            return;
        }
        const actions_file = fs.readFileSync(this._config_path, 'utf8');
        const actions = new Map(Object.entries(JSON.parse(actions_file)));
        const action = actions.get(actionId);
        if (!action) {
            vscode.window.showErrorMessage('Action not found.');
            return;
        }
        if (!fs.existsSync(action.path)) {
            vscode.window.showErrorMessage('File not found: ' + action.path);
            return;
        }
        const cwd = path.dirname(action.path);
        const type = action.type || 'text';
        const platform = process.platform;
        let shellPath = undefined;
        let shellArgs = undefined;
        const args = this._argsResolve(action.args);
        switch (type) {
            case 'text':
                await vscode.window.showTextDocument(vscode.Uri.file(action.path));
                return;

            case 'python':
                if (platform === 'win32') {
                    shellPath = 'cmd.exe';
                    shellArgs = ['/k', 'python', action.path, ...args];
                } else {
                    shellPath = 'bash';
                    shellArgs = ['-c', `python "${action.path}" ${args.join(' ')}`];
                }
                break;

            case 'bash':
                shellPath = 'bash';
                shellArgs = ['-c', `"${action.path}" ${args.join(' ')}`];
                break;

            case 'bat':
                shellPath = 'cmd.exe';
                shellArgs = ['/k', action.path, ...args];
                break;

            case 'exe':
                shellPath = 'cmd.exe';
                shellArgs = ['/k', action.path, ...args];
                break;

            case 'bin':
                shellPath = 'bash';
                shellArgs = ['-c', action.path, ...args];
                break;

            default:
                vscode.window.showWarningMessage(`Unknown action type: ${type}`);
                return;
        }
        const terminal = vscode.window.createTerminal({
            name: `Action: ${action.name}`,
            cwd,
            shellPath,
            shellArgs,
            isTransient: false
        });
        terminal.show();
    };


    async editActionFile(actionId) {
        const action = this._getActions().get(actionId);
        if (!action) {
            vscode.window.showErrorMessage('Action not found.');
            return;
        }
        const doc = await vscode.workspace.openTextDocument(action.path);
        await vscode.window.showTextDocument(doc);
    };


    async showActionRow(actionId) {
        const settingFileUri = vscode.Uri.file(this._config_path);
        const actions_setting_file = await vscode.workspace.fs.readFile(settingFileUri);
        const content = new TextDecoder('utf-8').decode(actions_setting_file).split(/\r?\n/);
        let lineNumber = -1;
        for (let i = 0; i < content.length; i++) {
            if (content[i].includes(`"${actionId}":`)) {
                lineNumber = i;
                break;
            }
        }
        if (lineNumber === -1) {
            return;
        }
        const document = await vscode.workspace.openTextDocument(this._config_path);
        const editor = await vscode.window.showTextDocument(document, { preview: false });
        const position = new vscode.Position(lineNumber, 0);
        const range = new vscode.Range(position, position);
        editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
        editor.selection = new vscode.Selection(position, position);
    };


    async deleteAction(actionId) {
        let actions = this._getActions();
        const action = actions.get(actionId);
        if (!action) {
            vscode.window.showErrorMessage('Action not found.');
            return;
        }

        const confirm = await vscode.window.showWarningMessage(
            `Are you sure you want to delete the action "${action.name}"?`,
            'Yes',
            'No'
        );
        if (confirm === 'Yes') {
            actions.delete(actionId);
            fs.writeFileSync(this._config_path, JSON.stringify(Object.fromEntries(actions), null, 2), 'utf8');
            vscode.window.showInformationMessage(`Action "${action.name}" deleted.`);
            this.refresh();
        }
    }

};

module.exports = { ActionRunnerProvider };