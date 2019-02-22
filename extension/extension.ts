import {readFileSync, writeFileSync} from 'fs';
import * as vscode from 'vscode';
import {plugin} from './main';

// vscode.languages.registerRenameProvider('typescriptreact', {
//     async provideRenameEdits(tsxDocument, position, newName: string) {
//         debugger;
//         const tsxContent = tsxDocument.getText();
//         const scssFileName = tsxDocument.fileName.replace(/\.tsx$/, '.scss');
//         const scssDocument = await vscode.workspace.openTextDocument(scssFileName);
//         const scssContent = scssDocument.getText();
//         const p = plugin(tsxDocument.fileName, tsxContent, scssContent);
//         if (p) {
//             const offsetPos = tsxDocument.offsetAt(position);
//             const tsxEntity = p.tsx.getEntity(offsetPos);
//             if (tsxEntity) {
//                 const scssEntity = p.tsx.getSCSSEntity(tsxEntity);
//                 if (scssEntity) {
//                     if (tsxEntity.kind !== 'element' || !p.shouldSkipTagName(tsxEntity.name)) {
//                         const newSCSSContent = p.scss.rename(scssEntity, newName);
//                         const edit = new vscode.WorkspaceEdit();
//                         edit.replace(
//                             vscode.Uri.file(scssDocument.fileName),
//                             new vscode.Range(new vscode.Position(0, 0), scssDocument.positionAt(scssContent.length)),
//                             newSCSSContent,
//                         );
//                         vscode.workspace.applyEdit(edit);
//                     }
//                 }
//             }
//         }
//         return null;
//     },
// });


// vscode.languages.registerRenameProvider('scss', {
//     async provideRenameEdits(tsxDocument, position, newName: string) {
//         debugger;
//         return null;
//     },
// });

vscode.languages.registerDefinitionProvider('typescriptreact', {
    provideDefinition(tsxDocument, position) {
        const tsxContent = tsxDocument.getText();
        const scssFileName = tsxDocument.fileName.replace(/\.tsx$/, '.scss');
        return vscode.workspace.openTextDocument(scssFileName).then(scssDocument => {
            const scssContent = scssDocument.getText();
            const p = plugin(tsxDocument.fileName, tsxContent, scssContent);
            // debugger;
            if (p) {
                const offsetPos = tsxDocument.offsetAt(position);
                const tsxEntity = p.tsx.getEntity(offsetPos);
                if (tsxEntity) {
                    const scssEntity = p.tsx.getSCSSEntity(tsxEntity);
                    if (scssEntity) {
                        const {start, end} = scssEntity.pos.token;
                        const location: vscode.Location = {
                            uri: vscode.Uri.file(scssFileName),
                            range: new vscode.Range(
                                new vscode.Position(start.line, start.column),
                                new vscode.Position(end.line, end.column),
                            ),
                        };
                        return location;
                    } else if (tsxEntity.kind !== 'element' || !p.shouldSkipTagName(tsxEntity.name)) {
                        const newSCSSContent = p.scss.insert(tsxEntity);
                        const edit = new vscode.WorkspaceEdit();
                        edit.replace(
                            vscode.Uri.file(scssDocument.fileName),
                            new vscode.Range(new vscode.Position(0, 0), scssDocument.positionAt(scssContent.length)),
                            newSCSSContent,
                        );
                        vscode.workspace.applyEdit(edit);
                    }
                }
            }
        });
        return null;
    },
});

vscode.languages.registerDefinitionProvider('scss', {
    provideDefinition(document, position) {
        const scssContent = document.getText();
        const tsxFileName = document.fileName.replace(/\.scss$/, '.tsx');
        try {
            const tsxContent = readFileSync(tsxFileName, 'utf8');
            const p = plugin(tsxFileName, tsxContent, scssContent);
            if (p) {
                const offsetPos = document.offsetAt(position);
                const scssEntity = p.scss.getEntity(offsetPos);
                if (scssEntity) {
                    const tsxEntity = p.scss.getTSXEntity(scssEntity);
                    if (tsxEntity) {
                        const {start, end} = tsxEntity.pos.token;
                        const location: vscode.Location = {
                            uri: vscode.Uri.file(tsxFileName),
                            range: new vscode.Range(
                                new vscode.Position(start.line, start.column),
                                new vscode.Position(end.line, end.column),
                            ),
                        };
                        return location;
                    }
                }
            }
        } catch (e) {
            console.error(e);
        }
        return null;
    },
});
