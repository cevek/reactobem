import * as ts from 'typescript';
import { basename, extname, dirname } from 'path';
import { htmlTags, skipTags } from './tags';
import { createHash } from 'crypto';
import { getModName, getElementName, isComponent } from './common';


export default function(program: ts.Program, pluginOptions: { minify?: boolean }) {
    function hash(str: string) {
        return pluginOptions.minify
            ? createHash('sha256')
                  .update(str)
                  .digest()
                  .toString('base64')
                  .replace(/[/+]+/g, '')
                  .substr(0, 4)
            : str;
    }
    return (ctx: ts.TransformationContext) => {
        return (sourceFile: ts.SourceFile) => {
            if (sourceFile.isDeclarationFile) return sourceFile;
            const _baseName = basename(sourceFile.fileName, extname(sourceFile.fileName));
            const baseName = _baseName === 'index' ? basename(dirname(sourceFile.fileName)) : _baseName;
            const baseNameWithSuffix = baseName === 'src' ? '' : baseName + '__';

            function makeElementName(funName: string | undefined, tag: ts.JsxTagNameExpression) {
                const componentName = funName ? funName + '__' : '';
                // console.log(fun && fun.name.text);
                const tagName = getElementName(tag);
                return {
                    tagName: tagName,
                    elementClassName: hash(baseNameWithSuffix + componentName + tagName),
                };
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

                            expr = expr
                                ? ts.createBinary(
                                      expr,
                                      ts.SyntaxKind.PlusToken,
                                      ts.createBinary(ts.createLiteral(' '), ts.SyntaxKind.PlusToken, init),
                                  )
                                : init;

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
                                let value: ts.Expression = ts.createLiteral(
                                    ' ' + hash(baseNameWithSuffix + tagName + '--' + modName),
                                );
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
                                expr = expr ? ts.createBinary(expr, ts.SyntaxKind.PlusToken, value) : value;
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
                return { newAttrs, htmlTagName };
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
                    const { tagName, elementClassName } = makeElementName(funName, node.tagName);
                    const { newAttrs, htmlTagName } = getUpdatedAttrs(tagName, elementClassName, node.attributes);
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
                    const { tagName, elementClassName } = makeElementName(funName, openingElement.tagName);
                    const { newAttrs, htmlTagName } = getUpdatedAttrs(
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
