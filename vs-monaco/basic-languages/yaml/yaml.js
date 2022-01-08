/*!-----------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Version: 0.31.1(337587859b1c171314b40503171188b6cea6a32a)
 * Released under the MIT license
 * https://github.com/microsoft/monaco-editor/blob/main/LICENSE.txt
 *-----------------------------------------------------------------------------*/
define("vs/basic-languages/yaml/yaml", [], () => {
  var moduleExports = (() => {
    var r = Object.defineProperty;
    var o = e => r(e, "__esModule", { value: !0 });
    var l = (e, n) => {
      o(e);
      for (var t in n) r(e, t, { get: n[t], enumerable: !0 });
    };
    var c = {};
    l(c, { conf: () => a, language: () => i });
    var a = {},
      i = {
        defaultToken: "",
        tokenPostfix: ".python",

        keywords: [],

        brackets: [{ open: "(", close: ")", token: "delimiter.parenthesis" }],

        tokenizer: {
          root: [
            { include: "@whitespace" },
            { include: "@numbers" },
            { include: "@strings" },

            [/[;]/, "delimiter"],
            [/[{}\[\]()]/, "@brackets"],

            [/@[a-zA-Z]\w*/, "tag"],
            [
              /[a-zA-Z]\w*/,
              {
                cases: {
                  "@keywords": "keyword",
                  "@default": "identifier"
                }
              }
            ]
          ],

          // Deal with white space, including single and multi-line comments
          whitespace: [
            [/\s+/, "white"],
            [/('''.*''')|(""".*""")/, "string"],
            [/'''.*$/, "string", "@endDocString"],
            [/""".*$/, "string", "@endDblDocString"]
          ],
          endDocString: [
            [/\\'/, "string"],
            [/.*'''/, "string", "@popall"],
            [/.*$/, "string"]
          ],
          endDblDocString: [
            [/\\"/, "string"],
            [/.*"""/, "string", "@popall"],
            [/.*$/, "string"]
          ],

          // Recognize hex, negatives, decimals, imaginaries, longs, and scientific notation
          numbers: [
            [/-?0x([abcdef]|[ABCDEF]|\d)+[lL]?/, "number.hex"],
            [/-?(\d*\.)?\d+([eE][+\-]?\d+)?[jJ]?[lL]?/, "number"]
          ],

          // Recognize strings, including those broken across lines with \ (but not without)
          strings: [
            [/'$/, "string.escape", "@popall"],
            [/'/, "string.escape", "@stringBody"],
            [/"$/, "string.escape", "@popall"],
            [/"/, "string.escape", "@dblStringBody"]
          ],
          stringBody: [
            [/[^\\']+$/, "string", "@popall"],
            [/[^\\']+/, "string"],
            [/\\./, "string"],
            [/'/, "string.escape", "@popall"],
            [/\\$/, "string"]
          ],
          dblStringBody: [
            [/[^\\"]+$/, "string", "@popall"],
            [/[^\\"]+/, "string"],
            [/\\./, "string"],
            [/"/, "string.escape", "@popall"],
            [/\\$/, "string"]
          ]
        }
      };
    return c;
  })();
  return moduleExports;
});
