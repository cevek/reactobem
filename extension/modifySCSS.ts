import { Loc } from "./types";

export function insertRuleInto(
    scssText: string,
    parentPos: Loc,
    into: Loc,
    content: string
) {
    const identSize = findIdent(scssText, parentPos.start.offset) + 4;
    return scssText.substr(0, into.start.offset) + `\n${insertIdents(content, identSize)}` + scssText.substr(into.start.offset);
}

export function insertRuleAfter(scssText: string, after: Loc, content: string) {
    const identSize = findIdent(scssText, after.start.offset);
    const ident = ' '.repeat(identSize);
    return (
        scssText.substr(0, after.end.offset) + `\n\n${insertIdents(content, identSize)}\n${ident}` + scssText.substr(after.end.offset)
    );
}

export function insertRuleBefore(scssText: string, before: Loc, content: string) {
    const identSize = findIdent(scssText, before.start.offset);
    const ident = ' '.repeat(identSize);
    return (
        scssText.substr(0, before.start.offset) +
        `\n${insertIdents(content, identSize)}\n\n${ident}` +
        scssText.substr(before.start.offset)
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
