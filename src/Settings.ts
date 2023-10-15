import {App, PluginSettingTab, Setting, ValueComponent} from "obsidian";
import IPmToolPlugin from "./main";
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

export interface IPmSettings {
    report_malformed_task: SerializedType;
    capitalize_table_row_initial: SerializedType;
    // personalized settings, not exposed in settings tab
    show_completed_tasks: SerializedType;
    table_column_sorting: SerializedType;
    table_steps_shown: SerializedType;
    display_workflow_names: SerializedType[],
}

export const IPM_DEFAULT_SETTINGS: Partial<IPmSettings> = {
    report_malformed_task: true,
    show_completed_tasks: true,
    capitalize_table_row_initial: true,
    table_column_sorting: SortMethod_Appearance,
    table_steps_shown: true,
    display_workflow_names: [] as SerializedType[],
}

type SettingName = keyof IPmSettings;

export
async function setSettingsValueAndSave<T extends SerializedType>(plugin: OdaPmToolPlugin, settingName: SettingName, value: T) {
    // @ts-ignore
    plugin.settings[settingName] = value;
    // console.log(`Saving settings ${settingName} = ${value}...`);
    await plugin.saveSettings();
}

export class IPmSettingsTab extends PluginSettingTab {
    plugin: IPmToolPlugin;

    constructor(app: App, plugin: IPmToolPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;

        containerEl.empty(); // This is settings page, after clicking the tab.

        const book = containerEl.createEl("div");
        book.createEl("h1", {text: "iPM: A Project Management Tool"});
        book.createEl("h2", {text: "by Odaimoko"});

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
export const SettingsProvider: GenericProvider<IPmSettings> = new GenericProvider<IPmSettings>();

export function getSettings() {
    return SettingsProvider.get();
}