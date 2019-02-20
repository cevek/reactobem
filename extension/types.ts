
export interface Component {
    name: string;
    pos: number;
    end: number;
    elements: Element[];
}

export interface Element {
    name: string;
    pos: number;
    end: number;
    mods: Mod[];
}

export interface Mod {
    name: string;
    pos: number;
    end: number;
}