export type Item = MainComponent | Component | Element | Mod;
export interface Loc {
    start: number;
    end: number;
}
export interface Pos {
    node: Loc;
    inner: Loc;
    token: Loc;
}

export interface MainComponent {
    kind: 'mainComponent';
    name: string;
    pos: Pos;
    components: Component[];
    elements: Element[];
}
export interface Component {
    kind: 'component';
    name: string;
    pos: Pos;
    elements: Element[];
}

export interface Element {
    kind: 'element';
    name: string;
    pos: Pos;
    mods: Mod[];
}

export interface Mod {
    kind: 'mod';
    name: string;
    pos: Pos;
}
