import * as ts from 'typescript';

export function getElementName(tag: ts.JsxTagNameExpression) {
    return ts.isIdentifier(tag) ? tag.text : ts.isPropertyAccessExpression(tag) ? tag.name.text : 'this';
}

export function isComponent(tagName: ts.JsxTagNameExpression) {
    return !(ts.isIdentifier(tagName) && tagName.text[0] === tagName.text[0].toLowerCase());
}