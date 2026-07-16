export function _PLUS_(acc: number = 0, ...bs: number[]) {
    for (var i = 0; i < bs.length; i++) {
        acc += bs[i]!;
    }
    return acc;
}

export function _SUB_(acc: number = 0, ...bs: number[]) {
    if (bs.length === 0) return -acc;
    for (var i = 0; i < bs.length; i++) {
        acc -= bs[i]!;
    }
    return acc;
}

export function _STAR_(acc: number, ...bs: number[]) {
    for (var i = 0; i < bs.length; i++) {
        acc *= bs[i]!;
    }
    return acc;
}

export function _SLASH_(acc: number, ...bs: number[]) {
    for (var i = 0; i < bs.length; i++) {
        acc /= bs[i]!;
    }
    return acc;
}
