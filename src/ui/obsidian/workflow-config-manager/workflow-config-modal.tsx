import { App, Modal, Notice, TFile } from 'obsidian';
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { WorkflowConfigEditor } from './workflow-config-editor';
import OdaPmToolPlugin from '../../../main';

export const DEFAULT_CONFIG_FILE_NAME = 'tag-project-config.md';

export interface WorkflowConfig {
    name: string;
    type: 'chain' | 'checkbox';
    steps: string[];
    project?: string;
}

/**
 * Modal for managing workflow configurations
 */
export class WorkflowConfigModal extends Modal {
    root: Root | null = null;
    plugin: OdaPmToolPlugin;

    constructor(app: App, plugin: OdaPmToolPlugin) {
        super(app);
        this.plugin = plugin;
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: 'Workflow Configuration Manager' });

        // Create React root and render the editor
        this.root = createRoot(contentEl);
        this.root.render(
            <WorkflowConfigEditor
                app={this.app}
                plugin={this.plugin}
                onClose={() => this.close()}
            />
        );
    }

    onClose() {
        const { contentEl } = this;
        if (this.root) {
            this.root.unmount();
            this.root = null;
        }
        contentEl.empty();
    }
}

/**
 * Get or create the default config file
 */
export async function getOrCreateConfigFile(app: App): Promise<TFile> {
    const configPath = DEFAULT_CONFIG_FILE_NAME;
    let configFile = app.vault.getAbstractFileByPath(configPath);

    if (!configFile || !(configFile instanceof TFile)) {
        // Create the config file with a template
        const templateContent = `# Tag Project Configuration

This file contains your workflow definitions. You can edit them using the Workflow Configuration Manager or manually.

## Example Workflows

### Example Chain Workflow
- [ ] example_chain #tpm/workflow_type/chain #tpm/step/todo #tpm/step/doing #tpm/step/done

### Example Checkbox Workflow  
- [ ] example_checkbox #tpm/workflow_type/checkbox #tpm/step/design #tpm/step/implement #tpm/step/test

---

## Your Workflows

Add your workflow definitions below:

`;
        configFile = await app.vault.create(configPath, templateContent);
        new Notice(`Created configuration file: ${configPath}`);
    }

    return configFile as TFile;
}

/**
 * Parse workflow definitions from markdown content
 */
export function parseWorkflowsFromMarkdown(content: string): WorkflowConfig[] {
    const workflows: WorkflowConfig[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
        // Match workflow definition pattern: - [ ] name #tpm/workflow_type/xxx #tpm/step/xxx ...
        const match = line.match(/^-\s*\[\s*\]\s+(\S+)\s+(.*)/);
        if (!match) continue;

        const [, name, tagsString] = match;
        const tags = tagsString.match(/#[\w/-]+/g) || [];

        // Find workflow type
        const typeTag = tags.find(tag => tag.startsWith('#tpm/workflow_type/'));
        if (!typeTag) continue;

        const type = typeTag.replace('#tpm/workflow_type/', '') as 'chain' | 'checkbox';

        // Find steps
        const steps = tags
            .filter(tag => tag.startsWith('#tpm/step/'))
            .map(tag => tag.replace('#tpm/step/', ''));

        // Find project (optional)
        const projectTag = tags.find(tag => tag.startsWith('#prj/'));
        const project = projectTag ? projectTag.replace('#prj/', '') : undefined;

        if (steps.length > 0) {
            workflows.push({ name, type, steps, project });
        }
    }

    return workflows;
}

/**
 * Convert workflow config to markdown format
 */
export function workflowToMarkdown(workflow: WorkflowConfig): string {
    const stepTags = workflow.steps.map(step => `#tpm/step/${step}`).join(' ');
    const projectTag = workflow.project ? ` #prj/${workflow.project}` : '';
    return `- [ ] ${workflow.name} #tpm/workflow_type/${workflow.type} ${stepTags}${projectTag}`;
}

/**
 * Add a workflow to the config file
 */
export async function addWorkflowToConfig(
    app: App,
    workflow: WorkflowConfig
): Promise<void> {
    const configFile = await getOrCreateConfigFile(app);
    const content = await app.vault.read(configFile);

    // Check if workflow already exists
    const existing = parseWorkflowsFromMarkdown(content);
    if (existing.some(w => w.name === workflow.name)) {
        throw new Error(`Workflow "${workflow.name}" already exists. Please use a different name.`);
    }

    // Add the workflow at the end
    const newLine = workflowToMarkdown(workflow);
    const updatedContent = content.trim() + '\n' + newLine + '\n';

    await app.vault.modify(configFile, updatedContent);
    new Notice(`Added workflow: ${workflow.name}`);
}

/**
 * Update a workflow in the config file
 */
export async function updateWorkflowInConfig(
    app: App,
    oldName: string,
    newWorkflow: WorkflowConfig
): Promise<void> {
    const configFile = await getOrCreateConfigFile(app);
    const content = await app.vault.read(configFile);
    const lines = content.split('\n');

    let updated = false;
    const newLines = lines.map(line => {
        // Find the line with the old workflow name
        const match = line.match(/^-\s*\[\s*\]\s+(\S+)\s+/);
        if (match && match[1] === oldName) {
            updated = true;
            return workflowToMarkdown(newWorkflow);
        }
        return line;
    });

    if (!updated) {
        throw new Error(`Workflow "${oldName}" not found.`);
    }

    await app.vault.modify(configFile, newLines.join('\n'));
    new Notice(`Updated workflow: ${newWorkflow.name}`);
}

/**
 * Delete a workflow from the config file
 */
export async function deleteWorkflowFromConfig(
    app: App,
    workflowName: string
): Promise<void> {
    const configFile = await getOrCreateConfigFile(app);
    const content = await app.vault.read(configFile);
    const lines = content.split('\n');

    const newLines = lines.filter(line => {
        const match = line.match(/^-\s*\[\s*\]\s+(\S+)\s+/);
        return !match || match[1] !== workflowName;
    });

    await app.vault.modify(configFile, newLines.join('\n'));
    new Notice(`Deleted workflow: ${workflowName}`);
}
