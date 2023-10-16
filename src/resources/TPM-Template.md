# Workflows

A workflow definition is a **task** with either #tpm/workflow_type/chain or #tpm/workflow_type/checkbox.

These are valid workflows.

- [ ] write_scripts #tpm/workflow_type/chain #tpm/step/write #tpm/step/revise #tpm/step/export
- [ ] card_design #tpm/workflow_type/checkbox #tpm/step/data #tpm/step/effect #tpm/step/art
- [ ] implementation #tpm/workflow_type/checkbox #tpm/step/impl #tpm/step/test

This cannot define a workflow, since it's not a task

- portrait_drawing #tpm/workflow_type/chain #tpm/step/draft #tpm/step/color

If a workflow is marked with both tags, the latter one is taken. This is a workflow of type checkbox.

- [ ] multi_workflow_type #tpm/workflow_type/chain #tpm/workflow_type/checkbox #tpm/step/art #tpm/step/data

If multiple names are given, the first will be chosen as the name. This workflow is named `multi-name`.

- [ ] &**.** `multi-name` multi_name2 #tpm/workflow_type/checkbox #tpm/step/art #tpm/step/data
  The special characters does not count.

# Tasks

Normally we want to use

- [ ] write preface #tpm/workflow/write_scripts #tpm/step/write #tpm/tag/prj_book
	- Editor says do not include spoilers
- [ ] card: warlock, normal attack #tpm/workflow/card_design #tpm/step/data #tpm/tag/prj_card
	- [ ] card warlock, fire magic #tpm/workflow/card_design #tpm/step/art #tpm/tag/abandoned
	- Note: The card needs to be as weak as possible.
- [ ] animations of drawing cards #tpm/step/impl #tpm/workflow/implementation #tpm/tag/prj_card
	- must be smooth
	- less than 1.5 sec
- [ ] python code to convert my script into ren'py format #tpm/workflow/implementation #tpm/tag/prj_book

This is not a valid task, because it has indentation after a non-list item.
- [ ] This is a not valid task #tpm/workflow/card_design

- A list item
	- [ ] A valid task under a list item #tpm/workflow/card_design #tpm/step/data #tpm/step/effect 


