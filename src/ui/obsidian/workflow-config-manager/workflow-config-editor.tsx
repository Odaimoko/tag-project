import React, { useState, useEffect } from 'react';
import { App, Notice } from 'obsidian';
import OdaPmToolPlugin from '../../../main';
import {
    WorkflowConfig,
    parseWorkflowsFromMarkdown,
    addWorkflowToConfig,
    updateWorkflowInConfig,
    deleteWorkflowFromConfig,
    getOrCreateConfigFile,
    DEFAULT_CONFIG_FILE_NAME
} from './workflow-config-modal';
import { VStack } from '../../pure-react/view-template/h-stack';
import { Evt_ReqDbReload } from '../../../typing/dataview-event';

interface WorkflowFormData {
    name: string;
    type: 'chain' | 'checkbox';
    steps: string;
    project: string;
}

export function WorkflowConfigEditor({
    app,
    plugin,
    onClose
}: {
    app: App;
    plugin: OdaPmToolPlugin;
    onClose: () => void;
}) {
    const [workflows, setWorkflows] = useState<WorkflowConfig[]>([]);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [formData, setFormData] = useState<WorkflowFormData>({
        name: '',
        type: 'chain',
        steps: '',
        project: ''
    });
    const [isLoading, setIsLoading] = useState(false);

    // Load workflows from config file
    useEffect(() => {
        loadWorkflows();
    }, []);

    async function loadWorkflows() {
        try {
            const configFile = await getOrCreateConfigFile(app);
            const content = await app.vault.read(configFile);
            const parsed = parseWorkflowsFromMarkdown(content);
            setWorkflows(parsed);
        } catch (error) {
            console.error('Failed to load workflows:', error);
            new Notice('Failed to load workflow configurations');
        }
    }

    function resetForm() {
        setFormData({
            name: '',
            type: 'chain',
            steps: '',
            project: ''
        });
        setEditingIndex(null);
    }

    function handleEdit(index: number) {
        const workflow = workflows[index];
        setFormData({
            name: workflow.name,
            type: workflow.type,
            steps: workflow.steps.join(', '),
            project: workflow.project || ''
        });
        setEditingIndex(index);
    }

    async function handleSave() {
        if (!formData.name.trim()) {
            new Notice('Workflow name is required');
            return;
        }

        if (!formData.steps.trim()) {
            new Notice('At least one step is required');
            return;
        }

        // Validate name (should be a valid tag)
        if (!/^[\w-]+$/.test(formData.name)) {
            new Notice('Workflow name can only contain letters, numbers, hyphens, and underscores');
            return;
        }

        setIsLoading(true);

        try {
            const steps = formData.steps
                .split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0);

            const workflow: WorkflowConfig = {
                name: formData.name,
                type: formData.type,
                steps,
                project: formData.project.trim() || undefined
            };

            if (editingIndex !== null) {
                // Update existing workflow
                const oldName = workflows[editingIndex].name;
                await updateWorkflowInConfig(app, oldName, workflow);
            } else {
                // Add new workflow
                await addWorkflowToConfig(app, workflow);
            }

            // Reload workflows and reset form
            await loadWorkflows();
            resetForm();

            // Trigger database reload to reflect changes
            plugin.getEmitter().emit(Evt_ReqDbReload);

        } catch (error) {
            console.error('Failed to save workflow:', error);
            new Notice(error.message || 'Failed to save workflow');
        } finally {
            setIsLoading(false);
        }
    }

    async function handleDelete(index: number) {
        const workflow = workflows[index];
        
        // Confirm deletion
        const confirmed = await new Promise<boolean>((resolve) => {
            const modal = new (class extends app.workspace.modalClass {
                onOpen() {
                    const { contentEl } = this;
                    contentEl.createEl('h2', { text: 'Confirm Deletion' });
                    contentEl.createEl('p', { 
                        text: `Are you sure you want to delete workflow "${workflow.name}"?` 
                    });
                    
                    const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
                    
                    const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
                    cancelBtn.onclick = () => {
                        resolve(false);
                        this.close();
                    };
                    
                    const deleteBtn = buttonContainer.createEl('button', { 
                        text: 'Delete',
                        cls: 'mod-warning'
                    });
                    deleteBtn.onclick = () => {
                        resolve(true);
                        this.close();
                    };
                }
            })(app);
            modal.open();
        });

        if (!confirmed) return;

        setIsLoading(true);

        try {
            await deleteWorkflowFromConfig(app, workflow.name);
            await loadWorkflows();
            
            // If we were editing this workflow, reset the form
            if (editingIndex === index) {
                resetForm();
            }

            // Trigger database reload
            plugin.getEmitter().emit(Evt_ReqDbReload);

        } catch (error) {
            console.error('Failed to delete workflow:', error);
            new Notice('Failed to delete workflow');
        } finally {
            setIsLoading(false);
        }
    }

    function handleOpenConfigFile() {
        app.workspace.openLinkText(DEFAULT_CONFIG_FILE_NAME, '', false);
    }

    return (
        <div style={{ padding: '10px', maxHeight: '70vh', overflow: 'auto' }}>
            <VStack spacing={20}>
                {/* Info section */}
                <div style={{
                    padding: '12px',
                    backgroundColor: 'var(--background-secondary)',
                    borderRadius: '6px',
                    fontSize: '0.9em'
                }}>
                    <p style={{ margin: '0 0 8px 0' }}>
                        Workflows are automatically saved to <code>{DEFAULT_CONFIG_FILE_NAME}</code>
                    </p>
                    <button 
                        onClick={handleOpenConfigFile}
                        style={{
                            padding: '4px 12px',
                            fontSize: '0.85em'
                        }}
                    >
                        Open Config File
                    </button>
                </div>

                {/* Form section */}
                <div style={{
                    padding: '16px',
                    backgroundColor: 'var(--background-secondary)',
                    borderRadius: '6px'
                }}>
                    <h3 style={{ marginTop: 0 }}>
                        {editingIndex !== null ? 'Edit Workflow' : 'Create New Workflow'}
                    </h3>

                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                            Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., my_workflow"
                            style={{ width: '100%', padding: '6px' }}
                            disabled={isLoading}
                        />
                        <small style={{ color: 'var(--text-muted)' }}>
                            Use letters, numbers, hyphens, and underscores only
                        </small>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                            Type *
                        </label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value as 'chain' | 'checkbox' })}
                            style={{ width: '100%', padding: '6px' }}
                            disabled={isLoading}
                        >
                            <option value="chain">Chain (sequential steps)</option>
                            <option value="checkbox">Checkbox (independent steps)</option>
                        </select>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                            Steps *
                        </label>
                        <input
                            type="text"
                            value={formData.steps}
                            onChange={(e) => setFormData({ ...formData, steps: e.target.value })}
                            placeholder="e.g., todo, doing, done"
                            style={{ width: '100%', padding: '6px' }}
                            disabled={isLoading}
                        />
                        <small style={{ color: 'var(--text-muted)' }}>
                            Comma-separated list of step names
                        </small>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                            Project (optional)
                        </label>
                        <input
                            type="text"
                            value={formData.project}
                            onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                            placeholder="e.g., my_project"
                            style={{ width: '100%', padding: '6px' }}
                            disabled={isLoading}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: 'var(--interactive-accent)',
                                color: 'var(--text-on-accent)',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: isLoading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isLoading ? 'Saving...' : editingIndex !== null ? 'Update' : 'Create'}
                        </button>
                        
                        {editingIndex !== null && (
                            <button
                                onClick={resetForm}
                                disabled={isLoading}
                                style={{ padding: '8px 16px' }}
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </div>

                {/* Workflows list */}
                <div>
                    <h3>Existing Workflows ({workflows.length})</h3>
                    {workflows.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            No workflows yet. Create your first one above!
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {workflows.map((workflow, index) => (
                                <div
                                    key={index}
                                    style={{
                                        padding: '12px',
                                        backgroundColor: editingIndex === index 
                                            ? 'var(--background-modifier-hover)' 
                                            : 'var(--background-secondary)',
                                        borderRadius: '6px',
                                        border: editingIndex === index 
                                            ? '2px solid var(--interactive-accent)' 
                                            : '1px solid var(--background-modifier-border)'
                                    }}
                                >
                                    <div style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        marginBottom: '8px'
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <strong style={{ fontSize: '1.1em' }}>{workflow.name}</strong>
                                            <span style={{
                                                marginLeft: '8px',
                                                padding: '2px 8px',
                                                backgroundColor: workflow.type === 'chain' 
                                                    ? 'var(--color-blue)' 
                                                    : 'var(--color-green)',
                                                color: 'white',
                                                borderRadius: '4px',
                                                fontSize: '0.8em'
                                            }}>
                                                {workflow.type}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button
                                                onClick={() => handleEdit(index)}
                                                disabled={isLoading}
                                                style={{
                                                    padding: '4px 12px',
                                                    fontSize: '0.85em'
                                                }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(index)}
                                                disabled={isLoading}
                                                style={{
                                                    padding: '4px 12px',
                                                    fontSize: '0.85em',
                                                    backgroundColor: 'var(--color-red)',
                                                    color: 'white'
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.9em', color: 'var(--text-muted)' }}>
                                        <div>
                                            <strong>Steps:</strong> {workflow.steps.join(' → ')}
                                        </div>
                                        {workflow.project && (
                                            <div>
                                                <strong>Project:</strong> {workflow.project}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </VStack>
        </div>
    );
}
