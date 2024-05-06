import {App, PluginSettingTab, Setting, ValueComponent} from "obsidian";
import TPMPlugin from "../main";
import {createRoot, Root} from "react-dom/client";
import React, {useEffect, useState} from "react";
import {
    getSettings,
    ModifierKeyOnClick,
    setSettingsValueAndSave,
    SettingName,
    TPM_DEFAULT_SETTINGS,
    usePluginSettings
} from "./settings";
import {SerializedType} from "./SerializedType";
import {isTagNameValid} from "../data-model/markdown-parse";
import {HStack, VStack} from "../ui/react-view/view-template/h-stack";
import {PluginContext} from "../ui/obsidian/manage-page-view";
import {
    centerChildren,
    centerChildrenHoriVertStyle,
    centerChildrenVertStyle,
    diffGroupSpacing,
    sameGroupSpacing
} from "../ui/react-view/style-def";
import {DataTable} from "../ui/react-view/view-template/data-table";
import {Tag_Prefix_Tag} from "../data-model/workflow-def";
import {getPriorityIcon, OdaTaskSummaryCell} from "../ui/react-view/task-table-view";
import {TwiceConfirmButton} from "../ui/react-view/view-template/twice-confirm-button";
import {ObsidianIconView} from "../ui/react-view/view-template/icon-view";
import {Evt_DbReloaded, Evt_SettingsChanged} from "../typing/dataview-event";
import {InlineCodeView} from "../ui/common/inline-code-view";
import {HashTagView} from "../ui/common/hash-tag-view";
import {OdaPmDbProvider} from "../data-model/OdaPmDb";
import {devLog} from "../utils/env-util";
import {setTaskPriority} from "../data-model/OdaPmTask";
import {ExternalToggleView} from "../ui/react-view/view-template/toggle-view";

function ObsidianSettingToggleView(props: {
    name: string,
    description: string,
    externalControl: boolean,
    onChange: () => void,
}) {
    return <div className={"setting-item mod-toggle"}>
        <div className={"setting-item-info"}>
            <div className={"setting-item-name"}>{props.name}</div>
            {props.description.split("\n").map(k => {
                return (
                    <div key={k} className={"setting-item-description"}>{k}</div>
                )
            })}
        </div>

        <div className="setting-item-control">
            <ExternalToggleView externalControl={props.externalControl} onChange={props.onChange}/>
        </div>
    </div>
}

function TaskNavigationPolicyView() {

    const [searchOpened, setSearchOpened] = usePluginSettings<boolean>("search_opened_tabs_before_navigating_tasks");
    const [openNewTabIfNotFound, setOpenNewTabIfNotFound] = usePluginSettings<boolean>("open_new_tab_if_task_tab_not_found");
    return <>
        <ObsidianSettingToggleView key={"searchOpened"} name={"Look among opened tabs before navigating tasks"}
                                   description={"If ON, the plugin will look for the task in opened tabs before navigating to the task.\nIf OFF, open in current tab."}
                                   externalControl={searchOpened}
                                   onChange={() => setSearchOpened(!searchOpened)}/>
        <div style={{
            pointerEvents: searchOpened ? "auto" : "none", // if searchOpened is false, do not interact with this div
            opacity: searchOpened ? 1 : 0.3, // if searchOpened is false, make it less visible
        }}>
            <ObsidianSettingToggleView key={"openNew"} name={"Open new tab if task tab not found"}
                                       description={"If ON, when the task file is not found in existing tabs, open a new tab.\nIf OFF, open in current editor."}
                                       externalControl={openNewTabIfNotFound}
                                       onChange={() => setOpenNewTabIfNotFound(!openNewTabIfNotFound)}/>
        </div>
    </>;

}

export class TPMSettingsTab extends PluginSettingTab {
    plugin: TPMPlugin;
    private root: Root;

    constructor(app: App, plugin: TPMPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;

        containerEl.empty(); // This is settings page, after clicking the tab.

        // const header = containerEl.createEl("div");
        // const head = header.createEl("label");
        // head.style.display = "flex";
        // head.createEl("h1", {text: this.plugin.manifest.name});
        // head.createEl("h2", {text: "by Odaimoko"});
        // containerEl.createEl("h3", {text: "Plugin Behaviours"});
        new Setting(containerEl)
            .setName('Notify when a task is malformed')
            .setDesc('A task or workflow definition is malformed if it contains multiple lines, or the text is empty. Try adding blank line before or after the task.')
            .addToggle(this.setValueAndSave("report_malformed_task"));
        new Setting(containerEl)
            .setName('Capitalized the first letter in table row')
            .addToggle(this.setValueAndSave("capitalize_table_row_initial"));

        const projectHeader = containerEl.createEl("h2", {text: "Projects"})

        new Setting(containerEl)
            .setName('Unclassified workflows available for all projects')
            .setDesc("If ON, unclassified workflows will be available to any projects. If OFF, only workflows in that project are available.")
            .addToggle(this.setValueAndSave("unclassified_workflows_available_to_all_projects"));
        const headerAsModule = new Setting(containerEl).setName("Header as module")
            .setDesc("If ON, the tasks under headers with the same name can be grouped together.")
            .addToggle(this.setValueAndSave("manage_page_header_as_module"));

        const priTagDiv = containerEl.createDiv();
        priTagDiv.className = "setting-item";

        this.root = createRoot(priTagDiv); // Override the previous container
        this.root.render(
            <PluginContext.Provider value={this.plugin}>
                <PriorityTagsEditView/>
            </PluginContext.Provider>
        )

        containerEl.createEl("h2", {text: "Task Navigation Policy"})
        const navPolicyDiv = containerEl.createDiv();
        this.root = createRoot(navPolicyDiv);
        this.root.render(
            <PluginContext.Provider value={this.plugin}>
                <TaskNavigationPolicyView/>
            </PluginContext.Provider>
        )

        new Setting(containerEl).setName("Always open task in new tab modify key")
            .setDesc("If the key is pressed when clicking the task, always open in a new tab. None for never apply modifier keys.")
            .addDropdown(dropdown => {
                dropdown.addOptions({
                    [ModifierKeyOnClick.None]: "None",
                    [ModifierKeyOnClick.Alt]: "Alt (Option)",
                    [ModifierKeyOnClick.MetaOrCtrl]: "Ctrl (Cmd)",
                    [ModifierKeyOnClick.Shift]: "Shift",
                }).setValue(this.plugin.settings.always_open_task_in_new_tab_modify_key)
                    .onChange(async (value) => {
                        await setSettingsValueAndSave(this.plugin, "always_open_task_in_new_tab_modify_key", value)
                    })

            })
    }

    setValueAndSave<T extends SerializedType>(settingName: SettingName) {
        return (vc: ValueComponent<T>) =>
            // @ts-ignore
            vc.setValue(this.plugin.settings[settingName])
                // @ts-ignore
                .onChange?.(async (value: T) => {
                    await setSettingsValueAndSave(this.plugin, settingName, value)
                }
            );
    }

} // Singleton!

function isStringEmpty(oriTag: string) {
    return oriTag === "" || oriTag === undefined || oriTag === null;
}

function TagInputWidget({editingTags, idx, setEditingTags, setNotiText}: {
    editingTags: string[],
    idx: number,
    setEditingTags: (value: (((prevState: string[]) => string[]) | string[])) => void,
    setNotiText: (value: (((prevState: string) => string) | string)) => void
}) {
    const oriTag = editingTags[idx];

    return <InlineCodeView text={<input style={{width: 100}} type={"text"}
                                        placeholder={
                                            TPM_DEFAULT_SETTINGS.priority_tags?.at(idx) as string ?? oriTag
                                            // if no default, use the oriTag as placeholder
                                        }
                                        value={oriTag}
                                        onChange={(e) => {
                                            const tag = e.target.value;
                                            // empty input will be replaced by placeholder
                                            if (!isStringEmpty(tag) && !isTagNameValid(tag)) {
                                                setNotiText(`[Err] Invalid tag: ${tag}`)
                                                return;
                                            }
                                            editingTags[idx] = tag;
                                            setEditingTags([...editingTags])
                                        }}
    />}/>;
}

export const PriorityLabels = ["High", "Med_High", "Medium", "Med_Low", "Low"]

export function PriorityTagsEditView() {

    const plugin = React.useContext(PluginContext);
    const db = OdaPmDbProvider.get();
    // region Re-render trigger
    const [rerenderState, setRerenderState] = useState(0);

    function triggerRerender() {
        // console.log(`ReactManagePage rerender triggered. ${rerenderState + 1}`)
        setRerenderState((prevState) => prevState + 1)
    }

    useEffect(() => {
        db?.emitter?.addListener(Evt_DbReloaded, triggerRerender)
        db?.emitter?.addListener(Evt_SettingsChanged, triggerRerender)

        return () => {
            db?.emitter?.removeListener(Evt_DbReloaded, triggerRerender)
            db?.emitter?.addListener(Evt_SettingsChanged, triggerRerender)
        }
    }, [rerenderState]);
    // endregion

    // no prefix
    const [editingTagNames, setEditingTagNames] = useState<string[]>(
        [...getSettings()?.priority_tags as string[]]) // make a copy so that we won't change the settings directly
    const [settingsTagNames, setSettingsTags] = usePluginSettings<string[]>("priority_tags")
    const [notiText, setNotiText] = useState("")
    const oldPriTags = db?.pmPriorityTags ?? [];
    const headers: string[] = []

    const rows = PriorityLabels.map(label => {
        const idx = PriorityLabels.indexOf(label);
        return [
            <HStack>
                {getPriorityIcon(idx)}
                <div style={{flex: 1, ...centerChildrenVertStyle}}>
                    {/* span the rest space and put child at the center */}
                    <label>{label}</label>
                </div>
            </HStack>,
            <HStack style={centerChildrenHoriVertStyle}>
                <HashTagView tagWithoutHash={Tag_Prefix_Tag}/>
                <TagInputWidget setNotiText={setNotiText} editingTags={editingTagNames} idx={idx}
                                setEditingTags={setEditingTagNames}/>
            </HStack>,
        ]
    })
    const tasks = db?.pmTasks ?? [];
    const diffTags = settingsTagNames.filter(k => !editingTagNames.includes(k)).map(k => `${Tag_Prefix_Tag}${k}`)
    const affectedTasks = tasks.filter(t => t.hasAnyTag(diffTags)); // include those have multiple priority tags
    // devLog("Affected count: " + affectedTasks.length, affectedTasks.map(k => k.summary).join(", "))
    const wronglyAssignedTasks = affectedTasks.filter(k => k.getPriority(oldPriTags) < 0)

    function getValidNewTags() {
        if (wronglyAssignedTasks.length > 0) {
            setNotiText("[Err] Priority tags not saved. Some tasks have multiple priority tags.")
            return null;
        }
        // Do not save if any tag is invalid
        const newTags: string[] = []
        for (let i = 0; i < editingTagNames.length; i++) {
            const tag = editingTagNames[i];
            if (newTags.contains(tag)) {
                setNotiText(`[Err] Duplicate tag: ${tag}`)
                return null;
            }
            if (isStringEmpty(tag)) {
                newTags.push(TPM_DEFAULT_SETTINGS.priority_tags?.at(i) as string)
            } else if (!isTagNameValid(tag)) {
                setNotiText(`[Err] Invalid tag: ${tag}`)
                return null;
            } else {
                newTags.push(tag);
            }
        }
        return newTags;
    }

    return <div>
        <HStack style={{justifyContent: "space-between"}} spacing={diffGroupSpacing}>
            <div>

                <div className={"setting-item-name"}>Priority tags</div>
                <div className={"setting-item-description"}>
                    <p>
                        Customize your priority tags.
                    </p>
                    <p>
                        Current tags are: <b>{settingsTagNames.join(", ")}.</b>
                    </p>
                    <p>
                        On save, the priority tags will be replaced in all tasks.
                        This is NOT undoable.
                    </p>
                    <p>
                        <label style={{fontSize: 16, fontWeight: "bold"}}>{affectedTasks.length}</label> managed tasks
                        will be affected.
                    </p>

                    <HStack spacing={sameGroupSpacing}>
                        <TwiceConfirmButton
                            onConfirm={() => {
                                const newTags = getValidNewTags();
                                if (!newTags)
                                    return;
                                setSettingsTags(newTags).then(async () => {
                                    setEditingTagNames([...newTags]) // re-render
                                    // replace tags in all tasks
                                    for (const affectedTask of affectedTasks) {
                                        const pri = affectedTask.getPriority(oldPriTags); // keep the old priority
                                        devLog(`on save ${affectedTask.boundTask.tags} (pri ${pri}) to ${newTags[pri]}`, "settingTags", settingsTagNames)
                                        await setTaskPriority(affectedTask.boundTask, plugin,
                                            oldPriTags, `${Tag_Prefix_Tag}${newTags[pri]}`)
                                    }
                                    // replace tags in text will automatically trigger a db reload

                                    setNotiText("[OK] Saved.");
                                })
                            }}
                            confirmView={
                                <HStack style={centerChildren} spacing={sameGroupSpacing}>

                                    <ObsidianIconView style={{color: "var(--text-warning)"}}
                                                      iconName={"alert-circle"}/>
                                    <label>Save</label>
                                </HStack>

                            }
                            twiceConfirmView={<label>Confirm</label>}
                        />
                        <DisappearableErrText color={notiText.startsWith("[Err]") ? "var(--text-error)" : "green"}
                                              text={notiText} setText={setNotiText}/>
                    </HStack>
                    {
                        wronglyAssignedTasks.length > 0 && <p>
                            The follow tasks' priority tags are not correctly assigned:
                            <VStack>
                                {
                                    wronglyAssignedTasks.map(k => <OdaTaskSummaryCell oTask={k}
                                                                                      taskFirstColumn={k.summary}/>)
                                }
                            </VStack>
                        </p>
                    }
                </div>

            </div>
            <DataTable tableTitle={"Pri"} headers={headers} rows={rows}/>

        </HStack>
    </div>
}


function DisappearableErrText(props: {
    color: string;
    text: string,
    setText: (value: (((prevState: string) => string) | string)) => void,
}) {
    useEffect(() => {
        // after 3 seconds, clear the text
        setTimeout(() => {
            props.setText("")
        }, 5000)
    }, [props.text]);
    return <label style={{
        color: props.color
    }}>{props.text}</label>
}
