export function assert(a: string, b: string) {
    if (a.replace(/\s+/g, ' ') !== b.replace(/\s+/g, ' '))
        throw new Error(`Not equal: \n-------\n${a}\n-------\n${b}\n-------`);
}