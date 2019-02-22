import {readFileSync, writeFileSync} from 'fs';
import * as vscode from 'vscode';
import {plugin} from './main';

vscode.languages.registerDefinitionProvider('typescriptreact', {
    provideDefinition(document, position) {
        const tsxContent = document.getText();
        const scssFileName = document.fileName.replace(/\.tsx$/, '.scss');
        try {
            const scssContent = readFileSync(scssFileName, 'utf8');
            const p = plugin(document.fileName, tsxContent, scssContent);
            if (p) {
                const offsetPos = document.offsetAt(position);
                // debugger;
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
                    } else if (tsxEntity.kind === 'element' && !p.shouldSkipTagName(tsxEntity.name)) {
                        const newSCSSContent = p.scss.insert(tsxEntity);
                        writeFileSync(scssFileName, newSCSSContent);
                    }
                }
            }
        } catch (e) {
            console.error(e);
        }
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
