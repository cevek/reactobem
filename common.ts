import {extname, basename, dirname} from 'path';
import {createHash} from 'crypto';

export function getModName(propName: string) {
    return propName.match(/^mod-/) ? propName.substr(4) : undefined;
}

export function getMainComponentName(fileName: string) {
    const _baseName = basename(fileName, extname(fileName));
    const baseName = _baseName === 'index' ? basename(dirname(fileName)) : _baseName;
    return baseName === 'src' ? '' : baseName;
}

export function getHashOfClassName(str: string, minifiedSize = 6) {
    const hash = createHash('sha256')
        .update(str)
        .digest()
        .toString('base64');
    let s = '';
    for (let i = 0; i < hash.length; i++) {
        const sym = hash[i];
        if (sym === '+' || sym === '/') continue;
        if (s === '' && Number.isInteger(+sym)) continue;
        s += sym;
        if (s.length === minifiedSize) return s;
    }
    return s;
}
