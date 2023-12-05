
//========================================================================================
/*                                                                                      *
 *                                      CALCULATOR                                      *
 *                                                                                      */
//========================================================================================

import { returnOne } from "./Utils.js";

/**
 * Return values of expressions
 * @param {*} tree
 * @returns String
 */
export function execute(tree) {
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