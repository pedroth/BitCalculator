
//========================================================================================
/*                                                                                      *
 *                                          UI                                          *
 *                                                                                      */
//========================================================================================

import { execute } from "./src/Calculator.js";
import { parse } from "./src/Parser.js";

// Global selected render
let selectedRender = ast => { };

function getReadMe() {
  return `'''
Simple Binary calculator

Language symbols: 
  0, 1, +, -, *, /, (, )

Numbers in binary, e.g: 
  11.0010010 ~ 3.14
  -0.01 = -0.25
'''
(1 + 1.1) * 0.1;
(11.1 - 111/10) + 11.0010010;
1+1+1+1+1-101;
`;
}

const renderTypes = {
  Calculator: execute,
  "Parse Tree": tree => {
    return JSON.stringify(tree, null, 3);
  }
};

function onResize() {
  const style = document.getElementById("composer").style;
  const input = document.getElementById("input");
  const output = document.getElementById("outputContainer");
  if (window.innerWidth >= window.innerHeight) {
    style["flex-direction"] = "row";

    input.style.width = `${window.innerWidth / 2}px`;
    input.style.height = `${window.innerHeight * 0.95}px`;

    output.style.width = `${window.innerWidth / 2}px`;
    output.style.height = `${window.innerHeight * 0.95}px`;
  } else {
    style["flex-direction"] = "column";
    input.style.width = `${100}%`;
    input.style.height = `${window.innerHeight / 2}px`;
    output.style.width = `${100}%`;
    output.style.height = `${window.innerHeight / 2}px`;
  }
}

/**
 *
 * @param {*} renderTypes
 * @param {*} editor
 */
function setRenderSelect(renderTypes, editor) {
  const selector = document.getElementById("renderSelector");
  Object.keys(renderTypes).forEach((name, i) => {
    const option = document.createElement("option");
    option.setAttribute("value", name);
    if (i === 0) option.setAttribute("selected", "");
    option.innerText = name;
    selector.appendChild(option);
  });
  selector.addEventListener("change", e => {
    const renderName = e.target.value;
    selectedRender = renderTypes[renderName];
    const output = document.getElementById("output");
    output.value = selectedRender(parse(editor.getValue()));
  });
}

async function createEditor() {
  // eslint-disable-next-line no-undef
  require.config({ paths: { vs: './vs-monaco/package/min/vs' } });

  
  const editor = await new Promise((re) => {
    // eslint-disable-next-line no-undef
    require(['vs/editor/editor.main'], function () {
      // eslint-disable-next-line no-undef
      re(monaco.editor.create(document.getElementById("input"), {
        value: "",
        fontSize: "20",
        language: "yaml",
        theme: "vs-dark",
        lineNumbers: "on",
        automaticLayout: true,
        wordWrap: "wordWrapColumn",
      }));
    })
  });
  addEditorEventListener(editor, document.getElementById("output"));
  return editor;
}

function debounce(lambda, debounceTimeInMillis = 500) {
  let timerId;
  return function (...vars) {
    if (timerId) {
      clearTimeout(timerId);
    }
    timerId = setTimeout(() => {
      lambda(...vars);
    }, debounceTimeInMillis);
    return true;
  };
}

function addEditorEventListener(editor, output) {
  editor.onDidChangeModelContent(
    debounce(() => {
      output.value = selectedRender(parse(editor.getValue()));
    })
  );
}

(async () => {
  const editor = await createEditor();
  onResize();
  window.addEventListener("resize", onResize);
  const input = getReadMe();
  editor.setValue(input);
  const output = document.getElementById("output");
  selectedRender = renderTypes["Calculator"];
  setRenderSelect(renderTypes, editor);
  output.value = selectedRender(parse(editor.getValue()));
})();
