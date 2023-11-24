import {EditorPosition, Vault, Workspace} from "obsidian";
import {STask} from "obsidian-dataview";
import {OdaPmProject, OdaPmProjectDefinition, Tag_Prefix_Project} from "../data-model/OdaPmProject";
import {addTagText, I_OdaPmTaskble} from "../data-model/workflow-def";
import {ONotice} from "./o-notice";

// region Copied from dataview

// Do we really need to replace the whole file?
// Yes we do, because there's no editor.
/** Rewrite a task with the given completion status and new text. */
export async function rewriteTask(vault: Vault, task: STask, desiredStatus: string, desiredText?: string) {
    if (desiredStatus == task.status && (desiredText == undefined || desiredText == task.text)) return;
    desiredStatus = desiredStatus == "" ? " " : desiredStatus;
    const rawFiletext = await vault.adapter.read(task.path);
    const hasRN = rawFiletext.contains("\r");
    const filetext = rawFiletext.split(/\r?\n/u);

    if (filetext.length < task.line) return;
    const match = LIST_ITEM_REGEX.exec(filetext[task.line]);
    if (!match || match[2].length == 0) return;

    const taskTextParts = task.text.split("\n");
    if (taskTextParts[0].trim() != match[3].trim()) return;

    // We have a positive match here at this point, so go ahead and do the rewrite of the status.
    const initialSpacing = /^[\s>]*/u.exec(filetext[task.line])![0];
    if (desiredText) {
        const desiredParts = desiredText.split("\n");

        const newTextLines: string[] = [`${initialSpacing}${task.symbol} [${desiredStatus}] ${desiredParts[0]}`].concat(
            desiredParts.slice(1).map(l => initialSpacing + "\t" + l)
        );

        filetext.splice(task.line, task.lineCount, ...newTextLines);
    } else {
        filetext[task.line] = `${initialSpacing}${task.symbol} [${desiredStatus}] ${taskTextParts[0].trim()}`;
    }

    const newText = filetext.join(hasRN ? "\r\n" : "\n");
    await vault.adapter.write(task.path, newText);
}

export const LIST_ITEM_REGEX = /^[\s>]*(\d+\.|\d+\)|\*|-|\+)\s*(\[.{0,1}\])?\s*(.*)$/mu;


// endregion

function openFileAtStart(workspace: Workspace, path: string) {
    workspace.openLinkText(path, path, false, {
        state: {
            active: true
        },
        eState: {
            line: 0,
            cursor: {
                from: {line: 0, ch: 0},
                to: {line: 1, ch: 0},
            },
        },
    });

}

// if we use workspace.openLinkText, a task without a block id will be opened with its section
export function openTaskPrecisely(workspace: Workspace, task: STask) {
    // Copy from dataview. See TaskItem.
    workspace.openLinkText(
        task.link.toFile().obsidianLink(),
        task.path,
        false,
        {
            eState: {
                cursor: {
                    from: {line: task.line, ch: task.position.start.col},
                    to: {line: task.line + task.lineCount - 1, ch: task.position.end.col},
                },
                line: task.line,
            },
        }
    );
}

export function openProjectPrecisely(project: OdaPmProject, defType: OdaPmProjectDefinition, workspace: Workspace) {
    switch (defType.type) {
        case "folder": // Project_FolderProject_Frontmatter
        case "file": // Project_FileProject_Frontmatter
            openFileAtStart(workspace, defType.page?.path)
            console.log(defType.page?.path)
            break;
        case "tag_override": // task or wf override
            console.log(`openProjectPrecisely: tag_override. ${defType.taskable} ${defType.path}`)
            openTaskPrecisely(workspace, defType.taskable?.boundTask)
            break;
    }
}

/**
 *
 * @param task
 * @param tag
 * @return True if the workflow is defined by a task and the tag is replaced. False we need to use editor.setLine.
 */
// need to bind to the plugin instance
export function setProjectTagToTask(task: I_OdaPmTaskble, tag: string) {
    // replace the existent workflow tag
    const projectPath = task.getProjectPath();
    let desiredText;
    const sTask = task.boundTask;
    if (projectPath.contains(":")) {
        // The project is defined by a task tag, so a colon is inside the path.
        // We need to replace it since we allow only one project per task.
        const srcTag = `${Tag_Prefix_Project}${task.getFirstProject()?.name}`;
        desiredText = `${sTask.text.replace(srcTag, tag)}`;
        // console.log(desiredText)
    } else {
        desiredText = addTagText(sTask.text, tag);
    }
    rewriteTask(this.app.vault, sTask, sTask.status, desiredText)
}

// need to bind to the plugin instance
// setProjectToTaskOrWorkflow.call(this, prj, filePath, cursor, editor);
export function setProjectTagAtPath(prj: OdaPmProject, filePath: string, cursor: EditorPosition) {
    const targetTag = `${Tag_Prefix_Project}${prj.name}`; // project tag
    // Add to task 

    const pmTask = this.pmDb.getPmTask(filePath, cursor.line);
    if (pmTask) {
        setProjectTagToTask.call(this, pmTask, targetTag);
    }

    // Add to workflow
    const workflow = this.pmDb.getWorkflow(filePath, cursor.line);

    if (workflow) {
        setProjectTagToTask.call(this, workflow, targetTag);
    }
    if (!workflow && !pmTask) {
        new ONotice("Project can only be added to a task or workflow.")
        return
    }
}
