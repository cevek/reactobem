export function insertRuleInto(scssText: string, into: {pos: number; blockStart: number}, content: string) {
    const identSize = findIdent(scssText, into.pos) + 4;
    return (
        scssText.substr(0, into.blockStart) + `\n${insertIdents(content, identSize)}` + scssText.substr(into.blockStart)
    );
}

export function insertRuleAfter(scssText: string, after: {pos: number; end: number}, content: string) {
    const identSize = findIdent(scssText, after.pos);
    const ident = ' '.repeat(identSize);
    return (
        scssText.substr(0, after.end) + `\n\n${insertIdents(content, identSize)}\n${ident}` + scssText.substr(after.end)
    );
}

export function insertRuleBefore(scssText: string, before: {pos: number; end: number}, content: string) {
    const identSize = findIdent(scssText, before.pos);
    const ident = ' '.repeat(identSize);
    return (
        scssText.substr(0, before.pos) +
        `\n${insertIdents(content, identSize)}\n\n${ident}` +
        scssText.substr(before.pos)
    );
}

export function insertIdents(text: string, identSize: number) {
    const ident = ' '.repeat(identSize);
    return text
        .split('\n')
        .map(line => ident + line)
        .join('\n');
}

function findIdent(text: string, pos: number) {
    let i = pos;
    while (i >= 0) {
        if (text[i] === '\n') return Math.max(pos - i - 1, 0);
        i--;
    }
    return 0;
}
