import process from "process";
import OdaPmToolPlugin from "../main";
import {expect} from "chai";
import {OdaPmDb} from "../data-model/odaPmDb";
import {ProjectName_Unclassified} from "../data-model/OdaPmProject";

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
    console.log("Assert End: on plugin init.")
}

// make this async so the failing tests won't block the plugin and database initialization process.
export async function assertOnDbRefreshed(pmDb: OdaPmDb) {
    devLog("Assert start: on db refreshed...")
    const projects = pmDb.pmProjects;
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

    const ut_020_2_1_pmwf = pmDb.pmProjects.filter(k => {
        return k.pmTasks.filter(m => m.summary.startsWith("UT_020_2_1")).length > 0
    });
    expect(ut_020_2_1_pmwf, `Task tag defined projects not matched. Prefix 'UT_020_2_1'.`).to.have.lengthOf(1);
    const first_wf = ut_020_2_1_pmwf.first();
    expect(first_wf).to.not.be.undefined;
    if (first_wf) {
        expect(first_wf.name).to.equal(ProjectName_Unclassified);
        expect(first_wf.hasDefinedType("tag_override")).to.be.true;
    }
    devLog("Assert end: on db refreshed...")
}
