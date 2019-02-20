import {Component, Element, Mod, Item} from './types';

export function match(sourceComponents: Component[], destComponents: Component[]) {
    const allWeakMap = new WeakMap<Item, Item>();
    const componentsWeakMap = new WeakMap<Component, Component>();
    const elementsWeakMap = new WeakMap<Element, Element>();
    const modsWeakMap = new WeakMap<Mod, Mod>();

    sourceComponents.forEach(source => {
        const dest = destComponents.find(cmp => cmp.name === source.name);
        if (dest) {
            componentsWeakMap.set(dest, source);
            componentsWeakMap.set(source, dest);
            allWeakMap.set(dest, source);
            allWeakMap.set(source, dest);
            matchElements(source.elements, dest.elements);
        }
    });

    return {
        componentWeakMap: componentsWeakMap,
        elementsWeakMap,
        modsWeakMap,
        findClosestExistsItem,
    };

    function matchElements(sourceElements: Element[], destElements: Element[]) {
        sourceElements.forEach(source => {
            const dest = destElements.find(cmp => cmp.name === source.name);
            if (dest) {
                elementsWeakMap.set(dest, source);
                elementsWeakMap.set(source, dest);
                allWeakMap.set(dest, source);
                allWeakMap.set(source, dest);

                matchMods(source.mods, dest.mods);
            }
        });
    }

    function matchMods(sourceMods: Mod[], destMods: Mod[]) {
        sourceMods.forEach(source => {
            const dest = destMods.find(cmp => cmp.name === source.name);
            if (dest) {
                modsWeakMap.set(dest, source);
                modsWeakMap.set(source, dest);
                allWeakMap.set(dest, source);
                allWeakMap.set(source, dest);
            }
        });
    }

    function findClosestExistsItem(
        parentItems: Item[],
        itemName: string,
    ): {pos: 'before' | 'after'; item: Item} | undefined {
        const idx = parentItems.findIndex(item => item.name === itemName);
        if (idx === -1) {
            console.log(parentItems);
            throw new Error('Item not found: ' + itemName);
        }
        for (let i = 0; i < parentItems.length; i++) {
            if (idx - i >= 0) {
                const item = parentItems[idx - i];
                const destItem = allWeakMap.get(item);
                if (destItem) return {pos: 'after', item: destItem};
            }
            if (idx + i < parentItems.length) {
                const item = parentItems[idx + i];
                const destItem = allWeakMap.get(item);
                if (destItem) return {pos: 'before', item: destItem};
            }
        }
        // console.log('Nothing was found: ' + itemName);
    }
}
