import {App, PluginSettingTab, Setting, ValueComponent} from "obsidian";
import TPMPlugin from "../main";
import {createRoot, Root} from "react-dom/client";
import React, {useState} from "react";
import {getSettings, ModifierKeyOnClick, setSettingsValueAndSave, SettingName, usePluginSettings} from "./settings";
import {SerializedType} from "./SerializedType";
import {HStack} from "../ui/pure-react/view-template/h-stack";
import {PluginContext} from "../ui/obsidian/manage-page-view";
import {diffGroupSpacing} from "../ui/pure-react/style-def";
import {ExternalToggleView} from "../ui/pure-react/view-template/toggle-view";
import {Desc_ManagePage} from "../ui/obsidian/help-page/help-page-view";
import {PriorityTagsEditView} from "./PriorityTagsEditView";

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
        containerEl.createEl("h2", {text: "Appearance"})

        new Setting(containerEl)
            .setName('Capitalized the first letter in table row')
            .addToggle(this.setValueAndSave("capitalize_table_row_initial"));

        new Setting(containerEl)
            .setName("Tags in Task Table")
            .setDesc('Show normal tags in the task table on Manage Page. Need to reopen the Manage Page.')
            .addToggle(this.setValueAndSave("tags_in_task_table_summary_cell"));

        const projectHeader = containerEl.createEl("h2", {text: "Projects"})

        new Setting(containerEl)
            .setName('Unclassified workflows available for all projects')
            .setDesc("If ON, unclassified workflows will be available to any projects. If OFF, only workflows in that project are available.")
            .addToggle(this.setValueAndSave("unclassified_workflows_available_to_all_projects"));
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const headerAsModule = new Setting(containerEl).setName("Header as module")
            .setDesc("If ON, the tasks under headers with the same name can be grouped together. Need to reopen the Manage Page.")
            .addToggle(this.setValueAndSave("manage_page_header_as_module"));

        // region Priority Tags
        const priTagDiv = containerEl.createDiv();
        priTagDiv.className = "setting-item";

        this.root = createRoot(priTagDiv); // Override the previous container
        this.root.render(
            <PluginContext.Provider value={this.plugin}>
                <PriorityTagsEditView/>
            </PluginContext.Provider>
        )


        new Setting(containerEl).setName(`Show Priority Tags in ${Desc_ManagePage}`)
            .setDesc(`If ON, the priority tags will appear in the Tag Filter in ${Desc_ManagePage}. Default OFF.`)
            .addToggle(this.setValueAndSave("show_priority_tags_in_manage_page"))

        // endregion

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

function RegexTrimEditView() {
    // TODO Previe use task_summary_trim_regexp_pattern_test_text
    const [oriTag, setOriTag] = useState("")
    return <div>
        <HStack style={{justifyContent: "space-between"}} spacing={diffGroupSpacing}>
            <div>
                <div className={"setting-item-name"}>Remove regex pattern from task summary</div>
                <div className={"setting-item-description"}>
                    You need to edit some file and save for this to be effective
                </div>
            </div>
            <div>
                <input style={{width: 100}} type={"text"}
                       placeholder={getSettings()?.task_summary_trim_regexp_pattern as string}
                       value={oriTag}
                       onChange={() => {
                       }}
                />
            </div>
        </HStack>

