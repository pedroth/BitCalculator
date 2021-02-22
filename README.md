# BitCalculator

Simple Binary calculator

## Available operators

\*, +, ()

## Numbers in binary

`11.0010010 ~ 3.14`

`101 = 5`

# Grammar

```
Program -> Expression Program | epsilon
Expression -> S;
S -> N + S | N + F | F + S | F
S -> N - S | N - F | F - S (TODO)
F -> N * F | N * E | E * F | E
F -> N / F | N / E | E / F (TODO)
E -> (S) | N
N -> D.D | -D.D | D | -D
D -> 0D | 1D | epsilon
```

# Examples

`(1 + 1.1) * 0.1;`-> 1.25
`1 + 1 + 1 * 10;`-> 4
