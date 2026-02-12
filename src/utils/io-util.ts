import {EditorPosition, MarkdownView, Vault, Workspace, WorkspaceLeaf} from "obsidian";
import {STask} from "obsidian-dataview";
import {OdaPmProject, OdaPmProjectDefinition, Tag_Prefix_Project} from "../data-model/OdaPmProject";
import {I_OdaPmTaskble} from "../data-model/workflow-def";
import {ONotice} from "./o-notice";
import {addTagText} from "../data-model/tag-text-manipulate";
import {devLog} from "./env-util";
import {getSettings} from "../settings/settings";

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

async function getOpenInNewTab(forceNewTab: boolean, workspace: Workspace, path: string) {
    const settings = getSettings();
    let foundTabWithFile = false;
    if (
        !forceNewTab && settings?.search_opened_tabs_before_navigating_tasks
    ) {
        const mdLeaf = workspace.getLeavesOfType("markdown").find((k: WorkspaceLeaf) => {
            const mdView = k.view as MarkdownView;
            // mdView can have no file (ie the file is not saved to disk)
            return mdView.file?.path === path;
        })
        if (mdLeaf) {
            // If found, set the active leaf to this view
            foundTabWithFile = true;
            await mdLeaf.open(mdLeaf.view);// ok
            workspace.setActiveLeaf(mdLeaf); // set active so `openLinkText` would operate on this view
            workspace.revealLeaf(mdLeaf); // this file might be hidden
        }

    }

    let openInNewLeaf = forceNewTab;
    if (!forceNewTab) {
        // if we do not force new tab, we need to check if we should open in new tab
        if (!settings?.search_opened_tabs_before_navigating_tasks) {
            // if we don't search opened tabs, we always open in current tab
            openInNewLeaf = false;
        } else {
            if (foundTabWithFile) {
                openInNewLeaf = false;
            } else {
                openInNewLeaf = settings?.open_new_tab_if_task_tab_not_found ?? false;
            }
        }
    }
    return openInNewLeaf;
}

async function openFileAtStart(workspace: Workspace, path: string, forceNewTab = false) {
    const openInNewLeaf = await getOpenInNewTab(forceNewTab, workspace, path);
    workspace.openLinkText(path, path, openInNewLeaf, {
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
export async function openTaskPrecisely(workspace: Workspace, task: STask, forceNewTab = false) {
    devLog(`[taskview] openTaskPrecisely ${workspace.getLeavesOfType("markdown").length} tabs. ForceNewTab ${forceNewTab}`)
    const openInNewLeaf = await getOpenInNewTab(forceNewTab, workspace, task.path);
    // Copy from dataview. See TaskItem.
    // highlight cursor
    devLog(`[OpenTask] Task ${task.path} openInNewLeaf ${openInNewLeaf}`)
    await workspace.openLinkText(
        task.link.toFile().obsidianLink(),
        task.path,
        openInNewLeaf,
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

/** Open the file at the section (header) that contains the given task. Use for module "go to definition". */
export async function openSectionPrecisely(workspace: Workspace, task: STask, forceNewTab = false) {
    const openInNewLeaf = await getOpenInNewTab(forceNewTab, workspace, task.path);
    const sectionLink = task.section.obsidianLink();
    devLog(`[OpenSection] ${task.path} section ${sectionLink} openInNewLeaf ${openInNewLeaf}`);
    await workspace.openLinkText(sectionLink, task.path, openInNewLeaf, {});
}

export function openProjectPrecisely(project: OdaPmProject, defType: OdaPmProjectDefinition, workspace: Workspace, forceNewTab = false) {
    switch (defType.type) {
        case "folder": // Project_FolderProject_Frontmatter
        case "file": // Project_FileProject_Frontmatter
            openFileAtStart(workspace, defType.page?.path, forceNewTab)
            console.log(defType.page?.path)
            break;
        case "tag_override": // task or wf override
            console.log(`openProjectPrecisely: tag_override. ${defType.taskable} ${defType.path}`)
            openTaskPrecisely(workspace, defType.taskable?.boundTask, forceNewTab)
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

// need to bind to the plugin instance to `this`
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
