// function lineColToPos(content: string, obj: {line: number; column: number}) {
//     const lines = content.split('\n');
//     let pos = 0;
//     for (let i = 0; i < obj.line - 1; i++) {
//         pos += lines[i].length + 1;
//     }
//     return pos + obj.column - 1;
// }

// function posToLineCol(content: string, pos: number): {line: number; column: number} {
//     const obj = {line: 0, column: 0};
//     const lines = content.split('\n');
//     let d = pos;
//     for (let i = 0; i < lines.length; i++) {
//         const line = lines[i];
//         obj.line = i;
//         d -= line.length + 1;
//         if (d <= 0) {
//             obj.column = line.length;
//             return obj;
//         }
//     }
//     return pos + obj.column - 1;
// }
