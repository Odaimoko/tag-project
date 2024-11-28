export class TimeChecker {
    recordedMs: number; // A Number representing the milliseconds elapsed since the UNIX epoch.
    thresMs: number;

    constructor(thresMs: number) {
        this.thresMs = thresMs;
        this.reset();
    }

    public reset() {
        this.recordedMs = Date.now();
    }

    public isOver() {
        return this.elapsed() > this.thresMs;
    }

    public elapsed() {
        return Date.now() - this.recordedMs;
    }
}
