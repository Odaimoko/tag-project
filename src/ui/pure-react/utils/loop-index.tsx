export function loopIndex(nextIdx: number, len: number) {
    if (nextIdx < 0) {
        nextIdx = len - 1;
    } else if (nextIdx >= len) {
        nextIdx = 0;
    }
    return nextIdx;
}
