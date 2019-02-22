declare namespace JSX {
    export interface IntrinsicElements {
        [other: string]: React.DetailedHTMLProps<CustomHTMLAttributes, HTMLElement> | React.SVGProps<SVGElement>;
    }
}

interface CustomHTMLAttributes extends React.HTMLAttributes<HTMLElement> {
    as?: string;
}