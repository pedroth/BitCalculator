
//========================================================================================
/*                                                                                      *
 *                                      CALCULATOR                                      *
 *                                                                                      */
//========================================================================================

import { returnOne } from "./Utils.js";
import BigNumber from 'https://unpkg.com/bignumber.js@latest/bignumber.mjs';

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
            value: s => (s.op === "+" ? exeN(s.N).plus(exeS(s.S)) : exeN(s.N).minus(exeS(s.S)))
        },
        {
            predicate: s => !!s.N && !!s.F,
            value: s => (s.op === "+" ? exeN(s.N).plus(exeF(s.F)) : exeN(s.N).minus(exeF(s.F)))
        },
        {
            predicate: s => !!s.F && !!s.S,
            value: s => (s.op === "+" ? exeF(s.F).plus(exeS(s.S)) : exeF(s.F).minus(exeS(s.S)))
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
            value: f => (f.op === "*" ? exeN(f.N).times(exeF(f.F)) : exeN(f.N).div(exeF(f.F)))
        },
        {
            predicate: f => !!f.N && !!f.E,
            value: f => (f.op === "*" ? exeN(f.N).times(exeE(f.E)) : exeN(f.N).div(exeE(f.E)))
        },
        {
            predicate: f => !!f.E && !!f.F,
            value: f => (f.op === "*" ? exeE(f.E).times(exeF(f.F)) : exeE(f.E).div(exeF(f.F)))
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
    let integer = new BigNumber("0");
    let id = new BigNumber("1");
    for (let i = integerBits.length - 1; i >= 0; i--) {
        integer = integer.plus(id.times(new BigNumber(integerBits[i])));
        id = id.times(new BigNumber(2));
    }
    let decimal = new BigNumber("0");
    id = new BigNumber("0.5");
    for (let i = 0; i < decimalBits.length; i++) {
        decimal = decimal.plus(id.times(new BigNumber(decimalBits[i])));
        id = id.div(new BigNumber(2));
    }
    const number = integer.plus(decimal);
    return !!N.negative ? number.times(new BigNumber("-1")) : number;
}

/**
 *
 * @param {*} D
 * returns Array<0|1>
 */
function exeD(D) {
    return !D?.int ? [0] : [...D.int].map(x => Number.parseInt(x));
}