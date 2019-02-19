import { readFileSync } from 'fs';
import { Element, Component, Mod } from './types';
import { inspect } from 'util';
const gonzales = require('gonzales-pe');

interface StyleNode {
    type: string;
    start: { line: number; column: number };
    end: { line: number; column: number };
    content: StyleNode[];
}

extractScss('./example.scss');
export function extractScss(fileName: string) {
    const scss = readFileSync(fileName, 'utf8');
    const lines = scss.split('\n');
    const parseTree: StyleNode = gonzales.parse(scss, { syntax: 'scss' });
    const components = processComponent(parseTree.content);
    console.log(inspect(components, { depth: 40 }));
    return components;

    function getRules(content: StyleNode[]) {
        const rulesets = [];
        for (let i = 0; i < content.length; i++) {
            const rule = content[i];
            if (rule.type === 'ruleset') {
                const block = getType(rule.content, 'block');
                const selectorNodes = getTypes(rule.content, 'selector');
                const rulePos = lineColToPos(rule.start);

                for (const selector of selectorNodes) {
                    const selectorName = nodeToString(selector);
                    const cleanName = selectorName.replace(/^[&_\-\.]+/g, '');
                    const blockContent = nonNull(block).content;
                    // const selectorPos = lineColToPos(selector.start);
                    rulesets.push({ selectorName, cleanName, blockContent, pos: rulePos });
                }
            }
        }
        return rulesets;
    }

    function processComponent(content: StyleNode[]) {
        const components: Component[] = [];
        getRules(content).forEach(node => {
            if (node.selectorName.match(/^(&_+|\.)[A-Z]/)) {
                components.push({
                    name: node.cleanName,
                    elements: processElement(node.blockContent),
                    pos: node.pos,
                });
                components.push(...processComponent(node.blockContent));
            }
        });
        return components;
    }

    function processElement(content: StyleNode[]) {
        const elements: Element[] = [];
        getRules(content).forEach(node => {
            if (node.selectorName.match(/^&_+[a-z]/)) {
                elements.push({
                    name: node.cleanName,
                    mods: processMod(node.blockContent),
                    pos: node.pos,
                });
            }
        });
        return elements;
    }

    function processMod(content: StyleNode[]) {
        const mods: Mod[] = [];
        getRules(content).forEach(node => {
            if (node.selectorName.match(/^&-/)) {
                mods.push({
                    name: node.cleanName,
                    pos: node.pos,
                });
            }
        });
        return mods;
    }

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
        const content = excludeBlock ? node.content.filter(n => n.type !== 'block') : node.content;
        const endNode = nonNull(content[content.length - 1]);
        const end = lineColToPos(endNode.end) + 1;
        return scss.substring(start, end);
    }
}
