import {App, Component, MarkdownRenderer} from "obsidian";

const templateMd = "# Workflows\n" +
    "A workflow definition is a **task** with either #iPm/workflow/chain or #iPm/workflow/checkbox. \n" +
    "\n" +
    "These are two workflows.\n" +
    "\n" +
    "- [ ] write_scripts #iPm/workflow/chain #iPm/step/write #iPm/step/revise #iPm/step/export\n" +
    "- [ ] card_design #iPm/workflow/checkbox #iPm/step/add_data #iPm/step/effect #iPm/step/art\n" +
    "\n" +
    "This cannot define a workflow, since it's not a task\n" +
    "- portrait_drawing #iPm/workflow/chain #iPm/step/draft #iPm/step/color\n" +
    "\n" +
    "If a workflow is marked with both tags, the latter one is taken. This is a workflow of type checkbox.\n" +
    "- [ ] multi_workflow_type #iPm/workflow/chain #iPm/workflow/checkbox #iPm/step/art #iPm/step/add_data \n" +
    "\n" +
    "If multiple names are given, the first will be chosen as the name. This workflow is named `multi_name`.\n" +
    "- [ ] multi_name multi_name2 #iPm/workflow/checkbox #iPm/step/art #iPm/step/add_data \n" +
    "\n" +
    "# Tasks\n" +
    "- [ ] write preface #iPm/task_type/write_scripts #iPm/step/write \n" +
    "- [ ] card: warlock, normal attack #iPm/task_type/card_design #iPm/step/add_data \n" +
    "\t- [ ] card warlock, fire magic #iPm/task_type/card_design #iPm/step/art #iPm/tag/abandoned\n" +
    "\n" +
    "This is not a valid task, because it has indentation after a non-list item.\n" +
    "    - [ ] This is a not valid task #iPm/task_type/card_design \n" +
    "\n" +
    "- A list item\n" +
    "\t- [ ] A valid task under a list item #iPm/task_type/card_design \n" +
    "\n" +
    "\n";

export async function renderTemplate(app: App, el: HTMLElement) {
    const compo = new Component()
    return await MarkdownRenderer.render(app, templateMd, el, "", compo);
}
