import {OdaPmProject, OdaPmProjectDefinition} from "../../data-model/OdaPmProject";
import React, {useContext} from "react";
import {PluginContext} from "../obsidian/manage-page-view";
import {ClickableIconView, InternalLinkView} from "./view-template/icon-view";
import {iconViewAsAWholeStyle} from "./style-def";
import {openProjectPrecisely} from "../../utils/io-util";
import {VStack} from "./view-template/h-stack";
import {HoveringPopup, usePopup} from "./view-template/hovering-popup";

export const IconName_Project = "folder";

function ProjectLinkView(props: {
    project: OdaPmProject,
    def: OdaPmProjectDefinition
}) {
    const plugin = useContext(PluginContext);
    return <InternalLinkView style={iconViewAsAWholeStyle} onIconClicked={openProject}
                             onContentClicked={openProject}
                             content={<label style={{whiteSpace: "nowrap"}}>{props.def.getLinkText()}</label>}/>

    function openProject() {
        openProjectPrecisely(props.project, props.def, plugin.app.workspace);
    }
}

export function ProjectView(props: {
    project: OdaPmProject | null,
    style?: React.CSSProperties
}) {
    if (props.project === null) return <></>;
    const project = props.project;
    const popupProps = usePopup("none");
    const {hideDropdown} = popupProps;

    // TODO Jump To Project Definition 

    function toggleDropdown() {
        // toggleDropDown(setDropDownDisplay)
    }

    const showableDefinitions = project.projectDefinitions.filter(k => k.type !== "system");
    const hoveredContent = <ClickableIconView onContentClicked={toggleDropdown} onIconClicked={toggleDropdown}
                                              iconName={IconName_Project}
                                              content={<label>{project.name}</label>}/>;
    const popupContent = showableDefinitions.length > 0 ?
        <div>
            <div>

            <VStack>
                    {showableDefinitions.map((def, i) => {
                        return <ProjectLinkView key={i} project={project} def={def}/>
                    })}
                </VStack>
            </div>
        </div>
        : null;
    return <HoveringPopup {...popupProps} title={"Defined At"}
                          hoveredContent={hoveredContent} popupContent={popupContent}/>

}
