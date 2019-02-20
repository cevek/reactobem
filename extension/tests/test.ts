import {plugin} from '../main';

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
    'insert component on empty file',
    {type: 'component', name: 'App'},
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
    {type: 'component', name: 'App'},
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
    'insert element without component',
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
    'insert mod',
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

function test(
    name: string,
    insert:
        | {type: 'component'; name: string}
        | {type: 'element'; component: string; name: string}
        | {type: 'mod'; component: string; element: string; name: string},
    tsx: string,
    scss: string,
    expectScss: string,
) {
    expectScss = expectScss.trim();
    const p = plugin(tsx, scss);
    let result = '';
    if (insert.type === 'component') {
        result = p.insertComponent(insert.name);
    } else if (insert.type === 'element') {
        const tsxComponent = p.tsx.components.find(cmp => cmp.name === insert.component)!;
        result = p.insertElement(tsxComponent, insert.name);
    } else if (insert.type === 'mod') {
        const tsxComponent = p.tsx.components.find(cmp => cmp.name === insert.component)!;
        const tsxElement = tsxComponent.elements.find(el => el.name === insert.element)!;
        result = p.insertMod(tsxComponent, tsxElement, insert.name);
    }
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
