import * as vscode from 'vscode';
import {plugin} from './main';
import {Loc} from './types';

const scssDiagnostics = vscode.languages.createDiagnosticCollection('scss');

export function activate() {
    vscode.workspace.onDidChangeTextDocument(event => {
        checkUnusedSCSSItems(event.document);
    });
    vscode.workspace.onDidOpenTextDocument(event => {
        checkUnusedSCSSItems(event);
    });

    vscode.languages.registerCodeActionsProvider('scss', {
        provideCodeActions(document, range) {
            return codeAction('scss', document, range.start);
        },
    });

    vscode.languages.registerCodeActionsProvider('typescriptreact', {
        provideCodeActions(document, range) {
            return codeAction('tsx', document, range.start);
        },
    });

    vscode.commands.registerCommand('frename', async (args: {data: Info}) => {
        const p = args.data!;
        const newName = await vscode.window.showInputBox({value: p.scssEntity!.name});
        if (newName) {
            const scssReplaces = p.plugin.scss.rename(p.scssEntity!, newName);
            const tsxReplaces = p.plugin.tsx.rename(p.tsxEntity!, newName);
            await updateDoc(p.scssDocument, scssReplaces);
            await updateDoc(p.tsxDocument, tsxReplaces);
        }
    });

    vscode.languages.registerDefinitionProvider('typescriptreact', {
        async provideDefinition(document, position) {
            const info = await getInfo('tsx', document, position);
            if (!info) return;
            const {scssEntity, tsxEntity: _tsxEntity, scssDocument} = info;
            const tsxEntity = _tsxEntity!;
            if (scssEntity) {
                const {start, end} = scssEntity.pos.token;
                const location: vscode.Location = {
                    uri: vscode.Uri.file(scssDocument.fileName),
                    range: new vscode.Range(
                        new vscode.Position(start.line, start.column),
                        new vscode.Position(end.line, end.column),
                    ),
                };
                return location;
            } else if (tsxEntity!.kind !== 'element' || !info.plugin.shouldSkipTagName(tsxEntity.name)) {
                const newSCSSContent = info.plugin.scss.insert(tsxEntity);
                updateDoc(scssDocument, newSCSSContent);
            }
            return null;
        },
    });

    vscode.languages.registerDefinitionProvider('scss', {
        async provideDefinition(document, position) {
            const info = await getInfo('scss', document, position);
            if (!info) return;
            const {tsxEntity, tsxDocument} = info;
            if (tsxEntity) {
                const {start, end} = tsxEntity.pos.token;
                const location: vscode.Location = {
                    uri: vscode.Uri.file(tsxDocument.fileName),
                    range: new vscode.Range(
                        new vscode.Position(start.line, start.column),
                        new vscode.Position(end.line, end.column),
                    ),
                };
                return location;
            }
            return null;
        },
    });
}

function updateDoc(document: vscode.TextDocument, replaces: {text: string; range: Loc}[]) {
    const edit = new vscode.WorkspaceEdit();
    replaces.forEach(replace => {
        edit.replace(
            vscode.Uri.file(document.fileName),
            new vscode.Range(toPosition(replace.range.start), toPosition(replace.range.end)),
            replace.text,
        );
    });
    return vscode.workspace.applyEdit(edit);
}

async function codeAction(type: 'tsx' | 'scss', document: vscode.TextDocument, position: vscode.Position) {
    const data = await getInfo(type, document, position);
    if (
        data &&
        data.scssEntity &&
        data.tsxEntity &&
        data.scssEntity.kind !== 'mainComponent' &&
        data.scssEntity.kind !== 'component'
    ) {
        return [
            {
                command: 'frename',
                title: 'Rename',
                arguments: [
                    {
                        data: data,
                    },
                ],
            },
        ];
    }
}

type ReturnTypeNoPromise<T> = T extends (...args: any[]) => Promise<infer R> ? R : any;
export type Info = ReturnTypeNoPromise<typeof getInfo>;

async function getInfo(type: 'tsx' | 'scss', document: vscode.TextDocument, position: vscode.Position) {
    let tsxDocument;
    let scssDocument;
    if (type === 'tsx') {
        tsxDocument = document;
        const scssFileName = document.fileName.replace(/\.tsx$/, '.scss');
        scssDocument = await vscode.workspace.openTextDocument(scssFileName);
        if (!scssDocument) return;
    } else {
        scssDocument = document;
        const tsxFileName = document.fileName.replace(/\.scss$/, '.tsx');
        tsxDocument = await vscode.workspace.openTextDocument(tsxFileName);
        if (!tsxDocument) return;
    }
    const tsxContent = tsxDocument.getText();
    const scssContent = scssDocument.getText();
    const p = plugin(tsxDocument.fileName, tsxContent, scssContent);
    if (!p) return;
    const offset = document.offsetAt(position);
    let tsxEntity;
    let scssEntity;
    if (type === 'tsx') {
        tsxEntity = p.tsx.getEntity(offset);
        scssEntity = tsxEntity && p.tsx.getSCSSEntity(tsxEntity);
    } else {
        scssEntity = p.scss.getEntity(offset);
        tsxEntity = scssEntity && p.scss.getTSXEntity(scssEntity);
    }
    return {
        type,
        plugin: p,
        scssEntity,
        tsxEntity,
        tsxDocument,
        scssDocument,
    };
}

function toPosition(loc: {line: number; column: number}) {
    return new vscode.Position(loc.line, loc.column);
}

async function checkUnusedSCSSItems(doc: vscode.TextDocument) {
    const type = doc.fileName.endsWith('tsx') ? 'tsx' : doc.fileName.endsWith('scss') ? 'scss' : undefined;
    if (type) {
        const info = await getInfo(type, doc, new vscode.Position(0, 0));
        if (info) {
            const unusedItems = info.plugin.scss.findUnused();
            const diags = unusedItems.map(item => {
                const typeStr =
                    item.kind === 'mainComponent' ? 'main component' : item.kind === 'mod' ? 'modificator' : item.kind;
                return new vscode.Diagnostic(
                    new vscode.Range(toPosition(item.pos.node.start), toPosition(item.pos.node.end)),
                    `Unused scss ${typeStr} "${item.name}"`,
                    vscode.DiagnosticSeverity.Error,
                );
            });
            scssDiagnostics.set([[vscode.Uri.file(info.scssDocument.fileName), diags]]);
        }
    }
}
