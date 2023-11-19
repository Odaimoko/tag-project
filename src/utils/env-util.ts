import process from "process";
import OdaPmToolPlugin from "../main";
import {expect} from "chai";
import {OdaPmDb} from "../data-model/odaPmDb";
import {OdaPmProject, ProjectDefinedType, ProjectName_Unclassified} from "../data-model/OdaPmProject";

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

function expect_project(prj: OdaPmProject | undefined, projectName: string, definedType?: ProjectDefinedType) {
    expect(prj).to.not.be.undefined;
    if (prj) {
        expect(prj.name).to.equal(projectName);
        if (definedType)
            expect(prj.hasDefinedType(definedType)).to.be.true;
    }
}

// make this async so the failing tests won't block the plugin and database initialization process.
export async function assertOnDbRefreshed(pmDb: OdaPmDb) {
    devLog("Assert start: on db refreshed...")
    const projects = pmDb.pmProjects;

    const projectIds = projects.map(k => k.internalKey).unique();
    expect(projectIds, `Project ids are not unique.`).to.have.lengthOf(projects.length);

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

    const ut_020_2_1_projects = projects.filter(k => {
        return k.pmTasks.filter(m => m.summary.startsWith("UT_020_2_1")).length > 0
    }); // The task starting with UT_020_2_1 is in Unclassified project.
    expect(ut_020_2_1_projects, `PmTask with prefix 'UT_020_2_1' not matched`).to.have.lengthOf(1);
    expect_project(ut_020_2_1_projects.first(), ProjectName_Unclassified, "tag_override");

    const ut_020_2_1_projects_wf = projects.filter(k => {
        return k.workflows.filter(m => m.name.startsWith("UT_020_2_1")).length > 0
    }); // The workflow starting with UT_020_2_1 is in Unclassified project.
    expect(ut_020_2_1_projects_wf, `Workflow with prefix 'UT_020_2_1' not matched`).to.have.lengthOf(1);
    expect_project(ut_020_2_1_projects_wf.first(), ProjectName_Unclassified, "tag_override");

    const ut_020_2_2_tasks = pmDb.pmTasks.filter(k => {
        return k.summary.startsWith("UT_020_2_2")
    })
    expect(ut_020_2_2_tasks, `PmTask with prefix 'UT_020_2_2' not matched`).to.have.lengthOf(1);
    const ut_020_2_2_task = ut_020_2_2_tasks.first();
    if (ut_020_2_2_task) {
        expect(ut_020_2_2_task.isInProject("UT_020_2_Project_Layer_1_folder_definition"));
    }

    const ut_020_2_2_workflows = pmDb.workflows.filter(k => {
        return k.name.startsWith("UT_020_2_2")
    });
    expect(ut_020_2_2_workflows, `Workflow with prefix 'UT_020_2_2' not matched`).to.have.lengthOf(1);
    const ut_020_2_2_wf = ut_020_2_2_workflows.first();
    if (ut_020_2_2_wf) {
        expect(ut_020_2_2_wf.isInProject("UT_020_2_Project_Layer_1_folder_definition"));
    }


    const ut_020_2_3_tasks = pmDb.pmTasks.filter(k => {
        return k.summary.startsWith("UT_020_2_3")
    })
    expect(ut_020_2_3_tasks, `PmTask with prefix 'UT_020_2_3' not matched`).to.have.lengthOf(1);
    const ut_020_2_3_task = ut_020_2_3_tasks.first();
    if (ut_020_2_3_task) {
        expect(ut_020_2_3_task.isInProject("UT_020_2_Project_Layer_1_file_definition"));
    }

    const ut_020_2_3_workflows = pmDb.workflows.filter(k => {
        return k.name.startsWith("UT_020_2_3")
    });
    expect(ut_020_2_3_workflows, `Workflow with prefix 'UT_020_2_3' not matched`).to.have.lengthOf(1);
    const ut_020_2_3_wf = ut_020_2_3_workflows.first();
    if (ut_020_2_3_wf) {
        expect(ut_020_2_3_wf.isInProject("UT_020_2_Project_Layer_1_file_definition"));
    }
    devLog("Assert end: on db refreshed...")
}
