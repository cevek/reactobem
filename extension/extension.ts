import * as vscode from 'vscode';
import {plugin} from './main';

function updateDoc(document: vscode.TextDocument, newContent: string) {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(
        vscode.Uri.file(document.fileName),
        new vscode.Range(new vscode.Position(0, 0), document.positionAt(document.getText().length)),
        newContent,
    );
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
        const newSCSSContent = p.plugin.scss.rename(p.scssEntity!, newName);
        const newTSXContent = p.plugin.tsx.rename(p.tsxEntity!, newName);
        await updateDoc(p.scssDocument, newSCSSContent);
        await updateDoc(p.tsxDocument, newTSXContent);
    }
});

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
