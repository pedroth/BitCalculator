//========================================================================================
/*                                                                                      *
 *                                         UTILS                                        *
 *                                                                                      */
//========================================================================================

/**
 * creates a pair pair: (a,b) => pair
 * @param {*} a left
 * @param {*} b right
 */
function pair(a, b) {
  return { left: a, right: b };
}

/**
 * creates a stream from a string, string => stream
 * @param {*} string
 */
function stream(stringOrArray) {
  // copy array or string to array
  const array = [...stringOrArray];
  return {
    next: () => stream(array.slice(1)),
    peek: () => array[0],
    hasNext: () => array.length >= 1,
    isEmpty: () => array.length === 0,
    toString: () =>
      array.map(s => (typeof s === "string" ? s : JSON.stringify(s))).join(""),
    filter: predicate => stream(array.filter(predicate)),
    log: () => {
      let s = stream(array);
      while (s.hasNext()) {
        console.log(s.peek());
        s = s.next();
      }
    }
  };
}

function or(...rules) {
  let accError = null;
  for (let i = 0; i < rules.length; i++) {
    try {
      return rules[i]();
    } catch (error) {
      accError = error;
    }
  }
  throw accError;
}

/**
 * Returns a value based on the predicate
 * @param {*} listOfPredicates
 * @param {*} defaultValue
 */
function returnOne(listOfPredicates, defaultValue = 0) {
  return input => {
    for (let i = 0; i < listOfPredicates.length; i++) {
      if (listOfPredicates[i].predicate(input))
        return listOfPredicates[i].value(input);
    }
    return defaultValue;
  };
}

function removeComments(streamWithComments) {
  const stack = [];
  let state = 0;
  let s = streamWithComments;
  while (s.hasNext()) {
    const isComment = isCommentToken(s);
    if (!isComment && state === 0) {
      stack.push(s.peek());
      s = s.next();
    } else if (isComment && state === 0) {
      s = eatCommentTokenFromStream(s);
      state = 1;
    } else if (!isComment && state === 1) {
      s = s.next();
    } else {
      // isComment && state === 1
      s = eatCommentTokenFromStream(s);
      state = 0;
    }
  }
  return stream(stack);
}

function isCommentToken(stream) {
  let s = stream;
  let n = 3;
  while (s.peek() === "'" || (s.peek() === '"' && n > 0)) {
    s = s.next();
    n--;
  }
  return n === 0;
}

function eatCommentTokenFromStream(stream) {
  let s = stream;
  let n = 3;
  while (n > 0) {
    s = s.next();
    n--;
  }
  return s;
}
//========================================================================================
/*                                                                                      *
 *                                        PARSER                                        *
 *                                                                                      */
//========================================================================================

/**
 * Grammar
 *
 * Program -> Expression Program | epsilon
 * Expression -> S;
 * S -> N (+ | -) S | N (+ | -) F | F (+ | -) S | F
 * F -> N (* | /) F | N (* | /) E | E (* | /) F | E
 * E -> (S) | N
 * N -> D.D | -D.D | D | -D
 * D ->  0D | 1D | epsilon
 */

/**
 * creates abstract syntax tree from string, string => AST
 * @param {*} string
 */
function parse(string) {
  const removeCommentsStream = removeComments(stream(string));
  const filterStream = removeCommentsStream.filter(
    c => c !== " " && c !== "\n"
  );
  const program = parseProgram(filterStream);
  return program.left;
}

/**
 * stream => pair(Program, stream)
 *
 * @param {*} stream
 */
function parseProgram(stream) {
  return or(
    () => {
      const { left: expression, right: nextStream } = parseExpression(stream);
      const { left: program, right: nextNextStream } = parseProgram(nextStream);
      return pair(
        {
          type: "program",
          expression: expression,
          program: program
        },
        nextNextStream
      );
    },
    () => pair({ type: "program", expression: null, program: null }, stream)
  );
}

/**
 * stream => pair(Expression, stream)
 *
 * @param {*} stream
 */
function parseExpression(stream) {
  const { left: S, right: nextStream } = parseS(stream);
  if (nextStream.peek() === ";") {
    return pair(
      {
        type: "expression",
        S
      },
      nextStream.next()
    );
  }
  throw new Error(
    "Error occurred while parsing expression," + nextStream.toString()
  );
}

function parseBinary(
  tokenArray,
  parseLeft,
  parseRight,
  composeResult,
  errorMessage = "Error occurred while parsing binary expression "
) {
  return stream => {
    const { left: leftTree, right: nextStream } = parseLeft(stream);
    const operator = nextStream.peek();
    if (tokenArray.some(t => t === operator)) {
      const { left: rightTree, right: nextNextStream } = parseRight(
        nextStream.next()
      );
      return pair(composeResult(leftTree, rightTree, operator), nextNextStream);
    }
    throw new Error(errorMessage + nextStream.toString());
  };
}

/**
 * stream => pair(S, stream)
 *
 * @param {*} stream
 */
function parseS(stream) {
  const errorText = "Error occurred while parsing S,";
  return or(
    () => {
      return parseBinary(
        ["+", "-"],
        parseN,
        parseS,
        (N, S, op) => ({ type: "S", N, S, op }),
        errorText
      )(stream);
    },
    () => {
      return parseBinary(
        ["+", "-"],
        parseN,
        parseF,
        (N, F, op) => ({ type: "S", N, F, op }),
        errorText
      )(stream);
    },
    () => {
      return parseBinary(
        ["+", "-"],
        parseF,
        parseS,
        (F, S, op) => ({ type: "S", F, S, op }),
        errorText
      )(stream);
    },
    () => {
      const { left: F, right: nextStream } = parseF(stream);
      return pair({ type: "S", F }, nextStream);
    }
  );
}

/**
 * stream => pair(F, stream)
 *
 * @param {*} stream
 */
function parseF(stream) {
  const errorText = "Error occurred while parsing F,";
  return or(
    () => {
      return parseBinary(
        ["*", "/"],
        parseN,
        parseF,
        (N, F, op) => ({ type: "F", N, F, op }),
        errorText
      )(stream);
    },
    () => {
      return parseBinary(
        ["*", "/"],
        parseN,
        parseE,
        (N, E, op) => ({ type: "F", N, E, op }),
        errorText
      )(stream);
    },
    () => {
      return parseBinary(
        ["*", "/"],
        parseE,
        parseF,
        (E, F, op) => ({ type: "F", E, F, op }),
        errorText
      )(stream);
    },
    () => {
      const { left: E, right: nextStream } = parseE(stream);
      return pair({ type: "F", E }, nextStream);
    }
  );
}

/**
 * stream => pair(E, stream)
 *
 * @param {*} stream
 */
function parseE(stream) {
  return or(
    () => {
      if (stream.peek() === "(") {
        const { left: S, right: nextStream } = parseS(stream.next());
        if (nextStream.peek() === ")") {
          return pair({ type: "E", S }, nextStream.next());
        }
      }
      throw new Error(
        "Error occurred while parsing E," + nextStream.toString()
      );
    },
    () => {
      const { left: N, right: nextStream } = parseN(stream);
      return pair({ type: "E", N }, nextStream);
    }
  );
}

/**
 * stream => pair(N, stream)
 *
 * @param {*} stream
 */
function parseN(stream) {
  return or(
    () => {
      const { left: D1, right: nextStream } = parseD(stream);
      if (nextStream.peek() === ".") {
        const { left: D2, right: nextNextStream } = parseD(nextStream.next());
        return pair({ type: "N", int: D1, decimal: D2 }, nextNextStream);
      }
      throw new Error(
        "Error occurred while parsing N," + nextStream.toString()
      );
    },
    () => {
      if (stream.peek() === "-") {
        const { left: D1, right: nextStream } = parseD(stream.next());
        if (nextStream.peek() === ".") {
          const { left: D2, right: nextNextStream } = parseD(nextStream.next());
          return pair(
            { type: "N", int: D1, decimal: D2, negative: true },
            nextNextStream
          );
        }
      }
      throw new Error(
        "Error occurred while parsing N," + nextStream.toString()
      );
    },
    () => {
      if (stream.peek() === "-") {
        const { left: D, right: nextStream } = parseD(stream.next());
        return pair({ type: "N", int: D, negative: true }, nextStream);
      }
      throw new Error(
        "Error occurred while parsing N," + nextStream.toString()
      );
    },
    () => {
      const { left: D, right: nextStream } = parseD(stream);
      return pair({ type: "N", int: D }, nextStream);
    }
  );
}

/**
 * stream => pair(D, stream)
 *
 * @param {*} stream
 */
function parseD(stream) {
  return or(
    () => {
      if (stream.peek() === "0") {
        const { left: D, right: nextStream } = parseD(stream.next());
        return pair({ type: "D", int: D?.int ? "0" + D.int : "0" }, nextStream);
      }
      throw new Error("Error occurred while parsing D," + stream.toString());
    },
    () => {
      if (stream.peek() === "1") {
        const { left: D, right: nextStream } = parseD(stream.next());
        return pair({ type: "D", int: D?.int ? "1" + D.int : "1" }, nextStream);
      }
      throw new Error("Error occurred while parsing D," + stream.toString());
    },
    () => pair({ type: "D", int: null }, stream)
  );
}

//========================================================================================
/*                                                                                      *
 *                                      CALCULATOR                                      *
 *                                                                                      */
//========================================================================================

/**
 * Return values of expressions
 * @param {*} tree
 * @returns String
 */
function execute(tree) {
  const listOfExpression = exeProgram(tree);
  return listOfExpression.length > 0 ? listOfExpression.join("\n") : "Empty";
}

/**
 * @param {*} program
 * @returns Array<Number>
 */
function exeProgram(program) {
  if (program.expression === null && program.program === null) return [];
  const expression = exeExpression(program.expression);
  const listOfExpression = exeProgram(program.program);
  return ["> " + expression, ...listOfExpression];
}
/**
 * @param {*} expression
 * @returns Number
 */
function exeExpression(expression) {
  return exeS(expression.S);
}

/**
 * @param {*} S
 * @returns Number
 */
function exeS(S) {
  return returnOne([
    {
      predicate: s => !!s.N && !!s.S,
      value: s => (s.op === "+" ? exeN(s.N) + exeS(s.S) : exeN(s.N) - exeS(s.S))
    },
    {
      predicate: s => !!s.N && !!s.F,
      value: s => (s.op === "+" ? exeN(s.N) + exeF(s.F) : exeN(s.N) - exeF(s.F))
    },
    {
      predicate: s => !!s.F && !!s.S,
      value: s => (s.op === "+" ? exeF(s.F) + exeS(s.S) : exeF(s.F) - exeS(s.S))
    },
    { predicate: s => !!s.F, value: s => exeF(s.F) }
  ])(S);
}

/**
 * @param {*} F
 * @returns Number
 */
function exeF(F) {
  return returnOne([
    {
      predicate: f => !!f.N && !!f.F,
      value: f => (f.op === "*" ? exeN(f.N) * exeF(f.F) : exeN(f.N) / exeF(f.F))
    },
    {
      predicate: f => !!f.N && !!f.E,
      value: f => (f.op === "*" ? exeN(f.N) * exeE(f.E) : exeN(f.N) / exeE(f.E))
    },
    {
      predicate: f => !!f.E && !!f.F,
      value: f => (f.op === "*" ? exeE(f.E) * exeF(f.F) : exeE(f.E) / exeF(f.F))
    },
    { predicate: f => !!f.E, value: f => exeE(f.E) }
  ])(F);
}

/**
 * @param {*} E
 * @returns Number
 */
function exeE(E) {
  return returnOne([
    { predicate: e => !!e.S, value: e => exeS(e.S) },
    { predicate: e => !!e.N, value: e => exeN(e.N) }
  ])(E);
}

/**
 * Converts Binary into base10
 * @param {*} N
 * @returns Number
 */
function exeN(N) {
  const integerBits = exeD(N.int);
  const decimalBits = exeD(N.decimal);
  let integer = 0;
  let id = 1;
  for (let i = integerBits.length - 1; i >= 0; i--) {
    integer += id * integerBits[i];
    id *= 2;
  }
  let decimal = 0;
  id = 0.5;
  for (let i = 0; i < decimalBits.length; i++) {
    decimal += id * decimalBits[i];
    id /= 2;
  }
  const number = integer + decimal;
  return !!N.negative ? -1 * number : number;
}

/**
 *
 * @param {*} D
 * returns Array<0|1>
 */
function exeD(D) {
  return !D?.int ? [0] : [...D.int].map(x => Number.parseInt(x));
}

//========================================================================================
/*                                                                                      *
 *                                          UI                                          *
 *                                                                                      */
//========================================================================================
// Global selected render
let selectedRender = ast => {};

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
  const input = document.getElementById("inputContainer");
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

onResize();
window.addEventListener("resize", onResize);

/**
 *
 * @param {*} renderTypes
 * @param {*} editor
 */
function setRenderSelect(renderTypes, editor) {
  selector = document.getElementById("renderSelector");
  Object.keys(renderTypes).forEach((name, i) => {
    option = document.createElement("option");
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

function createEditor() {
  const editor = monaco.editor.create(document.getElementById("input"), {
    value: "",
    language: "yaml",
    lineNumbers: "on",
    wordWrap: "wordWrapColumn",
    theme: "vs-dark"
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

(() => {
  const editor = createEditor();
  const input = getReadMe();
  editor.setValue(input);
  const output = document.getElementById("output");
  selectedRender = renderTypes["Calculator"];
  setRenderSelect(renderTypes, editor);
  output.value = selectedRender(parse(editor.getValue()));
})();
