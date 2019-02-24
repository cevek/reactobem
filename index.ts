import * as ts from 'typescript';
import {getMainComponentName, getModName, getHashOfClassName} from './common';
import {htmlTags, skipTags} from './tags';
import { isComponent, getElementName } from './tsCommon';

export default function(program: ts.Program, pluginOptions: {}) {
    const minify = process.env.NODE_ENV === 'production';
    function hash(str: string) {
        return minify ? getHashOfClassName(str) : str;
    }
    return (ctx: ts.TransformationContext) => {
        return (sourceFile: ts.SourceFile) => {
            if (sourceFile.isDeclarationFile) return sourceFile;

            const mainComponentName = getMainComponentName(sourceFile.fileName);

            function makeElementName(funName: string | undefined, tagName: string) {
                let prefix = '';
                if (mainComponentName) {
                    prefix += mainComponentName + '__';
                }
                if (funName && mainComponentName !== funName) {
                    prefix += funName + '__';
                }
                return hash(prefix + tagName);
            }

            function joinExpr(left: ts.Expression, right: ts.Expression, delimeter?: string) {
                if (ts.isStringLiteral(left) && ts.isStringLiteral(right)) {
                    return ts.createLiteral(left.text + (delimeter === undefined ? '' : delimeter) + right.text);
                } else {
                    return ts.createBinary(
                        left,
                        ts.SyntaxKind.PlusToken,
                        delimeter === undefined
                            ? right
                            : ts.createBinary(ts.createLiteral(delimeter), ts.SyntaxKind.PlusToken, right),
                    );
                }
            }

            function getUpdatedAttrs(tagName: string, elementClassName: string, attrs: ts.JsxAttributes) {
                // console.log('tagName', tagName);
                const hasNoBase = skipTags.includes(tagName);
                let expr: ts.Expression | undefined = hasNoBase ? undefined : ts.createLiteral(elementClassName);
                let htmlTagName = htmlTags.includes(tagName) ? tagName : 'div';
                const newAttrs: ts.JsxAttributeLike[] = [];
                let classNameIdx = -1;
                for (let i = 0; i < attrs.properties.length; i++) {
                    const prop = attrs.properties[i];
                    if (ts.isJsxAttribute(prop) && ts.isIdentifier(prop.name)) {
                        if (prop.name.text === 'className' || prop.name.text === 'class') {
                            const init =
                                (prop.initializer && ts.isJsxExpression(prop.initializer)
                                    ? prop.initializer.expression!
                                    : prop.initializer) || ts.createLiteral('');

                            expr = expr ? joinExpr(expr, init, ' ') : init;
                            classNameIdx = newAttrs.length;
                            newAttrs.push(undefined!);
                            continue;
                        }
                        const modName = getModName(prop.name.text);
                        if (modName) {
                            if (hasNoBase) {
                                console.error(
                                    `<${tagName}> has ${prop.getText()} but ${tagName} is not valid element name`,
                                );
                            } else {
                                const modClassName = makeElementName(funName, tagName + '--' + modName);
                                let value: ts.Expression = ts.createLiteral(' ' + modClassName);
                                if (prop.initializer) {
                                    const initializer = prop.initializer;
                                    value = ts.createConditional(
                                        ts.isJsxExpression(initializer) ? initializer.expression! : initializer,
                                        ts.createToken(ts.SyntaxKind.QuestionToken),
                                        value,
                                        ts.createToken(ts.SyntaxKind.ColonToken),
                                        ts.createLiteral(''),
                                    );
                                }
                                expr = expr ? joinExpr(expr, value) : value;
                            }
                            continue;
                        }
                        if (prop.name.text === 'as') {
                            if (prop.initializer && ts.isStringLiteral(prop.initializer)) {
                                htmlTagName = prop.initializer.text;
                            }
                            continue;
                        }
                    }
                    newAttrs.push(visitor(prop) as ts.JsxAttributeLike);
                }
                const classNameAttr = expr
                    ? ts.createJsxAttribute(ts.createIdentifier('className'), ts.createJsxExpression(undefined, expr))
                    : undefined;
                if (classNameAttr) {
                    if (classNameIdx === -1) {
                        newAttrs.unshift(classNameAttr);
                    } else {
                        newAttrs[classNameIdx] = classNameAttr;
                    }
                }
                return {newAttrs, htmlTagName};
            }

            let funName: string | undefined;
            function visitor(node: ts.Node): ts.Node {
                if (
                    ts.isFunctionDeclaration(node) ||
                    ts.isFunctionExpression(node) ||
                    ts.isClassDeclaration(node) ||
                    ts.isClassExpression(node) ||
                    (ts.isVariableDeclaration(node) && node.initializer && ts.isArrowFunction(node.initializer))
                ) {
                    const prevFun = funName;
                    funName = node.name && ts.isIdentifier(node.name) ? node.name.text : undefined;
                    const ret = ts.visitEachChild(node, visitor, ctx);
                    funName = prevFun;
                    return ret;
                }
                if (ts.isJsxSelfClosingElement(node)) {
                    const isCmp = isComponent(node.tagName);
                    const tagName = getElementName(node.tagName);
                    const elementClassName = makeElementName(funName, tagName);
                    const {newAttrs, htmlTagName} = getUpdatedAttrs(tagName, elementClassName, node.attributes);
                    const tagNameNode = isCmp ? node.tagName : ts.createIdentifier(htmlTagName);
                    return ts.updateJsxSelfClosingElement(
                        node,
                        tagNameNode,
                        node.typeArguments,
                        ts.updateJsxAttributes(node.attributes, newAttrs),
                    );
                }
                if (ts.isJsxElement(node)) {
                    const openingElement = node.openingElement;
                    const isCmp = isComponent(openingElement.tagName);
                    const tagName = getElementName(openingElement.tagName);
                    const elementClassName = makeElementName(funName, tagName);
                    const {newAttrs, htmlTagName} = getUpdatedAttrs(
                        tagName,
                        elementClassName,
                        openingElement.attributes,
                    );
                    const tagNameNode = isCmp ? openingElement.tagName : ts.createIdentifier(htmlTagName);
                    return ts.updateJsxElement(
                        node,
                        ts.updateJsxOpeningElement(
                            openingElement,
                            tagNameNode,
                            openingElement.typeArguments,
                            ts.updateJsxAttributes(openingElement.attributes, newAttrs),
                        ),
                        ts.visitNodes(node.children, visitor),
                        ts.updateJsxClosingElement(node.closingElement, tagNameNode),
                    );
                }
                return ts.visitEachChild(node, visitor, ctx);
            }
            return ts.visitEachChild(sourceFile, visitor, ctx);
        };
    };
}
