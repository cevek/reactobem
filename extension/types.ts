
export interface Component {
    name: string;
    pos: number;
    elements: Element[];
}

export interface Element {
    name: string;
    pos: number;
    mods: Mod[];
}

export interface Mod {
    name: string;
    pos: number;
    
}