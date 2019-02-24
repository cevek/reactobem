import * as ts from 'typescript';
import {getModName, getMainComponentName} from '../common';
import {Component, Element, Mod, Loc, MainComponent} from './types';
import {getElementName, isComponent} from '../tsCommon';

export function extractTSX(fileName: string, content: string) {
    const sourceFile = ts.createSourceFile(fileName, content, ts.ScriptTarget.ESNext);
    return {mainComponent: extractor(sourceFile)};
}

function extractor(sourceFile: ts.SourceFile) {
    let mainComponent: MainComponent | undefined;
    let currentComponent: MainComponent | Component | undefined;
    const mainComponentName = getMainComponentName(sourceFile.fileName);

    function toLoc(node: ts.Node): Loc {
        const start_ = node.getStart(sourceFile);
        const start = ts.getLineAndCharacterOfPosition(sourceFile, start_);
        const end = ts.getLineAndCharacterOfPosition(sourceFile, node.end);
        return {
            start: {offset: start_, line: start.line, column: start.character},
            end: {offset: node.end, line: end.line, column: end.character},
        };
    }

    function rootVisitor(node: ts.Node): void {
        let componentName: ts.Identifier | undefined;
        if (ts.isVariableStatement(node)) {
            const varDecl = node.declarationList.declarations[0];
            if (ts.isIdentifier(varDecl.name)) {
                componentName = varDecl.name;
            }
        }
        if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) {
            componentName = node.name && ts.isIdentifier(node.name) ? node.name : undefined;
        }
        if (componentName) {
            const prevComponent = currentComponent;
            if (mainComponentName === componentName.text) {
                currentComponent = {
                    type: 'tsx',
                    kind: 'mainComponent',
                    name: componentName.text,
                    components: [],
                    elements: [],
                    pos: {
                        node: toLoc(node),
                        inner: toLoc(node),
                        token: toLoc(componentName),
                        endToken: undefined,
                    },
                    parent: currentComponent as MainComponent,
                };
                mainComponent = currentComponent;
            } else {
                currentComponent = {
                    type: 'tsx',
                    kind: 'component',
                    name: componentName.text,
                    elements: [],
                    pos: {
                        node: toLoc(node),
                        inner: toLoc(node),
                        token: toLoc(componentName),
                        endToken: undefined,
                    },
                    parent: currentComponent as MainComponent,
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

    function createElement(
        jsxElement: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
        closingElement: ts.JsxClosingElement | undefined,
    ) {
        if (currentComponent && !isComponent(jsxElement.tagName)) {
            const element: Element = {
                type: 'tsx',
                kind: 'element',
                name: getElementName(jsxElement.tagName),
                mods: [],
                pos: {
                    node: toLoc(jsxElement),
                    inner: toLoc(jsxElement),
                    token: toLoc(jsxElement.tagName),
                    endToken: closingElement ? toLoc(closingElement.tagName) : undefined,
                },
                parent: currentComponent,
            };
            element.mods = getMods(jsxElement.attributes, element);
            currentComponent.elements.push(element);
        }
    }

    function visitor(node: ts.Node): void {
        if (ts.isJsxSelfClosingElement(node)) {
            createElement(node, undefined);
        }
        if (ts.isJsxElement(node)) {
            createElement(node.openingElement, node.closingElement);
        }
        return ts.forEachChild(node, visitor);
    }

    function getMods(attrs: ts.JsxAttributes, element: Element) {
        const mods: Mod[] = [];
        for (let i = 0; i < attrs.properties.length; i++) {
            const prop = attrs.properties[i];
            if (ts.isJsxAttribute(prop) && ts.isIdentifier(prop.name)) {
                const modName = getModName(prop.name.text);
                if (modName) {
                    mods.push({
                        type: 'tsx',
                        kind: 'mod',
                        name: modName,
                        pos: {
                            node: toLoc(prop),
                            inner: toLoc(prop),
                            token: toLoc(prop.name),
                            endToken: undefined,
                        },
                        parent: element,
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
