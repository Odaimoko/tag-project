import {OdaPmProject, OdaPmProjectDefinition} from "../../data-model/OdaPmProject";
import React, {MouseEvent, useContext} from "react";
import {PluginContext} from "../obsidian/manage-page-view";
import {ClickableIconView, InternalLinkView} from "../pure-react/view-template/icon-view";
import {iconViewAsAWholeStyle} from "./style-def";
import {openProjectPrecisely} from "../../utils/io-util";
import {VStack} from "../pure-react/view-template/h-stack";
import {HoveringPopup, usePopup} from "../pure-react/view-template/hovering-popup";
import {getForceNewTabOnClick} from "../../settings/settings";

export const IconName_Project = "folder";

function ProjectLinkView(props: {
    project: OdaPmProject,
    def: OdaPmProjectDefinition
}) {
    const plugin = useContext(PluginContext);
    return <InternalLinkView style={iconViewAsAWholeStyle} onIconClicked={openProject}
                             onContentClicked={openProject}
                             content={<label style={{whiteSpace: "nowrap"}}>{props.def.getLinkText()}</label>}/>

    function openProject(e: MouseEvent) {
        const forceNewTab = getForceNewTabOnClick(plugin, e);
        openProjectPrecisely(props.project, props.def, plugin.app.workspace, forceNewTab);
    }
}

export function ProjectView(props: {
    project: OdaPmProject | null,
    style?: React.CSSProperties
}) {
    if (props.project === null) return <></>;
    const project = props.project;
    const popupProps = usePopup("none");

    function toggleDropdown() {
        // toggleDropDown(setDropDownDisplay)
    }

    const showableDefinitions = project.projectDefinitions.filter(k => k.type !== "system");
    const projectContent = <label>{project.name}</label>;
    const hoveredContent = <ClickableIconView onContentClicked={toggleDropdown} onIconClicked={toggleDropdown}
                                              iconName={IconName_Project}
                                              content={projectContent} clickable={showableDefinitions.length > 0}/>;
    // if showableDefinitions.length === 0, we don't show the popup
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
