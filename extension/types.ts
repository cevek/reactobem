export type Item = MainComponent | Component | Element | Mod;
export interface Loc {
    start: {offset: number, line: number, column: number};
    end: {offset: number, line: number, column: number};
}
export interface Pos {
    node: Loc;
    inner: Loc;
    token: Loc;
    endToken: Loc | undefined;
}

export interface MainComponent {
    type: 'tsx' | 'scss';
    kind: 'mainComponent';
    name: string;
    pos: Pos;
    components: Component[];
    elements: Element[];
    parent: MainComponent;
}
export interface Component {
    type: 'tsx' | 'scss';
    kind: 'component';
    name: string;
    pos: Pos;
    elements: Element[];
    parent: MainComponent;
}

export interface Element {
    type: 'tsx' | 'scss';
    kind: 'element';
    name: string;
    pos: Pos;
    mods: Mod[];
    parent: MainComponent | Component;
}

export interface Mod {
    type: 'tsx' | 'scss';
    kind: 'mod';
    name: string;
    pos: Pos;
    parent: Element;
}
