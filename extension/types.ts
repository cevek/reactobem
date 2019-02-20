export type Item = Component | Element | Mod;
export interface File {
    kind: 'file';
    name: string;
    components: Component[];
}
export interface Component {
    kind: 'component';
    name: string;
    pos: number;
    end: number;
    elements: Element[];
    blockStart: number;
}

export interface Element {
    kind: 'element';
    name: string;
    pos: number;
    end: number;
    mods: Mod[];
    blockStart: number;
}

export interface Mod {
    kind: 'mod';
    name: string;
    pos: number;
    end: number;
    blockStart: number;
}
