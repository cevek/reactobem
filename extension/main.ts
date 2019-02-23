import {extractTSX} from './tsxTree';
import {extractSCSS} from './scssTree';
import {matchComponents, matchElements} from './matcher';
import {Component, Element, Item, MainComponent, Loc} from './types';
import {insertRuleAfter, insertRuleBefore, insertRuleInto, insertIdents} from './modifySCSS';
import {getMainComponentName} from '../common';
import {skipTags} from '../tags';

export type PluginReturn = ReturnType<typeof plugin>;
export function plugin(tsxFileName: string, tsxContent: string, scssContent: string) {
    const tsx = extractTSX(tsxFileName, tsxContent);
    const scss = extractSCSS(tsxFileName, scssContent);
    const mainComponentName = getMainComponentName(tsxFileName);
    if (!tsx.mainComponent || (scss.mainComponent && tsx.mainComponent.name !== scss.mainComponent.name)) return;
    const tsxMainComponent = tsx.mainComponent;
    const scssMainComponent = scss.mainComponent;

    const weakMap = new WeakMap<Item, Item>();

    const IDENT_SIZE = 4;

    if (scssMainComponent) {
        weakMap.set(tsxMainComponent, scssMainComponent);
        weakMap.set(scssMainComponent, tsxMainComponent);
        matchComponents(tsxMainComponent.components, scssMainComponent.components, weakMap);
        matchElements(tsxMainComponent.elements, scssMainComponent.elements, weakMap);
    }

    return {
        mainComponentName,
        shouldSkipTagName,
        tsx: {
            getEntity: getEntity.bind(undefined, tsxMainComponent),
            mainComponent: tsxMainComponent,
            getSCSSEntity: getOpposite,
            rename: renameTSX,
        },
        scss: {
            getEntity: getEntity.bind(undefined, scssMainComponent),
            mainComponent: scssMainComponent,
            getTSXEntity: getOpposite,
            insert,
            insertMainComponent,
            insertComponent,
            insertElement,
            insertMod,
            rename: renameSCSSRule,
        },
    };

    function shouldSkipTagName(tagName: string) {
        return skipTags.includes(tagName);
    }

    function mainComponentPrefix(name: string, content: string) {
        return `.${name} {\n${insertIdents(content, IDENT_SIZE)}\n}`;
    }
    function componentPrefix(name: string, content: string) {
        return `&__${name} {\n${insertIdents(content, IDENT_SIZE)}\n}`;
    }
    function elementPrefix(name: string, content: string) {
        return `&__${name} {\n${insertIdents(content, IDENT_SIZE)}\n}`;
    }
    function modPrefix(name: string, content: string) {
        return `&--${name} {\n${insertIdents(content, IDENT_SIZE)}\n}`;
    }

    function getOpposite<T extends Item>(item: T) {
        return weakMap.get(item) as T | undefined;
    }

    function withinLoc(loc: Loc, offset: number) {
        return loc.start.offset <= offset && offset <= loc.end.offset;
    }

    function getEntity(mainComponent: MainComponent | undefined, offset: number) {
        if (!mainComponent) return;
        if (withinLoc(mainComponent.pos.token, offset)) return mainComponent;
        for (let i = 0; i < mainComponent.components.length; i++) {
            const component = mainComponent.components[i];
            if (withinLoc(component.pos.token, offset)) return component;
            const el = iterElements(component.elements);
            if (el) return el;
        }
        return iterElements(mainComponent.elements);
        function iterElements(elements: Element[]) {
            for (let i = 0; i < elements.length; i++) {
                const element = elements[i];
                if (withinLoc(element.pos.token, offset)) return element;
                for (let j = 0; j < element.mods.length; j++) {
                    const mod = element.mods[j];
                    if (withinLoc(mod.pos.token, offset)) return mod;
                }
            }
        }
    }

    function insertRule(
        scssParent: Item,
        closestSCSSItem: {pos: 'before' | 'after'; item: Item} | undefined,
        ruleContent: string,
    ) {
        // console.log('insert', tsxName, closestSCSSElement, tsxItems);
        if (closestSCSSItem) {
            if (closestSCSSItem.pos === 'after') {
                return insertRuleAfter(scssContent, closestSCSSItem.item.pos.node, ruleContent);
            } else {
                return insertRuleBefore(scssContent, closestSCSSItem.item.pos.node, ruleContent);
            }
        } else {
            return insertRuleInto(scssContent, scssParent.pos.node, scssParent.pos.inner, ruleContent);
        }
    }

    function insert(tsxItem: Item) {
        switch (tsxItem.kind) {
            case 'mainComponent':
                return insertMainComponent('');
            case 'component':
                return insertComponent(tsxItem.name, '');
            case 'element':
                return insertElement(tsxItem.parent, tsxItem.name, '');
            case 'mod':
                return insertMod(tsxItem.parent, tsxItem.name, '');
        }
    }

    function insertComponent(tsxComponentName: string, content: string) {
        const closestSCSSItem = findClosestExistsItem(tsxMainComponent.components, tsxComponentName);
        if (scssMainComponent) {
            return insertRule(scssMainComponent, closestSCSSItem, componentPrefix(tsxComponentName, content));
        } else {
            return insertMainComponent(componentPrefix(tsxComponentName, content));
        }
    }

    function insertMainComponent(content: string) {
        return scssContent + mainComponentPrefix(mainComponentName, content);
    }

    function insertElement(tsxComponent: MainComponent | Component, elementName: string, content: string) {
        const scssComponent = getOpposite(tsxComponent);
        const elementContent = elementPrefix(elementName, content);
        if (scssComponent) {
            const closestSCSSElement = findClosestExistsItem(tsxComponent.elements, elementName);
            const scssEl = getOpposite(scssMainComponent!.elements[0]);
            // console.log(scssMainComponent, scssEl, elementName, closestSCSSElement);
            return insertRule(scssComponent, closestSCSSElement, elementContent);
        } else {
            if (tsxComponent.kind === 'component') {
                return insertComponent(tsxComponent.name, elementContent);
            } else {
                return insertMainComponent(elementContent);
            }
        }
    }

    function insertMod(tsxElement: Element, modName: string, content: string) {
        const scssElement = getOpposite(tsxElement);
        const modContent = modPrefix(modName, content);
        if (scssElement) {
            const closestSCSSMod = findClosestExistsItem(tsxElement.mods, modName);
            return insertRule(scssElement, closestSCSSMod, modContent);
        } else {
            return insertElement(tsxElement.parent, tsxElement.name, modContent);
        }
    }

    function findClosestExistsItem<T extends Item>(
        parentItems: T[],
        itemName: string,
    ): {pos: 'before' | 'after'; item: T} | undefined {
        const idx = parentItems.findIndex(item => item.name === itemName);
        if (idx === -1) {
            console.log(parentItems);
            throw new Error('Item not found: ' + itemName);
        }
        for (let i = 0; i < parentItems.length; i++) {
            if (idx - i >= 0) {
                const item = parentItems[idx - i];
                const destItem = getOpposite(item);
                if (destItem) return {pos: 'after', item: destItem};
            }
            if (idx + i < parentItems.length) {
                const item = parentItems[idx + i];
                const destItem = getOpposite(item);
                if (destItem) return {pos: 'before', item: destItem};
            }
        }
        // console.log('Nothing was found: ' + itemName);
    }

    function renameTSX(item: Item, newName: string) {
        if (item.kind === 'mod') {
            newName = `mod-${newName}`;
        }
        const diff = item.name.length - newName.length;
        const content =
            tsxContent.substr(0, item.pos.token.start.offset) + newName + tsxContent.substr(item.pos.token.end.offset);
        if (item.pos.endToken) {
            return (
                content.substr(0, item.pos.endToken.start.offset - diff) +
                newName +
                content.substr(item.pos.endToken.end.offset - diff)
            );
        }
        return content;
    }

    function renameSCSSRule(item: Item, newName: string) {
        let content = '';
        switch (item.kind) {
            case 'mainComponent':
                content = `.${newName}`;
                break;
            case 'component':
            case 'element':
                content = `&__${newName}`;
                break;
            case 'mod':
                content = `&--${newName}`;
                break;
        }
        return (
            scssContent.substr(0, item.pos.token.start.offset) + content + scssContent.substr(item.pos.token.end.offset)
        );
    }
}
