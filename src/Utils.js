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
export function pair(a, b) {
    return { left: a, right: b };
}

/**
 * creates a stream from a string, string => stream
 * @param {*} string
 */
export function stream(stringOrArray) {
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

export function or(...rules) {
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
export function returnOne(listOfPredicates, defaultValue = 0) {
    return input => {
        for (let i = 0; i < listOfPredicates.length; i++) {
            if (listOfPredicates[i].predicate(input))
                return listOfPredicates[i].value(input);
        }
        return defaultValue;
    };
}

export function removeComments(streamWithComments) {
    const stack = [];
    let state = 0;
    let s = streamWithComments;
    while (s.hasNext()) {
        const isComment = isCommentToken(s);
        if (!isComment && state === 0) {
            stack.push(s.peek());
            s = s.next();
        } else if (isComment && state === 0) {
            s = eat3tokens(s);
            state = 1;
        } else if (!isComment && state === 1) {
            s = s.next();
        } else {
            // isComment && state === 1
            s = eat3tokens(s);
            state = 0;
        }
    }
    return stream(stack);
}

export function isCommentToken(stream) {
    let s = stream;
    let n = 3;
    while (s.peek() === "'" || (s.peek() === '"' && n > 0)) {
        s = s.next();
        n--;
    }
    return n === 0;
}

export function eat3tokens(stream) {
    let s = stream;
    let n = 3;
    while (n > 0) {
        s = s.next();
        n--;
    }
    return s;
}