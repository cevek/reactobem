import { readFileSync } from 'fs';
import { Element, Component, Mod } from './types';
import { inspect } from 'util';
const gonzales = require('gonzales-pe');
const scss = readFileSync('./example.scss', 'utf8');
const lines = scss.split('\n');

export interface Loc {
    start: number;
    end: number;
}

export const enum SCSSKind {
    Placeholder = 'Placeholder',
    Variable = 'Variable',
    Prop = 'Prop',
    Mixin = 'Mixin',
    AtRule = 'AtRule',
    Rule = 'Rule',
    Comment = 'Comment',
}

export interface SCSSFile {
    nodes: RuleNode[];
    externalVars: string[];
    externalPlaceholders: string[];
}

export interface External {
    type: 'variable' | 'mixin' | 'placeholder';
    fileName: string;
    rule: RuleNode;
    value: string;
}

export type RuleNode = Prop | Variable | Rule | AtRule | Mixin | Comment;

export interface Prop {
    kind: SCSSKind.Prop;
    doc: string | undefined;
    name: string;
    value: string;
    loc: Loc;
}
export interface Variable {
    kind: SCSSKind.Variable;
    doc: string | undefined;
    name: string;
    value: string;
    loc: Loc;
}

export interface Mixin {
    kind: SCSSKind.Mixin;
    name: string;
    doc: string | undefined;
    arguments: string;
    loc: Loc;
    nodes: RuleNode[];
}

export interface AtRule {
    kind: SCSSKind.AtRule;

    value: string;
    loc: Loc;
    nodes: RuleNode[];
}

export interface Rule {
    kind: SCSSKind.Rule;
    selector: string;
    nodes: RuleNode[];
    loc: Loc;
}
export interface Comment {
    kind: SCSSKind.Comment;
    comment: string;
    multiline: boolean;
    loc: Loc;
}

interface GNode {
    type: string;
    start: { line: number; column: number };
    end: { line: number; column: number };
    content: GNode[];
}
try {
    const parseTree: GNode = gonzales.parse(scss, { syntax: 'scss' });

    const components = processSelector(parseTree.content, 'component');

    function processSelector(content: GNode[], expectType: 'component'): Component[];
    function processSelector(content: GNode[], expectType: 'element'): Element[];
    function processSelector(content: GNode[], expectType: 'mod'): Mod[];
    function processSelector(content: GNode[], expectType: 'component' | 'mod' | 'element') {
        const components: Component[] = [];
        const mods: Mod[] = [];
        const elements: Element[] = [];
        for (let i = 0; i < content.length; i++) {
            const item = content[i];
            // const loc = {
            //     start: lineColToPos(item.start),
            //     end: lineColToPos(item.end),
            // };
            if (item.type === 'ruleset') {
                const block = getType(item.content, 'block');
                const selectorNodes = getTypes(item.content, 'selector');
                for (const selector of selectorNodes) {
                    const selectorName = nodeToString(selector);
                    const cleanName = selectorName.replace(/^[&_\-\.]+/g, '');
                    const blockContent = nonNull(block).content;
                    const pos = lineColToPos(selector.start);
                    if (expectType === 'component') {
                        if (selectorName.match(/^(&_+|\.)[A-Z]/)) {
                            components.push({
                                name: cleanName,
                                elements: processSelector(blockContent, 'element'),
                                pos: pos,
                            });
                            components.push(...processSelector(blockContent, 'component'));
                        }
                    } else if (expectType === 'element') {
                        if (selectorName.match(/^&_+[a-z]/)) {
                            elements.push({
                                name: cleanName,
                                mods: processSelector(blockContent, 'mod'),
                                pos: pos,
                            });
                        }
                    } else if (expectType === 'mod') {
                        if (selectorName.match(/^&-/)) {
                            mods.push({
                                name: cleanName,
                                pos: pos,
                            });
                        }
                    }
                    // console.log(nodeToString(selector));
                }
                // console.log(rule);
            }
        }

        if (expectType === 'component') return components;
        if (expectType === 'element') return elements;
        if (expectType === 'mod') return mods;
    }

    console.log(inspect(components, {depth: 40}));

    function lineColToPos(obj: { line: number; column: number }) {
        let pos = 0;
        for (let i = 0; i < obj.line - 1; i++) {
            pos += lines[i].length + 1;
        }
        return pos + obj.column - 1;
    }

    function assert(val: boolean) {
        if (!val) throw new Error('Never');
    }

    function nonNull<T>(val: T | null | undefined): T {
        assert(val !== null && val !== undefined);
        return val!;
    }

    function getType(items: GNode[], type: string) {
        return items.find(item => item.type === type);
    }
    function getTypes(items: GNode[], type: string) {
        return items.filter(item => item.type === type);
    }

    function nodeToString(node: GNode, excludeBlock = false): string {
        if (typeof node.content === 'string') return node.content;
        if (node.content.length === 0) return ''; //scss.substring(lineColToPos(node.start), lineColToPos(node.end) + 1);
        const start = lineColToPos(node.content[0].start);
        const content = excludeBlock ? node.content.filter(n => n.type !== 'block') : node.content;
        const endNode = nonNull(content[content.length - 1]);
        const end = lineColToPos(endNode.end) + 1;
        return scss.substring(start, end);
    }

    // const root: SCSSFile = {
    //     nodes: [],
    //     externalVars: [],
    //     externalPlaceholders: [],
    // };
    // const localPlaceholders: string[] = [];
    // root.nodes = iterate(parseTree.content, []);

    // function mixinArgs(node: GNode, vars: string[]) {
    //     if (typeof node.content === 'string') return;
    //     if (node.type === 'value') return;
    //     if (node.type === 'block') return;
    //     node.content.forEach(n => {
    //         if (n.type === 'variable') {
    //             const varName = nodeToString(n);
    //             if (vars.indexOf(varName) === -1) {
    //                 vars.push(varName);
    //             }
    //         } else {
    //             mixinArgs(n, vars);
    //         }
    //     });
    // }

    // function findVariables(node: GNode, localVars: string[]) {
    //     if (typeof node.content === 'string') return;
    //     if (node.type === 'property') return;
    //     if (node.type === 'block') return;
    //     // if (node.type === 'arguments' && node.content.length > 0 && node.content[0]) return;

    //     node.content.forEach(n => {
    //         if (n.type === 'variable') {
    //             const varName = nodeToString(n);
    //             if (localVars.indexOf(varName) === -1 && root.externalVars.indexOf(varName) === -1) {
    //                 if (varName === 'nameArg') debugger;
    //                 root.externalVars.push(varName);
    //             }
    //         } else {
    //             findVariables(n, localVars);
    //         }
    //     });
    // }

    // function iterate(content: GNode[], variables: string[]) {
    //     const children: RuleNode[] = [];
    //     for (let i = 0; i < content.length; i++) {
    //         const item = content[i];
    //         if (item.type === 'declarationDelimiter' || item.type === 'space' || item.type === 'parentheses') continue;
    //         const loc = {
    //             start: lineColToPos(item.start),
    //             end: lineColToPos(item.end),
    //         };
    //         const block = getType(item.content, 'block');
    //         if (item.type === 'atrule' || item.type === 'include' || item.type === 'extend') {
    //             findVariables(item, variables);
    //             debugger;
    //             const extendValue = item.type === 'extend' ? nonNull(getTypeValue(item.content, 'selector')) : '';
    //             if (extendValue !== '' && localPlaceholders.indexOf(extendValue) === -1) {
    //                 root.externalPlaceholders.push(extendValue);
    //             }
    //             const mixin: AtRule = {
    //                 kind: SCSSKind.AtRule,
    //                 value: nodeToString(item, true),
    //                 nodes: block ? iterate(block.content, variables) : [],
    //                 loc,
    //             };
    //             children.push(mixin);
    //         } else if (item.type === 'declaration') {
    //             const doc = undefined;
    //             const name = nonNull(getTypeValue(item.content, 'property'));
    //             const value = nonNull(getTypeValue(item.content, 'value'));
    //             const nameNode = nonNull(getType(item.content, 'property'));
    //             const isVariable = nameNode.content[0].type === 'variable';
    //             if (isVariable) {
    //                 variables = [...variables, nodeToString(nameNode.content[0])];
    //             }
    //             findVariables(item, variables);
    //             if (isVariable) {
    //                 const declaration: Variable = { kind: SCSSKind.Variable, doc, name, value, loc };
    //                 children.push(declaration);
    //             } else {
    //                 const declaration: Prop = { kind: SCSSKind.Prop, doc, name, value, loc };
    //                 children.push(declaration);
    //             }
    //         } else if (item.type === 'mixin') {
    //             const argVars: string[] = [];
    //             mixinArgs(item, argVars);
    //             variables = [...variables, ...argVars];
    //             findVariables(item, variables);
    //             const mixin: Mixin = {
    //                 kind: SCSSKind.Mixin,
    //                 doc: undefined,
    //                 name: nonNull(getTypeValue(item.content, 'ident')),
    //                 arguments: nonNull(getTypeValue(item.content, 'arguments')),
    //                 nodes: iterate(nonNull(block).content, variables),
    //                 loc,
    //             };
    //             children.push(mixin);
    //         } else if (item.type === 'ruleset') {
    //             const selectorNode = nonNull(getType(item.content, 'selector'));
    //             findVariables(item, variables);
    //             const placeholder = getTypeValue(selectorNode.content, 'placeholder');
    //             if (placeholder && localPlaceholders.indexOf('%' + placeholder) === -1) {
    //                 localPlaceholders.push('%' + placeholder);
    //             }
    //             const rule: Rule = {
    //                 kind: SCSSKind.Rule,
    //                 selector: nodeToString(selectorNode),
    //                 nodes: iterate(nonNull(block).content, variables),
    //                 loc,
    //             };
    //             children.push(rule);
    //         } else if (item.type === 'multilineComment' || item.type === 'singlelineComment') {
    //             const comment: Comment = {
    //                 kind: SCSSKind.Comment,
    //                 comment: '',
    //                 multiline: item.type === 'multilineComment',
    //                 loc,
    //             };
    //             children.push(comment);
    //         } else {
    //             debugger;
    //             console.log('Unexpected type: ' + item.type);
    //         }
    //     }
    //     return children;
    // }

    // console.log(parseTree);
    // console.log(inspect(root, { depth: 100 }));
    debugger;
} catch (e) {
    throw e;
    // console.error(e);
    debugger;
}
