//========================================================================================
/*                                                                                      *
 *                                        PARSER                                        *
 *                                                                                      */
//========================================================================================

import { or, pair, removeComments, stream } from "./Utils.js";

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
export function parse(string) {
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
