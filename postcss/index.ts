import * as postcss from 'postcss';
import {getHashOfClassName} from '../common';

export default postcss.plugin('reactobem', () => {
    return async (css, result) => {
        css.walkRules(/^\./, rule => {
            if (rule.type === 'rule') {
                rule.selectors = rule.selectors!.map(hashClassName);
            }
        });
    };
});

function hashClassName(name: string) {
    const m = name.match(/^\.([\w_-]+)(.*?)$/);
    if (!m) return name;
    return `.${getHashOfClassName(m[1])}${m[2]}`;
}
