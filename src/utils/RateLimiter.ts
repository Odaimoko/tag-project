import Denque from "denque";
import {devLog} from "./env-util";

class TimedItem<T> {
    timestamp: number;
    item: T;
}


/**
 * Rate limiter for burst requests.
 * We may face the problem of too many requests in a short time, in which case we can lower the allowReqRateThres.
 * If req freq > allowReqRateThres, we do not respond it at all.
 * Instead, when a new request comes, we update the allowReqRateThres.
 */
export class RateLimiter {
    requestedQueue: Denque<TimedItem<unknown>>
    respondedQueue: Denque<TimedItem<unknown>>

    maxRate = 3; // 3 times/s
    minRate: number = 1 / 3; //1 time/3s
    window = 1; // in seconds
    // if req freq is too much we do not send response. So we respond only when reqFreq <= allowReqRateThres.
    allowReqRateThres: number

    // if req freq > adjustReqRateThres, lower the allowReqRateThres
    adjustReqRateThres = 3;

    constructor(maxRate: number, minRate: number, window: number) {
        this.maxRate = maxRate;
        this.minRate = minRate;
        this.allowReqRateThres = maxRate;
        this.window = window;
        this.requestedQueue = new Denque<TimedItem<any>>();
        this.respondedQueue = new Denque<TimedItem<any>>();
    }

    // returns: can this request be responded?
    public addRequest<T>(item: T): boolean {
        const timedItem = new TimedItem<T>();
        timedItem.item = item;
        timedItem.timestamp = Date.now();
        this.requestedQueue.push(timedItem)
        devLog(`[Rate] ReqQueue push: `, item)
        const reqFreq = this.calcFreq(this.window, this.requestedQueue);
        // const respFreq = this.calcFreq(this.window, this.respondedQueue);
        const allow = reqFreq <= this.allowReqRateThres;
        this.cleanQueue();
        if (allow) {
            this.respondedQueue.push(timedItem)
        }
        this.adjustThres(reqFreq)
        return allow;
    }

    private cleanQueue() {
        const now = Date.now();
        // front is the oldest event
//#ifdef DEVELOPMENT_BUILD
        const oldReqQueueSize = this.requestedQueue.length;
        const oldRespQueueSize = this.respondedQueue.length;
//#endif
        while (this.requestedQueue.peekFront() && this.requestedQueue.peekFront()!.timestamp < now - this.window * 1000) {
            this.requestedQueue.shift();
        }
        while (this.respondedQueue.peekFront() && this.respondedQueue.peekFront()!.timestamp < now - this.window * 1000) {
            this.respondedQueue.shift();
        }
//#ifdef DEVELOPMENT_BUILD
        console.log(`[Rate] reqQueue: ${this.requestedQueue.length}, respQueue: ${this.respondedQueue.length}, oldReqQueueSize: ${oldReqQueueSize}, oldRespQueueSize: ${oldRespQueueSize}`);
//#endif
    }

    private calcFreq(window: number, q: Denque<TimedItem<any>>): number {
        // get the frequency within the window
        let freqCount = 0;
        const now = Date.now();
        for (let i = 0; i < q.length; i++) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const timedItem = q.peekAt(i)!;
            if (timedItem.timestamp > now - window * 1000) {
                freqCount++;
            }
        }

        const curRate = freqCount / window;
        return curRate;
    }

    private adjustThres(reqFreq: number) {
        // if too many requests, lower the allowReqRateThres
        const originResThres = this.allowReqRateThres;
        if (reqFreq > this.adjustReqRateThres) {
            this.allowReqRateThres = Math.max(this.allowReqRateThres / 2, this.minRate)
        } else {
            this.allowReqRateThres = Math.min(this.allowReqRateThres * 2, this.maxRate);
        }
        devLog(`[Rate] reqFreq: ${reqFreq}, respRateThres: ${originResThres} -> ${this.allowReqRateThres}`)
    }
}
