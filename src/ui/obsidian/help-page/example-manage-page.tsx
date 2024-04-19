import {App} from "obsidian";
import React, {JSX, useState} from "react";
import {getTemplateHtml, ManagePageForTemplate, templateMd} from "../../tpm-template-md";
import {P} from "../../common/heading";
import {PLUGIN_NAME} from "../../../main";
import {Desc_ManagePage} from "./help-page-view";
import {centerChildrenVertStyle} from "../../react-view/style-def";

export const templateTargetFilePath = "TagProject_Template.md";
export const ExampleManagePage = ({app, container}: {
    app: App,
    container: Element
}) => {
    const [templateView, setTemplateView] = useState<JSX.Element>();
    container.empty()
    if (!templateView)
        getTemplateHtml(app, container).then((v) => {
            setTemplateView(v)
        })
    return <>
        <P style={centerChildrenVertStyle}>
            This is a template for {PLUGIN_NAME}. You can use it as a starting point.
        </P>
        <P style={centerChildrenVertStyle}>
            This can be created with one click in the plugin.
        </P>
        <P style={centerChildrenVertStyle}>
            <button onClick={() => {
                if (templateView) {
                    // fs.writeFileSync("TagProject_Template.md", templateMd)
                    app.vault.adapter.write(templateTargetFilePath, templateMd)
                }
            }}>Create this template at <label style={{padding: 3, fontStyle: "italic"}}>{templateTargetFilePath}</label>
            </button>
        </P>
        <P>
            A {Desc_ManagePage} showcase
        </P>
        <ManagePageForTemplate/>
        <P>
            The source markdown
        </P>
        {templateView}
    </>
}
