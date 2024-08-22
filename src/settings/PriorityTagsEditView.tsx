import React, {useEffect, useState} from "react";
import {PluginContext} from "../ui/obsidian/manage-page-view";
import {OdaPmDbProvider} from "../data-model/OdaPmDb";
import {Evt_DbReloaded, Evt_SettingsChanged} from "../typing/dataview-event";
import {getSettings, TPM_DEFAULT_SETTINGS, usePluginSettings} from "./settings";
import {HStack, VStack} from "../ui/pure-react/view-template/h-stack";
import {getPriorityIcon, OdaTaskSummaryCell} from "../ui/react-view/task-table-view";
import {
    centerChildren,
    centerChildrenHoriVertStyle,
    centerChildrenVertStyle,
    diffGroupSpacing,
    sameGroupSpacing
} from "../ui/pure-react/style-def";
import {HashTagView} from "../ui/common/hash-tag-view";
import {Tag_Prefix_Tag} from "../data-model/workflow-def";
import {isStringNullOrEmpty} from "../utils/format-util";
import {isTagNameValid} from "../data-model/markdown-parse";
import {TwiceConfirmButton} from "../ui/pure-react/view-template/twice-confirm-button";
import {devLog} from "../utils/env-util";
import {setTaskPriority} from "../data-model/OdaPmTask";
import {ObsidianIconView} from "../ui/react-view/obsidian-icon-view";
import {DisappearableErrText} from "../ui/pure-react/view-template/disappearable-err-text";
import {DataTable} from "../ui/pure-react/view-template/data-table";
import {InlineCodeView} from "../ui/common/inline-code-view";

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
                                            if (!isStringNullOrEmpty(tag) && !isTagNameValid(tag)) {
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
            if (isStringNullOrEmpty(tag)) {
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
                                        devLog(`on save ${affectedTask.getAllTags()} (pri ${pri}) to ${newTags[pri]}`, "settingTags", settingsTagNames)
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
