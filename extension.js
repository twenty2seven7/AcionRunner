const vscode = require('vscode');

const { ActionRunnerProvider } = require('./src/ActionRunnerProvider');



function activate(context) {
    // MARK: projectActionRunnerView
    const projectProvider = new ActionRunnerProvider(context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('projectActionRunnerView', projectProvider)
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('projectActionRunner.refresh', function() {
            projectProvider.refresh();
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('projectActionRunner.addAction', function() {
            projectProvider.addAction();
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('projectActionRunner.openSettings', function() {
            projectProvider.openSettings();
        })
    );

    // MARK: globalActionRunnerView
    const globalProvider = new ActionRunnerProvider(context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('globalActionRunnerView', globalProvider)
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('globalActionRunner.refresh', function() {
            globalProvider.refresh();
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('globalActionRunner.addAction', function() {
            globalProvider.addAction();
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('globalActionRunner.openSettings', function() {
            globalProvider.openSettings();
        })
    );
};

function deactivate() {};

module.exports = { activate, deactivate };