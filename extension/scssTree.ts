import {Element, Component, Mod, Loc, MainComponent} from './types';
import {getMainComponentName} from '../common';
import {element} from 'prop-types';
const gonzales = require('gonzales-pe');

interface StyleNode {
    type: string;
    start: {line: number; column: number};
    end: {line: number; column: number};
    content: StyleNode[];
}

export function extractSCSS(fileName: string, content: string) {
    const mainComponentName = getMainComponentName(fileName);
    const lines = content.split('\n');
    const parseTree: StyleNode = gonzales.parse(content, {syntax: 'scss'});
    return {source: content, mainComponent: processMainComponent(parseTree.content)};

    function toLoc(node: StyleNode): Loc {
        return {
            start: {offset: lineColToPos(node.start), line: node.start.line - 1, column: node.start.column - 1},
            end: {offset: lineColToPos(node.end) + 1, line: node.end.line - 1, column: node.end.column},
        };
    }

    function getRules(content: StyleNode[]) {
        const rulesets = [];
        for (let i = 0; i < content.length; i++) {
            const rule = content[i];
            if (rule.type === 'ruleset') {
                const block = nonNull(getType(rule.content, 'block'));
                const selectorNodes = getTypes(rule.content, 'selector');

                const ruleLoc = toLoc(rule);
                const blockLoc = toLoc(block);
                blockLoc.start.offset++;

                for (const selector of selectorNodes) {
                    const selectorName = nodeToString(selector);
                    const cleanName = selectorName.replace(/^[&_\-\.]+/g, '');
                    const selectorLoc = toLoc(selector);

                    // console.log(
                    //     cleanName,
                    //     JSON.stringify(scss.substring(rulePos, ruleEnd)),
                    //     rule.start,
                    //     rule.end,
                    //     rulePos,
                    //     ruleEnd,
                    // );
                    // const selectorPos = lineColToPos(selector.start);
                    rulesets.push({
                        selectorName,
                        cleanName,
                        block,
                        pos: {node: ruleLoc, inner: blockLoc, token: selectorLoc, endToken: undefined},
                    });
                }
            }
        }
        return rulesets;
    }

    function processMainComponent(content: StyleNode[]) {
        let mainComponent: MainComponent | undefined;
        getRules(content).forEach(node => {
            if (node.selectorName.match(/^\.[A-Z]/)) {
                mainComponent = {
                    type: 'scss',
                    kind: 'mainComponent',
                    name: node.cleanName,
                    components: [],
                    elements: [],
                    pos: node.pos,
                    parent: undefined!,
                };
                mainComponent.components = processComponent(node.block.content, mainComponent);
                mainComponent.elements = processElement(node.block.content, mainComponent);
            }
        });
        return mainComponent;
    }

    function processComponent(content: StyleNode[], mainComponent: MainComponent) {
        const components: Component[] = [];
        getRules(content).forEach(node => {
            if (node.selectorName.match(/^&_+[A-Z]/)) {
                const component: Component = {
                    type: 'scss',
                    kind: 'component',
                    name: node.cleanName,
                    elements: [],
                    pos: node.pos,
                    parent: mainComponent,
                };
                components.push(component);
                component.elements = processElement(node.block.content, component);
            }
        });
        return components;
    }

    function processElement(content: StyleNode[], component: MainComponent | Component) {
        const elements: Element[] = [];
        getRules(content).forEach(node => {
            if (node.selectorName.match(/^&_+[a-z]/)) {
                const element: Element = {
                    type: 'scss',
                    kind: 'element',
                    name: node.cleanName,
                    mods: [],
                    pos: node.pos,
                    parent: component,
                };
                elements.push(element);
                element.mods = processMod(node.block.content, element);
            }
        });
        return elements;
    }

    function processMod(content: StyleNode[], element: Element) {
        const mods: Mod[] = [];
        getRules(content).forEach(node => {
            if (node.selectorName.match(/^&-/)) {
                mods.push({
                    type: 'scss',
                    kind: 'mod',
                    name: node.cleanName,
                    pos: node.pos,
                    parent: element,
                });
            }
        });
        return mods;
    }

    function lineColToPos(obj: {line: number; column: number}) {
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

    function getType(items: StyleNode[], type: string) {
        return items.find(item => item.type === type);
    }
    function getTypes(items: StyleNode[], type: string) {
        return items.filter(item => item.type === type);
    }

    function nodeToString(node: StyleNode, excludeBlock = false): string {
        if (typeof node.content === 'string') return node.content;
        if (node.content.length === 0) return ''; //scss.substring(lineColToPos(node.start), lineColToPos(node.end) + 1);
        const start = lineColToPos(node.content[0].start);
        const blockContent = excludeBlock ? node.content.filter(n => n.type !== 'block') : node.content;
        const endNode = nonNull(blockContent[blockContent.length - 1]);
        const end = lineColToPos(endNode.end) + 1;
        return content.substring(start, end);
    }
}
