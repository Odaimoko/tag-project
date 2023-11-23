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

export const devLog = prodWrapper(console.log);
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
