import {App, PluginSettingTab, Setting, ValueComponent} from "obsidian";
import TPMPlugin from "./main";
import OdaPmToolPlugin from "./main";
import {GenericProvider} from "./utils/GenericProvider";
import {Evt_SettingsChanged} from "./typing/dataview-event";
import React, {useContext} from "react";
import {PluginContext} from "./ui/obsidian/manage-page-view";
import {devLog} from "./utils/env-util";


type SerializedType =
    string
    | number
    | boolean
    | null
    | undefined
    | SerializedType[]
    | { [key: string]: SerializedType };

export const totalSortMethods = 3;
export const SortMethod_Appearance = 0;
export const SortMethod_Ascending = 1;
export const SortMethod_Descending = 2;

export const totalFilterMethods = 3;
export const FilterMethod_NotFiltering = 0;
export const FilterMethod_Included = 1;
export const FilterMethod_Excluded = 2;

export function getNextFilterMethod(method: number) {
    return (method + 1) % totalFilterMethods;
}

export interface TPMSettings {
    report_malformed_task: SerializedType;
    capitalize_table_row_initial: SerializedType;
    unclassified_workflows_available_to_all_projects: SerializedType;
    show_subproject_workflows: SerializedType;
    // must be a valid tag prefix
    // custom_tag_prefix_step: SerializedType;
    // custom_tag_prefix_workflow: SerializedType;
    // custom_tag_prefix_tag: SerializedType;

    // personalized settings, not exposed in settings tab
    show_completed_tasks: SerializedType;
    table_column_sorting: SerializedType;
    table_steps_shown: SerializedType;
    display_workflow_names: SerializedType[],
    manage_page_display_tags: SerializedType[],
    manage_page_excluded_tags: SerializedType[],
    manage_page_display_projects: SerializedType[], // 0.2.0
    help_page_tutorial_tldr: SerializedType,
}

export const TPM_DEFAULT_SETTINGS: Partial<TPMSettings> = {
    report_malformed_task: true,
    capitalize_table_row_initial: true,
    unclassified_workflows_available_to_all_projects: true,
    show_subproject_workflows: true, // default can see all subprojects' workflows
    // custom_tag_prefix_step: Tag_Prefix_Step,
    // custom_tag_prefix_workflow: Tag_Prefix_Workflow,
    // custom_tag_prefix_tag: Tag_Prefix_Tag,
    // personalized settings, not exposed in settings tab
    show_completed_tasks: true,
    table_column_sorting: SortMethod_Appearance,
    table_steps_shown: true,
    display_workflow_names: [] as SerializedType[],
    manage_page_display_tags: [] as SerializedType[],
    manage_page_excluded_tags: [] as SerializedType[],
    manage_page_display_projects: [] as SerializedType[], // 0.2.0
    help_page_tutorial_tldr: false,
}

type SettingName = keyof TPMSettings;

export
async function setSettingsValueAndSave<T extends SerializedType>(plugin: OdaPmToolPlugin, settingName: SettingName, value: T) {
    // @ts-ignore
    plugin.settings[settingName] = value;
    console.log(`Going to emit ${Evt_SettingsChanged} ${settingName} = ${value}...`);
    plugin.getEmitter().emit(Evt_SettingsChanged, settingName, value);
    await plugin.saveSettings();
}

export class TPMSettingsTab extends PluginSettingTab {
    plugin: TPMPlugin;

    constructor(app: App, plugin: TPMPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;

        containerEl.empty(); // This is settings page, after clicking the tab.

        // const header = containerEl.createEl("div");
        // header.createEl("h1", {text: this.plugin.manifest.name});
        // header.createEl("h2", {text: "by Odaimoko"});
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
export const SettingsProvider: GenericProvider<TPMSettings> = new GenericProvider<TPMSettings>();

export function getSettings() {
    return SettingsProvider.get();
}

// for react
/**
 * This hook returns a function which only triggers Evt_SettingsChanged event by calling set settings function.
 * Then the event will be handled by `handler`, which then executes setValue.
 * This is to ensure that when a value is changed in settings, the `handler` will receive the event, and update the value in the ui.
 * @param name
 */
export function usePluginSettings<T extends SettingName>(name: SettingName) {
    const plugin = useContext(PluginContext);
    const [value, setValue] = React.useState(plugin.settings[name] as T);

    function setValueAndSave(newValue: T) {
        console.log(`DirectSetValue: ${name}, Old value: ${plugin.settings[name]}`)
        setSettingsValueAndSave(plugin, name, newValue)
    }

    // really set value after settings change
    const handler = React.useCallback(
        (settingName: SettingName, newValue: T) => {
            if (settingName != name) return;
            devLog(`Received event: ${name}, ${newValue}`)
            setValue(newValue);
        }, [name]);

    React.useEffect(() => {
        plugin.getEmitter().on(Evt_SettingsChanged, handler);
        return () => {
            plugin.getEmitter().off(Evt_SettingsChanged, handler);
        };
    }, [name, plugin, handler]);
    return [value, setValueAndSave];
}
