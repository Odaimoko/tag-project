import React, {useEffect, useState} from "react";
import {HStack} from "../ui/pure-react/view-template/h-stack";
import {centerChildren, diffGroupSpacing} from "../ui/pure-react/style-def";
import {getSettings, usePluginSettings} from "./settings";
import {ArrowMoveRight} from "../ui/pure-react/icon/ArrowBigUpDash";
import {InlineCodeView} from "../ui/common/inline-code-view";
import {devLog} from "../utils/env-util";
import {DisappearableErrText} from "../ui/pure-react/view-template/disappearable-err-text";

export function RegexTrimEditView() {
    // TODO Previe use task_summary_trim_regexp_pattern_test_text
    const [regPattern, setRegPattern] = usePluginSettings<string>("task_summary_trim_regexp_pattern")
    const [testText, setTestText] = usePluginSettings<string>("task_summary_trim_regexp_pattern_test_text");
    const [notiText, setNotiText] = useState("")
    let regExp: RegExp | null = null;
    try {
        regExp = new RegExp(regPattern);
    } catch (e) {
        // regExp is invalid
    }
    useEffect(() => {
        if (!regExp)
            setNotiText("[Err] Invalid Regular expression.")
        else setNotiText("")
    }, [testText, regPattern]);
    const replacedText = regExp ? testText.replace(regExp, "") : testText;
    devLog(`$[RegexTrimEditView] oriTag: ${regPattern}, patternValid? ${!!regExp}`);
    return <div>
        <HStack style={{justifyContent: "space-between"}}>
            <div>
                <div className={"setting-item-name"}>Remove regex pattern from task summary</div>
                <div className={"setting-item-description"}>
                    Empty means no effect.
                </div>
                <div className={"setting-item-description"}>
                    <b>You need to edit any file and save for this to be effective.</b>
                </div>
            </div>
            <div>
                <input style={{minWidth: 100}} type={"text"}
                       placeholder={getSettings()?.task_summary_trim_regexp_pattern as string}
                       value={regPattern}
                       onChange={(event) => {
                           setRegPattern(event.target.value)
                       }}
                />

            </div>
        </HStack>

        <p/>
        <DisappearableErrText color={notiText.startsWith("[Err]") ? "var(--text-error)" : "green"}
                              text={notiText} setText={setNotiText}/>
        <p/>
        <label>Preview Your Task </label>
        <HStack style={{justifyContent: "space-between", ...centerChildren}} spacing={diffGroupSpacing}>
            <div style={{minWidth: 200,}}>
                <div style={{display: "inline-block"}}>
                    <InlineCodeView text={"["}/>
                    <input type={"text"}
                           placeholder={"Your task summary"}
                           value={testText}
                           onChange={(event) => {
                               setTestText(event.target.value)
                           }}
                    />
                    <InlineCodeView text={"]"}/>
                </div>
            </div>
            <ArrowMoveRight/>
            <div style={{minWidth: 200}}>
                <div style={{display: "inline-block"}}>
                    <InlineCodeView text={"["}/>
                    <label>{replacedText}</label>
                    <InlineCodeView text={"]"}/>
                </div>
            </div>

        </HStack>
    </div>
}
