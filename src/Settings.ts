import {App, PluginSettingTab, Setting, ValueComponent} from "obsidian";
import TPMPlugin from "./main";
import OdaPmToolPlugin from "./main";
import {GenericProvider} from "./utils/GenericProvider";


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
    help_page_tutorial_tldr: SerializedType,
}

export const TPM_DEFAULT_SETTINGS: Partial<TPMSettings> = {
    report_malformed_task: true,
    capitalize_table_row_initial: true,
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
    help_page_tutorial_tldr: false,
}

type SettingName = keyof TPMSettings;

export
async function setSettingsValueAndSave<T extends SerializedType>(plugin: OdaPmToolPlugin, settingName: SettingName, value: T) {
    // @ts-ignore
    plugin.settings[settingName] = value;
    // console.log(`Saving settings ${settingName} = ${value}...`);
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

        const header = containerEl.createEl("div");
        header.createEl("h1", {text: this.plugin.manifest.name});
        header.createEl("h2", {text: "by Odaimoko"});
        containerEl.createEl("h3", {text: "Plugin Behaviours"});
        new Setting(containerEl)
            .setName('Notice when a task is malformed')
            .setDesc('A task or workflow definition is malformed if it contains multiple lines, or the text is empty. Try adding blank line before or after the task.')
            .addToggle(this.setValueAndSave("report_malformed_task"));
        new Setting(containerEl)
            .setName('Capitalized the first letter in table row')
            .addToggle(this.setValueAndSave("capitalize_table_row_initial"));


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