import * as ts from 'typescript';
import {isComponent, getElementName, getModName} from '../common';
import {Component, Element, Mod} from './types';
import {readFileSync} from 'fs';
import {inspect} from 'util';

export function extract(fileName: string) {
    const sourceFile = ts.createSourceFile(fileName, readFileSync(fileName, 'utf8'), ts.ScriptTarget.ESNext);
    return extractor(sourceFile);
}

const res = extract('./example.tsx');
console.log(inspect(res, {depth: 10}));

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
                name: componentName,
                elements: [],
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
                name: getElementName(jsxElement.tagName),
                mods: getMods(jsxElement.attributes),
                pos: jsxElement.pos,
                end: jsxElement.end,
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
                        name: modName,
                        pos: prop.pos,
                        end: prop.end,
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
