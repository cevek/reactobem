export function insertRuleInto(
    scssText: string,
    parentPos: { start: number },
    into: { start: number },
    content: string
) {
    const identSize = findIdent(scssText, parentPos.start) + 4;
    return scssText.substr(0, into.start) + `\n${insertIdents(content, identSize)}` + scssText.substr(into.start);
}

export function insertRuleAfter(scssText: string, after: { start: number; end: number }, content: string) {
    const identSize = findIdent(scssText, after.start);
    const ident = ' '.repeat(identSize);
    return (
        scssText.substr(0, after.end) + `\n\n${insertIdents(content, identSize)}\n${ident}` + scssText.substr(after.end)
    );
}

export function insertRuleBefore(scssText: string, before: { start: number; end: number }, content: string) {
    const identSize = findIdent(scssText, before.start);
    const ident = ' '.repeat(identSize);
    return (
        scssText.substr(0, before.start) +
        `\n${insertIdents(content, identSize)}\n\n${ident}` +
        scssText.substr(before.start)
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
