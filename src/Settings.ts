import {App, PluginSettingTab, Setting, ValueComponent} from "obsidian";
import IPmToolPlugin from "./main";

type SerializedType =
    string
    | number
    | boolean
    | null
    | undefined
    | SerializedType[]
    | { [key: string]: SerializedType };

export interface IPmSettings {
    report_malformed_task: SerializedType;
    // personalized settings, not exposed in settings tab
    include_completed_tasks: SerializedType;
}

export const IPM_DEFAULT_SETTINGS: Partial<IPmSettings> = {
    report_malformed_task: true,
    include_completed_tasks: true
}

type SettingName = keyof IPmSettings;

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
        book.createEl("body", {text: "Odaimoko"});

        new Setting(containerEl)
            .setName('Notice when a task is malformed')
            .setDesc('A task or workflow definition is malformed if it contains multiple lines. Try adding bland line before or after the task.')
            .addToggle(this.setValueAndSave("report_malformed_task"));
        // .addText(text => text
        //     .setPlaceholder('Enter your secret')
        //     .setValue(this.plugin.settings.mySetting)
        //     .onChange(async (value) => {
        //         this.plugin.settings.mySetting = value;
        //         await this.plugin.saveSettings();
        //     }));

    }

    setValueAndSave<T extends SerializedType>(settingName: SettingName) {
        return (vc: ValueComponent<T>) =>
            // @ts-ignore
            vc.setValue(this.plugin.settings[settingName])
                // @ts-ignore
                .onChange?.(async (value: T) => {
                    this.plugin.settings[settingName] = value;
                    await this.plugin.saveSettings();
                }
            );
    }

}