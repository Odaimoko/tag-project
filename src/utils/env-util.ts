import process from "process";
import OdaPmToolPlugin from "../main";
import {expect} from "chai";

export function isProduction() {
    return process.env.NODE_ENV === "production";
}

export function devLog(...args: any[]) {
    if (isProduction()) return;
    console.log(...args);
}

export function devAssert(...args: any[]) {
    if (isProduction()) return;
    console.assert(...args)
}

// Test in dev mode.
export function assertOnPluginInit(plugin: OdaPmToolPlugin) {
    if (isProduction()) return;
    console.log("Assert start: on plugin init...");
    const projects = plugin.pmDb.pmProjects;
    const ut_projects = projects.filter(k =>
        k.name.startsWith("UT_020_1_") && (k.hasDefinedType("file") || k.hasDefinedType("folder"))
    );
    const correct = 4;
    expect(ut_projects, `Front matter defined projects not matched. Prefix 'UT_020_1_'.`)
        .to.have.lengthOf(correct);

    const ut_task_projects = projects.filter(k =>
        k.name.startsWith("UT_020_1_") && k.hasDefinedType("tag_override")
    );
    expect(ut_task_projects, `Task tag defined projects not matched. Prefix 'UT_020_1_'.`).to.have.lengthOf(1);

    console.log("Assert End: on plugin init.")
}
