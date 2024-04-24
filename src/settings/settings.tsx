import OdaPmToolPlugin from "../main";
import {GenericProvider} from "../utils/GenericProvider";
import {Evt_SettingsChanged} from "../typing/dataview-event";
import React, {SetStateAction, useContext} from "react";
import {PluginContext} from "../ui/obsidian/manage-page-view";
import {devLog} from "../utils/env-util";
import {SerializedType} from "./SerializedType";


export enum TableSortBy {
    Name,
    Step,
    Priority,
}


export enum TableSortMethod {
    Appearance, // For non-Name, Do not sort
    Ascending, // For non-Name, ticked will be placed at front
    Descending, // For non-Name, unticked will be placed at front
}

export interface TableSortData {
    sortBy: TableSortBy,
    column?: number,
    method: TableSortMethod
}

export const totalSortMethods = 3;

export const totalFilterMethods = 3;
export const FilterMethod_NotFiltering = 0;
export const FilterMethod_Included = 1;
export const FilterMethod_Excluded = 2;

export function getNextFilterMethod(method: number) {
    return (method + 1) % totalFilterMethods;
}

// region Priority
export const maxPriorityTags = 5;

export enum TaskPriority {
    High = 0,
    MedHi = 1,
    Medium = 2,
    MedLo = 3,
    Low = 4,
}

function getDefaultPriority() {
    return Math.floor(maxPriorityTags / 2); // 1 -> medium's index
}

export const MoreThanOnePriority = -1;
export const DefaultTaskPriority = getDefaultPriority();

// endregion


/**
 * cached: not in settings tab, nor explicitly in any ui.
 */
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
    cached_table_task_sorting_by: TableSortBy;
    cached_table_task_sorting_method: SerializedType;
    table_steps_shown: SerializedType;
    display_workflow_names: SerializedType[],
    manage_page_display_tags: SerializedType[],
    manage_page_excluded_tags: SerializedType[],
    manage_page_display_projects: SerializedType[], // 0.2.0
    manage_page_header_as_module: boolean, // 0.3.0
    display_module_names: SerializedType[], // 0.3.0
    do_not_show_completed_projects_in_manage_page: boolean, // 0.3.3
    completed_project_names: SerializedType[], // 0.3.3 
    priority_tags: SerializedType[], // 0.5.0, from high to low, should add the prefix `tpm/tag/`
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
    cached_table_task_sorting_by: TableSortBy.Name,
    cached_table_task_sorting_method: TableSortMethod.Appearance,
    table_steps_shown: true,
    display_workflow_names: [] as SerializedType[],
    manage_page_display_tags: [] as SerializedType[],
    manage_page_excluded_tags: [] as SerializedType[],
    manage_page_display_projects: [] as SerializedType[], // 0.2.0
    manage_page_header_as_module: true, // 0.3.0
    display_module_names: [] as SerializedType[], // 0.3.0,
    do_not_show_completed_projects_in_manage_page: true, // 0.3.3
    completed_project_names: [] as SerializedType[], // 0.3.3
    priority_tags: ["hi", "med_hi", "med", "med_lo", "lo"] as SerializedType[], // 0.5.0
    help_page_tutorial_tldr: false,
}
export type SettingName = keyof TPMSettings;

export
async function setSettingsValueAndSave<T extends SerializedType>(plugin: OdaPmToolPlugin, settingName: SettingName, value: T) {
    // @ts-ignore
    plugin.settings[settingName] = value;
    devLog(`[Settings] Emit ${Evt_SettingsChanged} ${settingName} = ${value}...`);
    plugin.getEmitter().emit(Evt_SettingsChanged, settingName, value);
    await plugin.saveSettings();
}

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
export function usePluginSettings<T extends SerializedType>(name: SettingName): [T, (v: SetStateAction<T>) => Promise<void>] {
    const plugin = useContext(PluginContext);
    // @ts-ignore
    const [value, setValue] = React.useState(getSettings()[name] as T);

    async function setValueAndSave(newValue: T) {
        // @ts-ignore
        devLog(`DirectSetValue: ${name}, Old value: ${getSettings()[name]}`)
        if (plugin)
            await setSettingsValueAndSave(plugin, name, newValue)
    }

    // really set value after settings change
    const handler = React.useCallback(
        (settingName: SettingName, newValue: T) => {
            if (settingName != name) return;
            devLog(`Received event: ${name}, ${newValue}`)
            setValue(newValue);
        }, [name]);

    React.useEffect(() => {
        plugin?.getEmitter().on(Evt_SettingsChanged, handler);
        return () => {
            plugin?.getEmitter().off(Evt_SettingsChanged, handler);
        };
    }, [name, plugin, handler]);
    return [value, setValueAndSave];
}
