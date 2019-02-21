import * as ts from 'typescript';
import {extname, basename, dirname} from 'path';

export function getElementName(tag: ts.JsxTagNameExpression) {
    return ts.isIdentifier(tag) ? tag.text : ts.isPropertyAccessExpression(tag) ? tag.name.text : 'this';
}

export function isComponent(tagName: ts.JsxTagNameExpression) {
    return !(ts.isIdentifier(tagName) && tagName.text[0] === tagName.text[0].toLowerCase());
}

export function getModName(propName: string) {
    return propName.match(/^mod-/) ? propName.substr(4) : undefined;
}

export function getMainComponentName(fileName: string) {
    const _baseName = basename(fileName, extname(fileName));
    const baseName = _baseName === 'index' ? basename(dirname(fileName)) : _baseName;
    return baseName === 'src' ? '' : baseName;
}
