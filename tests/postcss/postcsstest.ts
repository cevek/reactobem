import * as postcss from 'postcss';
import {readFileSync} from 'fs';
import reactobem from '../../postcss';

async function main() {
    const css = readFileSync('example.css');
    const res = await postcss([reactobem]).process(css, {from: 'example.css', to: 'dest/app.css'});
    console.log(res.css);
}

main();