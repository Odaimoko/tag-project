import process from "process";

export function isProduction() {
    return process.env.NODE_ENV === "production";
}

export function prodWrapper(func: CallableFunction) {
    // @ts-ignore
    function f(...args) {
//#ifdef DEVELOPMENT_BUILD
        if (isProduction()) return;
        func(...args);
//#endif
    }


    return f;
}

export const devLog = prodWrapper(console.log);


