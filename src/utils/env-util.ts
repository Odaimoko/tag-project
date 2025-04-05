import process from "process";
import {GenericProvider} from "./GenericProvider";

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

//#ifdef DEVELOPMENT_BUILD
const blacklistTagSet = new Set<string>();

export function addBlacklistTag(tag: string) {
    blacklistTagSet.add(tag)
}

export function removeBlacklistTag(tag: string) {
    blacklistTagSet.delete(tag)
}

//#endif

function taggedLog(tag: string, ...args: any[]) {
//#ifdef DEVELOPMENT_BUILD
    if (blacklistTagSet.has(tag)) return;
//#endif
    console.log(`[${tag}]`, ...args);
}

function buildTaggedString(tag: string, args: unknown[]) {
    let label = `[${tag}] `;
    for (const arg of args) {
        label += arg;
    }
    return label;
}

function taggedTime(tag: string, ...args: unknown[]) {
//#ifdef DEVELOPMENT_BUILD
    if (blacklistTagSet.has(tag)) return;
//#endif
    const label = buildTaggedString(tag, args);
    console.time(label);
}

function taggedTimeEnd(tag: string, ...args: unknown[]) {
//#ifdef DEVELOPMENT_BUILD
    if (blacklistTagSet.has(tag)) return;
//#endif
    const label = buildTaggedString(tag, args);
    console.timeEnd(label);
}

export const devLog = prodWrapper(console.log);
export const devTaggedLog = prodWrapper(taggedLog);
export const devTime = prodWrapper(taggedTime);
export const devTimeEnd = prodWrapper(taggedTimeEnd);
export const PluginEnvProvider: GenericProvider<PluginEnv> = new GenericProvider<PluginEnv>();

export function initPluginEnv() {
    try {
        PluginEnvProvider.get();
    } catch (e) {
        PluginEnvProvider.add(new PluginEnv());
    }
}

export function removePluginEnv() {
    PluginEnvProvider.remove();
}

class PluginEnv {
    env: { [key: string]: string; } = {};


    get(key: string) {
        return this.env[key] ?? "";
    }

    set(key: string, value: string) {
        this.env[key] = value;
    }
}

export function setVaultName(name: string) {
    PluginEnvProvider.get()?.set("TAG_PROJECT_VAULT_NAME", name);
}

export function getVaultName() {
    return PluginEnvProvider.get()?.get("TAG_PROJECT_VAULT_NAME") ?? ""
}
