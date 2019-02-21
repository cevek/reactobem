import * as ts from 'typescript';
import {isComponent, getElementName, getModName, getMainComponentName} from '../common';
import {Component, Element, Mod, Loc, MainComponent} from './types';

export function extractTSX(fileName: string, content: string) {
    const sourceFile = ts.createSourceFile(fileName, content, ts.ScriptTarget.ESNext);
    return {mainComponent: extractor(sourceFile)};
}

function extractor(sourceFile: ts.SourceFile) {
    let mainComponent: MainComponent | undefined;
    let currentComponent: MainComponent | Component | undefined;
    const mainComponentName = getMainComponentName(sourceFile.fileName);

    function toLoc(node: ts.Node): Loc {
        return {
            start: node.pos,
            end: node.end,
        };
    }

    function rootVisitor(node: ts.Node): void {
        let componentName;
        if (ts.isVariableStatement(node)) {
            const varDecl = node.declarationList.declarations[0];
            componentName = ts.isIdentifier(varDecl.name) ? varDecl.name.text : undefined;
        }
        if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) {
            componentName = node.name && ts.isIdentifier(node.name) ? node.name.text : undefined;
        }
        if (componentName) {
            const prevComponent = currentComponent;
            if (mainComponentName === componentName) {
                currentComponent = {
                    kind: 'mainComponent',
                    name: componentName,
                    components: [],
                    elements: [],
                    pos: {
                        node: toLoc(node),
                        inner: toLoc(node),
                        token: toLoc(node),
                    },
                };
                mainComponent = currentComponent;
            } else {
                currentComponent = {
                    kind: 'component',
                    name: componentName,
                    elements: [],
                    pos: {
                        node: toLoc(node),
                        inner: toLoc(node),
                        token: toLoc(node),
                    },
                };
                if (mainComponent) {
                    mainComponent.components.push(currentComponent);
                }
            }
            ts.forEachChild(node, visitor);
            currentComponent = prevComponent;
        }

        return ts.forEachChild(node, visitor);
    }

    function createElement(jsxElement: ts.JsxOpeningElement | ts.JsxSelfClosingElement) {
        if (currentComponent && !isComponent(jsxElement.tagName)) {
            const element: Element = {
                kind: 'element',
                name: getElementName(jsxElement.tagName),
                mods: getMods(jsxElement.attributes),
                pos: {
                    node: toLoc(jsxElement),
                    inner: toLoc(jsxElement),
                    token: toLoc(jsxElement.tagName),
                },
            };
            currentComponent.elements.push(element);
        }
    }

    function visitor(node: ts.Node): void {
        if (ts.isJsxSelfClosingElement(node)) {
            createElement(node);
        }
        if (ts.isJsxElement(node)) {
            createElement(node.openingElement);
        }
        return ts.forEachChild(node, visitor);
    }

    function getMods(attrs: ts.JsxAttributes) {
        const mods: Mod[] = [];
        for (let i = 0; i < attrs.properties.length; i++) {
            const prop = attrs.properties[i];
            if (ts.isJsxAttribute(prop) && ts.isIdentifier(prop.name)) {
                const modName = getModName(prop.name.text);
                if (modName) {
                    mods.push({
                        kind: 'mod',
                        name: modName,
                        pos: {
                            node: toLoc(prop),
                            inner: toLoc(prop),
                            token: toLoc(prop.name),
                        },
                    });
                }
            }
            visitor(prop);
        }
        return mods;
    }
    ts.forEachChild(sourceFile, rootVisitor);
    return mainComponent;
}
