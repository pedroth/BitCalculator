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
 * Expression -> Assign; | S; 
 * Assign -> Var=S
 * Var -> VarChar Var | epsilon
 * S -> N (+ | -) S | N (+ | -) F | F (+ | -) S | F
 * F -> N (* | /) F | N (* | /) E | E (* | /) F | E
 * E -> (S) | N | Var
 * N -> D.D | -D.D | D | -D
 * D ->  0D | 1D | epsilon
 * 
 * VarChar -> {all except: ";", "0", "1", "+", "-", "*", "/", "=", "(", ")"}
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
    return or(
        () => {
            const { left: Assign, right: nextStream } = parseAssign(stream);
            if (nextStream.peek() === ";") {
                return pair(
                    {
                        type: "expression",
                        Assign
                    },
                    nextStream.next()
                );
            }
            throw new Error(
                "Error occurred while parsing expression,"
            );
        },
        () => {
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
                "Error occurred while parsing expression,"
            );
        },
    );
}

function parseAssign(stream) {
    const { left: Var, right: nextStream } = parseVar(stream);
    if (nextStream.peek() === "=") {
        const { left: S, right: nextNextStream } = parseS(nextStream.next());
        return pair({ type: "assign", Var, S }, nextNextStream);
    }
    throw new Error(
        "Error occurred while parsing expression,"
    );
}

function parseVar(stream) {
    const nonVarChars = [";", "0", "1", "+", "-", "*", "/", "=", "(", ")"];
    return or(
        () => {
            const token = stream.peek();
            if (token && !nonVarChars.some(x => token === x)) {
                const { left: Var, right: nextStream } = parseVar(stream.next());
                return pair({
                    type: "var",
                    name: token + Var.name
                }, nextStream);
            }
            throw new Error("Error occurred while parsing var")
        },
        () => pair({ type: "var", name: "" }, stream)
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
        throw new Error(errorMessage);
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
                "Error occurred while parsing E,"
            );
        },
        () => {
            const { left: N, right: nextStream } = parseN(stream);
            return pair({ type: "E", N }, nextStream);
        },
        () => {
            const { left: Var, right: nextStream } = parseVar(stream);
            return pair({ type: "E", Var }, nextStream);
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
                "Error occurred while parsing N,"
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
                "Error occurred while parsing N,"
            );
        },
        () => {
            if (stream.peek() === "-") {
                const { left: D, right: nextStream } = parseD(stream.next());
                return pair({ type: "N", int: D, negative: true }, nextStream);
            }
            throw new Error(
                "Error occurred while parsing N,"
            );
        },
        () => {
            const { left: D, right: nextStream } = parseD(stream);
            if (!D.int) throw new Error("Error occurred while parsing N");
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
            throw new Error("Error occurred while parsing D,");
        },
        () => {
            if (stream.peek() === "1") {
                const { left: D, right: nextStream } = parseD(stream.next());
                return pair({ type: "D", int: D?.int ? "1" + D.int : "1" }, nextStream);
            }
            throw new Error("Error occurred while parsing D,");
        },
        () => pair({ type: "D", int: null }, stream)
    );
}
