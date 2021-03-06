import {plugin} from '../main';
import {Replace} from '../types';

test(
    'insert element',
    {type: 'element', component: 'App', name: 'root'},
    `
function App() {
    return <root/>;
}
`,
    `
.App {

}
`,
    `
.App {
    &__root {
        
    }

}`,
);

test(
    'insert element after',
    {type: 'element', component: 'App', name: 'x'},
    `
function App() {
    return <root><x/><y/></root>;
}
`,
    `
.App {
    &__root {}
}
`,
    `
.App {
    &__root {}

    &__x {
        
    }
    
}    
`,
);

test(
    'insert element before',
    {type: 'element', component: 'App', name: 'x'},
    `
function App() {
    return <root><x/><y/></root>;
}
`,
    `
.App {
    &__y {}
}
`,
    `
.App {
    
    &__x {
        
    }

    &__y {}
}`,
);

test(
    'insert main component on empty file',
    {type: 'mainComponent'},
    `
function App() {
    return <root/>;
}
`,
    '',
    `
.App {
    
}    
    `,
);

test(
    'insert component on existent file',
    {type: 'mainComponent'},
    `
function App() {
    return <root/>;
}
`,
    `
.Foo {
    
}
`,
    `
.Foo {
    
}

.App {
    
}   
    `,
);

test(
    'insert element without main component',
    {type: 'element', component: 'App', name: 'x'},
    `
function App() {
    return <root><x/><y/></root>;
}
`,
    `
.Bar {}
`,
    `
.Bar {}

.App {
    &__x {
        
    }
}
    `,
);

test(
    'insert mod without element and component',
    {type: 'mod', component: 'App', element: 'x', name: 'blue'},
    `
function App() {
    return <root><x/></root>;
}
`,
    ``,
    `
.App {
    &__x {
        &--blue {
            
        }
    }
}
    `,
);

test(
    'insert mod without element',
    {type: 'mod', component: 'App', element: 'x', name: 'blue'},
    `
function App() {
    return <root><x mod-blue/></root>;
}
`,
    `
.App {
    
}    
`,
    `
.App {
    &__x {
        &--blue {
            
        }
    }
    
}
    `,
);
test(
    'insert mod',
    {type: 'mod', component: 'App', element: 'x', name: 'blue'},
    `
function App() {
    return <root><x mod-blue/></root>;
}
`,
    `
.App {
    &__x {}
}    
`,
    `
.App {
    &__x {
        &--blue {
            
        }}
}
    `,
);

test(
    'insert mod with exists another mod',
    {type: 'mod', component: 'App', element: 'x', name: 'blue'},
    `
function App() {
    return <root><x mod-blue mod-red/></root>;
}
`,
    `
.App {
    &__x {
        color: white;
        &--red {
            
        } 
    }
}    
`,
    `
.App {
    &__x {
        color: white;
        
        &--blue {
            
        }

        &--red {
            
        } 
    }
}
    `,
);

test(
    'insert helper component/element into main component',
    {type: 'element', component: 'Helper', name: 'main'},
    `
function App() {
    return <root><x mod-blue mod-red/></root>;
}
function Helper() {
    return <main/>;
}
`,
    `
.App {
    
}
`,
    `
.App {
    &__Helper {
        &__main {
            
        }
    }
    
}
    `,
);

test(
    'insert helper mainComponent/component/element into main component',
    {type: 'element', component: 'Helper', name: 'main'},
    `
function App() {
    return <root><x mod-blue mod-red/></root>;
}
function Helper() {
    return <main/>;
}
`,
    '',
    `
.App {
    &__Helper {
        &__main {
            
        }
    }
}
    `,
);

test(
    'insert mod into sub component/element',
    {type: 'mod', component: 'Helper', element: 'main', name: 'y'},
    `
function App() {
    return <root><x mod-blue mod-red/></root>;
}
function Helper() {
    return <main mod-x mod-y mod-z/>;
}
`,
    `
.App {
    &__Helper {
        &__main {
            &--x {
                
            }
            &--z {
                
            }
            color: red;
        }
    }
}    `,
    `
.App {
    &__Helper {
        &__main {
            &--x {
                
            }

            &--y {
                
            }
            
            &--z {
                
            }
            color: red;
        }
    }
}
    `,
);

function test(
    name: string,
    insert:
        | {type: 'mainComponent'}
        | {type: 'component'; name: string}
        | {type: 'element'; component: string; name: string}
        | {type: 'mod'; component: string; element: string; name: string},
    tsx: string,
    scss: string,
    expectScss: string,
) {
    expectScss = expectScss.trim();
    const p = plugin('/tests/App/App.tsx', tsx, scss);
    if (!p) return;
    let replaces: Replace[] = [];
    if (insert.type === 'mainComponent') {
        replaces = p.scss.insertMainComponent('');
    } else if (insert.type === 'component') {
        replaces = p.scss.insertComponent(insert.name, '');
    } else if (insert.type === 'element') {
        const tsxComponent =
            p.tsx.mainComponent.name === insert.component
                ? p.tsx.mainComponent
                : p.tsx.mainComponent.components.find(cmp => cmp.name === insert.component)!;
        replaces = p.scss.insertElement(tsxComponent, insert.name, '');
    } else if (insert.type === 'mod') {
        const tsxComponent =
            p.tsx.mainComponent.name === insert.component
                ? p.tsx.mainComponent
                : p.tsx.mainComponent.components.find(cmp => cmp.name === insert.component)!;
        const tsxElement = tsxComponent.elements.find(el => el.name === insert.element)!;
        replaces = p.scss.insertMod(tsxElement, insert.name, '');
    }

    let result = scss;
    let diff = 0;
    replaces.forEach(replace => {
        result =
            result.substring(0, replace.range.start.offset - diff) +
            replace.text +
            result.substring(replace.range.end.offset - diff);
        diff += replace.range.end.offset - replace.range.start.offset - replace.text.length;
    });
    if (result.trim() !== expectScss.trim()) {
        console.error(
            `test "${name}" failed`,
            `\nResult:\n${result.trim().replace(/ /g, '•')}\n-------------\nExpected:\n${expectScss
                .trim()
                .replace(/ /g, '•')}`,
        );
    }
    return p;
}
