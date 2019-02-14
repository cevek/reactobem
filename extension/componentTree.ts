import * as ts from 'typescript';
import { isComponent, getElementName, getModName } from '../common';
import { Component, Element, Mod } from './types';


export function extractor(sourceFile: ts.SourceFile) {
    const components: Component[] = [];
    let currentComponent: Component;

    function rootVisitor(node: ts.Node): void {
        if (
            ts.isFunctionDeclaration(node) ||
            ts.isFunctionExpression(node) ||
            ts.isClassDeclaration(node) ||
            ts.isClassExpression(node) ||
            (ts.isVariableDeclaration(node) && node.initializer && ts.isArrowFunction(node.initializer))
        ) {
            const prevComponent = currentComponent;
            const funName = node.name && ts.isIdentifier(node.name) ? node.name.text : undefined;
            if (funName) {
                currentComponent = {
                    name: funName,
                    elements: [],
                    pos: node.pos,
                };
                components.push(currentComponent);
                ts.forEachChild(node, visitor);
            }
            currentComponent = prevComponent;
        }
        return ts.forEachChild(node, visitor);
    }

    function createElement(jsxElement: ts.JsxOpeningElement | ts.JsxSelfClosingElement) {
        if (!isComponent(jsxElement.tagName)) {
            const element: Element = {
                name: getElementName(jsxElement.tagName),
                mods: getMods(jsxElement.attributes),
                pos: jsxElement.tagName.pos,
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
                        pos: prop.name.pos,
                    });
                }
            }
            visitor(prop);
        }
        return mods;
    }
    return ts.forEachChild(sourceFile, rootVisitor);
}
