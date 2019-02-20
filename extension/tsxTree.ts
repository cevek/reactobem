import * as ts from 'typescript';
import {isComponent, getElementName, getModName} from '../common';
import {Component, Element, Mod} from './types';
import {readFileSync} from 'fs';

export function extractTSX(content: string) {
    const sourceFile = ts.createSourceFile('a.tsx', content, ts.ScriptTarget.ESNext);
    return {components: extractor(sourceFile)};
}

function extractor(sourceFile: ts.SourceFile) {
    const components: Component[] = [];
    let currentComponent: Component | undefined;

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
            currentComponent = {
                kind: 'component',
                name: componentName,
                elements: [],
                blockStart: node.pos,
                pos: node.pos,
                end: node.end,
            };
            components.push(currentComponent);
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
                pos: jsxElement.pos,
                end: jsxElement.end,
                blockStart: jsxElement.pos,
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
                        pos: prop.pos,
                        end: prop.end,
                        blockStart: prop.pos,
                    });
                }
            }
            visitor(prop);
        }
        return mods;
    }
    ts.forEachChild(sourceFile, rootVisitor);
    return components;
}
