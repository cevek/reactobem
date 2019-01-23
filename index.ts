import * as ts from 'typescript';
import { basename, extname, dirname } from 'path';
import { htmlTags } from './tags';
import { createHash } from 'crypto';

function isComponent(tagName: ts.JsxTagNameExpression) {
    return !(ts.isIdentifier(tagName) && tagName.text[0] === tagName.text[0].toLowerCase());
}

type ComponentTypeNode =
    | ts.FunctionDeclaration
    | ts.FunctionExpression
    | ts.ClassDeclaration
    | ts.ClassExpression
    | undefined;

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
            const baseNameWithSuffix = baseName + '__';

            function getElementName(fun: ComponentTypeNode, tag: ts.JsxTagNameExpression) {
                const componentName = fun && fun.name ? fun.name.text + '__' : '';
                // console.log(fun && fun.name.text);
                return (
                    componentName +
                    (ts.isIdentifier(tag) ? tag.text : ts.isPropertyAccessExpression(tag) ? tag.name.text : 'this')
                );
            }

            function getUpdatedAttrs(tagName: string, attrs: ts.JsxAttributes) {
                let expr: ts.Expression = ts.createLiteral(hash(baseNameWithSuffix + tagName));
                let htmlTagName = htmlTags.indexOf(tagName) === -1 ? 'div' : tagName;
                const newAttrs: ts.JsxAttributeLike[] = [];
                let classNameIdx = -1;
                for (let i = 0; i < attrs.properties.length; i++) {
                    const prop = attrs.properties[i];
                    if (ts.isJsxAttribute(prop) && ts.isIdentifier(prop.name)) {
                        if (prop.name.text === 'className' || prop.name.text === 'class') {
                            expr = ts.createBinary(
                                expr,
                                ts.SyntaxKind.PlusToken,
                                ts.createBinary(
                                    ts.createLiteral(' '),
                                    ts.SyntaxKind.PlusToken,
                                    (prop.initializer && ts.isJsxExpression(prop.initializer)
                                        ? prop.initializer.expression!
                                        : prop.initializer) || ts.createLiteral('')
                                )
                            );
                            classNameIdx = newAttrs.length;
                            newAttrs.push(undefined!);
                            continue;
                        }
                        if (prop.name.text.match(/^mod-/)) {
                            let value: ts.Expression = ts.createLiteral(
                                ' ' + hash(baseNameWithSuffix + tagName + '--' + prop.name.text.substr(4))
                            );
                            if (prop.initializer) {
                                const initializer = prop.initializer;
                                value = ts.createConditional(
                                    ts.isJsxExpression(initializer) ? initializer.expression! : initializer,
                                    ts.createToken(ts.SyntaxKind.QuestionToken),
                                    value,
                                    ts.createToken(ts.SyntaxKind.ColonToken),
                                    ts.createLiteral('')
                                );
                            }
                            expr = ts.createBinary(expr, ts.SyntaxKind.PlusToken, value);
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
                const classNameAttr = ts.createJsxAttribute(
                    ts.createIdentifier('className'),
                    ts.createJsxExpression(undefined, expr)
                );
                if (classNameIdx === -1) {
                    newAttrs.unshift(classNameAttr);
                } else {
                    newAttrs[classNameIdx] = classNameAttr;
                }
                return { newAttrs, htmlTagName };
            }

            let fun: ComponentTypeNode;
            function visitor(node: ts.Node): ts.Node {
                if (
                    ts.isFunctionDeclaration(node) ||
                    ts.isFunctionExpression(node) ||
                    ts.isClassDeclaration(node) ||
                    ts.isClassExpression(node)
                ) {
                    const prevFun = fun;
                    fun = node;
                    const ret = ts.visitEachChild(node, visitor, ctx);
                    fun = prevFun;
                    return ret;
                }
                if (ts.isJsxSelfClosingElement(node)) {
                    const isCmp = isComponent(node.tagName);
                    const elementName = getElementName(fun, node.tagName);
                    const { newAttrs, htmlTagName } = getUpdatedAttrs(elementName, node.attributes);
                    const tagName = isCmp ? node.tagName : ts.createIdentifier(htmlTagName);
                    return ts.updateJsxSelfClosingElement(
                        node,
                        tagName,
                        node.typeArguments,
                        ts.updateJsxAttributes(node.attributes, newAttrs)
                    );
                }
                if (ts.isJsxElement(node)) {
                    const openingElement = node.openingElement;
                    const isCmp = isComponent(openingElement.tagName);
                    const elementName = getElementName(fun, openingElement.tagName);
                    const { newAttrs, htmlTagName } = getUpdatedAttrs(elementName, openingElement.attributes);
                    const tagName = isCmp ? openingElement.tagName : ts.createIdentifier(htmlTagName);
                    return ts.updateJsxElement(
                        node,
                        ts.updateJsxOpeningElement(
                            openingElement,
                            tagName,
                            openingElement.typeArguments,
                            ts.updateJsxAttributes(openingElement.attributes, newAttrs)
                        ),
                        ts.visitNodes(node.children, visitor),
                        ts.updateJsxClosingElement(node.closingElement, tagName)
                    );
                }
                return ts.visitEachChild(node, visitor, ctx);
            }
            return ts.visitEachChild(sourceFile, visitor, ctx);
        };
    };
}
