
declare global {
    namespace JSX {
        interface IntrinsicElements {
            [other: string]:
                | React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>
                | React.SVGProps<SVGElement>;
        }
    }
}
declare module 'react' {
    interface HTMLAttributes<T> {
        as?: string;
    }
}

export function assert(a: string, b: string) {
    if (a.replace(/\s+/g, ' ') !== b.replace(/\s+/g, ' '))
        throw new Error(`Not equal: \n-------\n${a}\n-------\n${b}\n-------`);
}