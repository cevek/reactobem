import {extractTSX} from './tsxTree';
import {extractSCSS} from './scssTree';
import {match} from './matcher';
import {File, Component, Element, Mod, Item} from './types';
import {insertRuleAfter, insertRuleBefore, insertRuleInto, insertIdents} from './modifySCSS';

export function plugin(tsxContent: string, scssContent: string) {
    const tsx = extractTSX(tsxContent);
    const scss = extractSCSS(scssContent);
    const {elementsWeakMap, componentWeakMap, findClosestExistsItem} = match(tsx.components, scss.components);

    function insert(scssParent: Item | undefined, tsxItems: Item[], tsxName: string, content: string) {
        const closestSCSSElement = findClosestExistsItem(tsxItems, tsxName);
        // console.log('insert', tsxName, closestSCSSElement, tsxItems);
        if (closestSCSSElement) {
            if (closestSCSSElement.pos === 'after') {
                return insertRuleAfter(scssContent, closestSCSSElement.item, content);
            } else {
                return insertRuleBefore(scssContent, closestSCSSElement.item, content);
            }
        } else {
            return scssParent ? insertRuleInto(scssContent, scssParent, content) : scssContent + '\n' + content;
        }
    }

    function insertComponent(tsxComponentName: string, content = `.${tsxComponentName} {\n    \n}`) {
        return insert(undefined, tsx.components, tsxComponentName, content);
    }

    function insertElement(tsxComponent: Component, elementName: string, content = `&__${elementName} {\n    \n}`) {
        const scssComponent = componentWeakMap.get(tsxComponent);
        if (scssComponent) {
            return insert(scssComponent, tsxComponent.elements, elementName, content);
        } else {
            return insertComponent(tsxComponent.name, `.${tsxComponent.name} {\n${insertIdents(content, 4)}\n}`);
        }
    }
    function insertMod(
        tsxComponent: Component,
        tsxElement: Element,
        modName: string,
        content = `&--${modName} {\n    \n}`,
    ) {
        const scssComponent = componentWeakMap.get(tsxComponent);
        if (scssComponent) {
            const scssElement = elementsWeakMap.get(tsxElement);
            if (scssElement) {
                return insert(scssElement, tsxElement.mods, modName, content);
            } else {
                return insertElement(
                    tsxComponent,
                    tsxElement.name,
                    `&__${tsxElement.name} {\n${insertIdents(content, 4)}\n}`,
                );
            }
        } else {
            return insertComponent(
                tsxComponent.name,
                `.${tsxComponent.name} {\n${insertIdents(
                    `&__${tsxElement.name} {\n${insertIdents(content, 4)}\n}`,
                    4,
                )}\n}`,
            );
        }
    }

    return {
        tsx,
        scss,
        insertComponent,
        insertElement,
        insertMod,
    };
}
