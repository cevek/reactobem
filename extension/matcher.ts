import { Component, Element, Mod } from './types';

export function match(sourceComponents: Component[], destComponents: Component[]) {
    const componentsWeakMap = new WeakMap<Component, Component>();
    const elementsWeakMap = new WeakMap<Element, Element>();
    const modsWeakMap = new WeakMap<Mod, Mod>();

    sourceComponents.forEach(source => {
        const dest = destComponents.find(cmp => cmp.name === source.name);
        if (dest) {
            componentsWeakMap.set(dest, source);
            componentsWeakMap.set(source, dest);
            matchElements(source.elements, dest.elements);
        }
    });

    return {
        componentWeakMap: componentsWeakMap,
        elementsWeakMap,
        modsWeakMap,
        findClosestExistsElement,
    };

    function matchElements(sourceElements: Element[], destElements: Element[]) {
        sourceElements.forEach(source => {
            const dest = destElements.find(cmp => cmp.name === source.name);
            if (dest) {
                elementsWeakMap.set(dest, source);
                elementsWeakMap.set(source, dest);
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
            }
        });
    }

    function findClosestExistsElement(component: Component, element: Element) {
        const destComponent = componentsWeakMap.get(component);
        if (destComponent) {
            const idx = component.elements.indexOf(element);
            for (let i = 0; i < component.elements.length; i++) {
                if (idx - i >= 0) {
                    const el = component.elements[idx - i];
                    const destEl = elementsWeakMap.get(el);
                    if (destEl) return {upperElement: destEl};
                }
                if (idx + i < component.elements.length) {
                    const el = component.elements[idx + i];
                    const destEl = elementsWeakMap.get(el);
                    if (destEl) return {lowerElement: destEl};
                }
            }
        }
    }
}
