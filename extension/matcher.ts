import {Component, Element, Mod, Item} from './types';

export function matchComponents(sourceComponents: Component[], destComponents: Component[], weakMap: WeakMap<Item, Item>) {
    sourceComponents.forEach(source => {
        const dest = destComponents.find(cmp => cmp.name === source.name);
        if (dest) {
            weakMap.set(dest, source);
            weakMap.set(source, dest);
            matchElements(source.elements, dest.elements, weakMap);
        }
    });
    return weakMap;
}

export function matchElements(sourceElements: Element[], destElements: Element[], weakMap: WeakMap<Item, Item>) {
    sourceElements.forEach(source => {
        const dest = destElements.find(cmp => cmp.name === source.name);
        if (dest) {
            weakMap.set(dest, source);
            weakMap.set(source, dest);
            matchMods(source.mods, dest.mods, weakMap);
        }
    });
}

export function matchMods(sourceMods: Mod[], destMods: Mod[], weakMap: WeakMap<Item, Item>) {
    sourceMods.forEach(source => {
        const dest = destMods.find(cmp => cmp.name === source.name);
        if (dest) {
            weakMap.set(dest, source);
            weakMap.set(source, dest);
        }
    });
}
