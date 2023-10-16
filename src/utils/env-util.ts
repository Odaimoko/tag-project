import process from "process";

export function isProduction() {
    return process.env.NODE_ENV === "production";
}