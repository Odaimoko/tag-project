// Test in dev mode.
import {devLog, isProduction, prodWrapper} from "../utils/env-util";
import {OdaPmTask} from "../data-model/OdaPmTask";
import {OdaPmProject, ProjectDefinedType, ProjectName_Unclassified} from "../data-model/OdaPmProject";
import {I_OdaPmWorkflow} from "../data-model/workflow-def";
import OdaPmToolPlugin from "../main";
import {OdaPmDb} from "../data-model/odaPmDb";
//#ifdef DEVELOPMENT_BUILD
import {expect} from "chai";


interface AssertFunctions {
    expectTaskInProject: (taskName: string, projectName: string) => void;
    expectTaskNotInProject: (taskName: string, projectName: string) => void;
    expectTaskPath: (taskName: string, path: string) => void;
    expectWorkflowInProject: (workflowName: string, projectName: string) => void;
    expectWorkflowNotInProject: (workflowName: string, projectName: string) => void;
    // expectProject: (projectName: string, definedType?: ProjectDefinedType) => void;
}

const dbAssertFunctions: AssertFunctions = {
    expectTaskPath: () => {
        throw new Error("Not Implemented.")
    },
    expectTaskInProject: () => {
        throw new Error("Not Implemented.")
    },
    expectTaskNotInProject: () => {
        throw new Error("Not Implemented.")
    }
    ,
    expectWorkflowInProject: () => {
        throw new Error("Not Implemented.")
    },
    expectWorkflowNotInProject: () => {
        throw new Error("Not Implemented.")
    }
}

function expect_project(prj: OdaPmProject | null, projectName: string, definedType?: ProjectDefinedType) {
    expect(prj).to.not.be.undefined;
    if (prj) {
        expect(prj.name).to.equal(projectName);
        if (definedType)
            expect(prj.hasDefinedType(definedType)).to.be.true;
    }
}

function expectTaskAbstract(pmDb: OdaPmDb, taskSummary: string, func: (task: OdaPmTask) => void) {
    const task = pmDb.getPmTaskBySummary(taskSummary);
    expect(task, `Task ${taskSummary} not found.`).to.not.be.null;
    if (task) {
        func(task);
    }
}

function expectWorkflowAbstract(pmDb: OdaPmDb, workflowName: string, func: (workflow: I_OdaPmWorkflow) => void) {
    const workflow = pmDb.getWorkflowByName(workflowName);
    expect(workflow, `Workflow ${workflowName} not found.`).to.not.be.null;
    if (workflow) {
        func(workflow);
    }
}

async function test_UT_020_1(pmDb: OdaPmDb) {
    expect(pmDb.getProjectByName("UT_020_1_7_Multiple"), "UT_020_1_7_Multiple should not be found.")
        .null;
    expect(pmDb.getProjectByName("UT_020_1_7_Multiple1"), "UT_020_1_7_Multiple1 should not be found.")
        .null;
    expect(pmDb.getProjectByName("UT_020_1_7_Multiple2"), "UT_020_1_7_Multiple2 should be found.")
        .not.null;

}

async function test_UT_020_2(pmDb: OdaPmDb) {
    const projects: OdaPmProject[] = pmDb.pmProjects;
    // a name can be null/undefined when a front matter is just created, so we check before accessing it.
    // a front matter will be saved even it's an empty string.
    const ut_projects = projects.filter(k =>
        k.name && k.name.startsWith("UT_020_1_Project")
        && (k.hasDefinedType("file") || k.hasDefinedType("folder"))
    );
    const correct = 3;
    expect(ut_projects, `Front matter defined projects not matched. Prefix 'UT_020_1_Project'.`)
        .to.have.lengthOf(correct);

    const expectTaskInProject = dbAssertFunctions.expectTaskInProject;
    const expectWorkflowInProject = dbAssertFunctions.expectWorkflowInProject;
    expect_project(pmDb.getProjectByName("UT_020_1_Project_Layer_1_task_definition"),
        "UT_020_1_Project_Layer_1_task_definition", "tag_override");

    expectWorkflowInProject("UT_020_2_1_Wf", ProjectName_Unclassified);
    expectTaskInProject("UT_020_2_1_Task", ProjectName_Unclassified);

    expectWorkflowInProject("UT_020_2_2_Wf", "UT_020_2_Project_Layer_1_folder_definition");
    expectTaskInProject("UT_020_2_2_Task", "UT_020_2_Project_Layer_1_folder_definition");

    expectWorkflowInProject("UT_020_2_3_Wf", "UT_020_2_Project_Layer_1_file_definition");
    expectTaskInProject("UT_020_2_3_Task", "UT_020_2_Project_Layer_1_file_definition");

    expectWorkflowInProject("UT_020_2_4_Wf", "UT_020_2_Project_Layer_1_task_definition");
    expectTaskInProject("UT_020_2_4_Task", "UT_020_2_Project_Layer_1_task_definition");
    devLog("Test PASSED: Project Definition.")
}

async function testTaskProjectLink(pmDb: OdaPmDb) {

    const expectTaskInProject = dbAssertFunctions.expectTaskInProject;

    expectTaskInProject("UT_020_3_2_Unclassified", ProjectName_Unclassified);
    expectTaskInProject("UT_020_3_2_Prj4", "UT_020_3_Prj4");
    expectTaskInProject("UT_020_3_2_file1_Prj1", "UT_020_3_Prj1")
    expectTaskInProject("UT_020_3_2_file2_Prj2", "UT_020_3_Prj2")
    expectTaskInProject("UT_020_3_2_file3_Prj1", "UT_020_3_Prj1")
    expectTaskInProject("UT_020_3_2_file3_Prj3", "UT_020_3_Prj3")
    expectTaskInProject("UT_020_3_2_file4_Prj3", "UT_020_3_Prj3")
    devLog("Test PASSED: Task Project Link.")
}

async function testGetTaskProjectPath(pmDb: OdaPmDb) {
    const expectTaskPath = dbAssertFunctions.expectTaskPath;

    expectTaskPath("UT_020_3_2_Unclassified", "/UT_020_3 layer 0 file_any.md");
    expectTaskPath("UT_020_3_2_Prj4", "/UT_020_3 layer 0 file_any.md:UT_020_3_Prj4");
    expectTaskPath("UT_020_3_2_file1_Prj1", "/UT_020_3 project Folder/UT_020_3 projectroot Prj1.md")
    expectTaskPath("UT_020_3_2_file2_Prj2", "/UT_020_3 project Folder/UT_020_3 file2 Prj2.md")
    expectTaskPath("UT_020_3_2_file3_Prj1", "/UT_020_3 project Folder/UT_020_3 file3 Prj1.md")
    expectTaskPath("UT_020_3_2_file3_Prj3", "/UT_020_3 project Folder/UT_020_3 file3 Prj1.md:UT_020_3_Prj3")
    expectTaskPath("UT_020_3_2_file4_Prj3", "/UT_020_3 project Folder/UT_020_3 file4 Prj3.md")
    devLog("Test PASSED: Get Task Project Path.")
}

async function test_UT_020_3(pmDb: OdaPmDb) {
    // UT_020_3
    // Sanity check
    const ut_020_3_tasks = pmDb.pmTasks.filter(k => {
        return k.summary.startsWith("UT_020_3")
    });
    expect(ut_020_3_tasks, `PmTask with prefix 'UT_020_3' not matched`).to.have.lengthOf(7);
    testGetTaskProjectPath(pmDb);
    testTaskProjectLink(pmDb);
}

function initAssertFunctions(pmDb: OdaPmDb) {

    dbAssertFunctions.expectTaskInProject = (taskName: string, projectName: string) => expectTaskAbstract(pmDb, taskName,
        (task) => {
            expect(task.isInProject(projectName),
                `Task ${taskName} not in project ${projectName}. Task Path: ${task.getProjectPath()}. Task Project: ${JSON.stringify(task.getProjectNames())}`)
                .true;
        })
    dbAssertFunctions.expectTaskNotInProject = (taskName: string, projectName: string) => expectTaskAbstract(pmDb, taskName,
        (task) => {
            expect(task.isInProject(projectName),
                `Task ${taskName} in project ${projectName}. Task Path: ${task.getProjectPath()}. Task Project: ${JSON.stringify(task.getProjectNames())}`)
                .false;
        })
    dbAssertFunctions.expectTaskPath = (taskName: string, path: string) => expectTaskAbstract(pmDb, taskName,
        (task) => {
            expect(task.getProjectPath(),
                `Task ${taskName} 's path not matched.`)
                .equal(path);
        })
    dbAssertFunctions.expectWorkflowInProject = (workflowName: string, projectName: string) => expectWorkflowAbstract(pmDb, workflowName,
        (workflow) => {
            expect(workflow.isInProject(projectName),
                `Workflow ${workflowName} not in project ${projectName}.`)
                .true;
        }
    )
    dbAssertFunctions.expectWorkflowNotInProject = (workflowName: string, projectName: string) => expectWorkflowAbstract(pmDb, workflowName,
        (workflow) => {
            expect(workflow.isInProject(projectName),
                `Workflow ${workflowName} in project ${projectName}.`)
                .false;
        }
    )
}

async function test_UT_020_4(pmDb: OdaPmDb) {
    const orphanTasks = pmDb.orphanTasks;

    const ut_020_4_orphan_tasks = orphanTasks.filter(k => {
        return k.summary === "UT_020_4_task_incorrect"
    })
    expect(ut_020_4_orphan_tasks, "Should have one task: UT_020_4_task_incorrect").length(1);
}

async function test_UT_020_6(pmDb: OdaPmDb) {
    const prj_main_name = "UT_020_6_file_main";
    const prj_sub1_name = "UT_020_6_file_main/sub1";
    const prj_sub13_name = "UT_020_6_file_main/sub13";
    const prj_sub2_name = "UT_020_6_file_main/sub1/sub2";
    dbAssertFunctions.expectTaskInProject("UT_020_6_task_main", prj_main_name);
    dbAssertFunctions.expectTaskNotInProject("UT_020_6_task_main", prj_sub1_name);
    dbAssertFunctions.expectTaskNotInProject("UT_020_6_task_main", prj_sub2_name);
    dbAssertFunctions.expectWorkflowInProject("UT_020_6_Wf", prj_main_name);
    dbAssertFunctions.expectWorkflowInProject("UT_020_6_Wf", prj_sub1_name);
    dbAssertFunctions.expectWorkflowInProject("UT_020_6_Wf", prj_sub2_name);

    dbAssertFunctions.expectWorkflowNotInProject("UT_020_6_Wf_main_sub1", prj_main_name)
    dbAssertFunctions.expectWorkflowInProject("UT_020_6_Wf_main_sub1", prj_sub1_name)
    dbAssertFunctions.expectWorkflowInProject("UT_020_6_Wf_main_sub1", prj_sub2_name)

    dbAssertFunctions.expectTaskInProject("UT_020_6_task_main_sub1", prj_main_name)
    dbAssertFunctions.expectTaskInProject("UT_020_6_task_main_sub1", prj_sub1_name)
    dbAssertFunctions.expectTaskNotInProject("UT_020_6_task_main_sub1", prj_sub2_name)

    dbAssertFunctions.expectTaskInProject("UT_020_6_task_main_sub1_sub2", prj_main_name)
    dbAssertFunctions.expectTaskInProject("UT_020_6_task_main_sub1_sub2", prj_sub1_name)
    dbAssertFunctions.expectTaskInProject("UT_020_6_task_main_sub1_sub2", prj_sub2_name)

    dbAssertFunctions.expectWorkflowNotInProject("UT_020_6_Wf_main_sub13", prj_main_name)
    dbAssertFunctions.expectWorkflowNotInProject("UT_020_6_Wf_main_sub13", prj_sub1_name)
    dbAssertFunctions.expectWorkflowInProject("UT_020_6_Wf_main_sub13", prj_sub13_name)
    dbAssertFunctions.expectTaskInProject("UT_020_6_task_main_sub13", prj_main_name)
    dbAssertFunctions.expectTaskNotInProject("UT_020_6_task_main_sub13", prj_sub1_name)
    dbAssertFunctions.expectTaskInProject("UT_020_6_task_main_sub13", prj_sub13_name)

    const orphans = pmDb.orphanTasks;
    const orphans_020_6 = orphans.filter(k => k.summary.startsWith("UT_020_6"));
    expect(orphans_020_6, `Should have 0 orphan tasks in UT_020_6`).length(0);
    devLog("Test PASSED: Sub Project Inclusion.")
}

//#endif
/**
 * The following functions wrapped inside prodWrapper will not be called,
 * so it's ok that the transpiler cannot resolve references.
 */
export const assertOnPluginInit = prodWrapper((plugin: OdaPmToolPlugin) => {
    if (isProduction()) return;
    console.log("Assert start: on plugin init...");
    console.log("Assert End: on plugin init.")
})

// make this async so the failing tests won't block the plugin and database initialization process.
export const assertDatabase = prodWrapper(async (pmDb: OdaPmDb) => {

    devLog("Assert start: on db refreshed...")
    initAssertFunctions(pmDb);
    const projects = pmDb.pmProjects;

    const projectIds = projects.map(k => k.internalKey).unique();
    expect(projectIds, `Project ids are not unique.`).to.have.lengthOf(projects.length);
    test_UT_020_1(pmDb);
    test_UT_020_2(pmDb);
    test_UT_020_3(pmDb);
    test_UT_020_4(pmDb);
    test_UT_020_6(pmDb);
    devLog("Assert end: on db refreshed...")
});
