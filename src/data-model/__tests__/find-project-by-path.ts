import {describe, expect, test} from "@jest/globals";
import {getProjectByTaskPath} from "../OdaProjectTree";

/**
 * - Unclassified. path:`/`
 *    - File `/file_any`
 *        - Task (Unclassified). path: `/file_any`
 *        - Task (Prj4), `/file_any:Prj4`
 *    - Folder (1), with def (Prj1). path: `/folder1`
 *        - File, `tpm_projectroot: Prj1`. `./folder1/file1`
 *        - File def (Prj2). `/folder1/file2`
 *            - Task. (Prj2)
 *        - File. `/folder1/file3`
 *            - Task. (Prj1). `/folder1/file3`
 *            - Task, def (Prj3). `/folder1/file3:Prj3`
 *        - File def (Prj3). `/folder1/file4`
 *            - Task (Prj3). `/folder1/file4`
 */
interface MockProject {
    name: string;
    paths: string[]
}

const projects: Record<string, MockProject> = {
    Unclassified: {
        name: "Unclassified",
        paths: ["/"],
    },
    Prj1: {
        name: "Prj1",
        paths: ["/folder1"],
    },
    Prj2: {
        name: "Prj2",
        paths: ["/folder1/file2"],
    },
    Prj3: {
        name: "Prj3",
        paths: ["/folder1/file3:Prj3", "/folder1/file4"],
    },
    Prj4: {
        name: "Prj4",
        paths: ["/file_any:Prj4"],
    }
}

// can be substituted 
function getNameByProject(project: MockProject) {
    return project['name']
}


function getProjectNameByProjectPath(projectPath: string) {
    const projectDict: Record<string, MockProject> = {} // Path to project
    for (const projectName of Object.keys(projects)) {
        const project = projects[projectName];
        for (const path of project.paths) {
            projectDict[path] = project
        }
    }
    const p = getProjectByTaskPath(projectDict, projectPath);
    return getNameByProject(p)
}

describe("Get Project By Task Path", () => {

    // Fake test. There should be no task path as this. 
    // A task always resides in a file.
    // This is checking implementation: if a task has no project defined with it or in its file, 
    //      it will find projects in its parent directory.
    test("Root -> Unclassified", () => {
        expect(getProjectNameByProjectPath('/')).toBe('Unclassified')
    }); // 
    test("Any file under / -> Unclassified", () => {
        expect(getProjectNameByProjectPath('/file_any')).toBe('Unclassified')
    });  // Task (Unclassified). path: `/file_any`
    test("Task def Prj4 under / -> Prj4", () => {
        expect(getProjectNameByProjectPath('/file_any:Prj4')).toBe('Prj4')
    }); // Task (Prj4), `/file_any:Prj4`
    test("Any file under Any folder -> Unclassified", () => {
        expect(getProjectNameByProjectPath('/folder_any/file_any')).toBe('Unclassified')
    }); 
    test("Folder Prj1 -> Prj1", () => {
        expect(getProjectNameByProjectPath('/folder1/file_any')).toBe('Prj1')
    });
    test("File1 under Prj1 -> Prj1", () => {
        expect(getProjectNameByProjectPath('/folder1/file1')).toBe('Prj1')
    }); // File, `tpm_projectroot: Prj1`. `./folder1/file1`
    test("Task in file3 under Prj1 -> Prj1", () => {
        expect(getProjectNameByProjectPath('/folder1/file3')).toBe('Prj1')
    }); // Task. (Prj1). `/folder1/file3`
    test("File def Prj2 under Prj1 -> Prj2", () => {
        expect(getProjectNameByProjectPath('/folder1/file2')).toBe('Prj2')
    }); // Task. (Prj2)
    test("Task def Prj3 in File 3 -> Prj3", () => {
        expect(getProjectNameByProjectPath('/folder1/file3:Prj3')).toBe('Prj3')
    }); // Task, def (Prj3). `/folder1/file3:Prj3`
    test("Any file under Prj3 -> Prj3", () => {
        expect(getProjectNameByProjectPath('/folder1/file4')).toBe('Prj3')
    }) // Task (Prj3). `/folder1/file4`
})
