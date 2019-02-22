export type Item = MainComponent | Component | Element | Mod;
export interface Loc {
    start: {offset: number, line: number, column: number};
    end: {offset: number, line: number, column: number};
}
export interface Pos {
    node: Loc;
    inner: Loc;
    token: Loc;
}

export interface MainComponent {
    type: 'tsx' | 'scss';
    kind: 'mainComponent';
    name: string;
    pos: Pos;
    components: Component[];
    elements: Element[];
}
export interface Component {
    type: 'tsx' | 'scss';

    kind: 'component';
    name: string;
    pos: Pos;
    elements: Element[];
}

export interface Element {
    type: 'tsx' | 'scss';

    kind: 'element';
    name: string;
    pos: Pos;
    mods: Mod[];
}

export interface Mod {
    type: 'tsx' | 'scss';

    kind: 'mod';
    name: string;
    pos: Pos;
}
