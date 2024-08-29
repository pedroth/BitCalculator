# BitCalculator

Simple binary calculator

## Available operators

`*, /, +, -`

## Numbers in binary

`11.0010010 ~ 3.14`

`-101 = -5`

## Variables

Assign variables:
`A = 11;`

Using variables:
`A+A+A;`

Assign variables with other variables:
`B = 10*(A+A+A);`

# Grammar

```
Program -> Expression Program | epsilon
Expression -> Assign; | S; 
Assign -> Var=S
Var -> VarChar Var | epsilon
S -> N (+ | -) S | N (+ | -) F | F (+ | -) S | F
F -> N (* | /) F | N (* | /) E | E (* | /) F | E
E -> (S) | N | Var
N -> D.D | -D.D | D | -D
D ->  0D | 1D | epsilon

VarChar -> {all except: ";", "0", "1", "+", "-", "*", "/", "=", "(", ")"}
```

# Examples

```
(1 + 1.1) * 0.1; \\ 1.25

1 + 1 + 1 * 10; \\ 4

A = 11; \\ A = 3;

B = 10 * (A+A+A); \\ B = 2 * (3+3+3) = 18;
```

# Playground

https://pedroth.github.io/BitCalculator


