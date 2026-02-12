import React, { useState } from 'react';
import { App, Modal, Notice } from 'obsidian';
import { createRoot, Root } from 'react-dom/client';
import OdaPmToolPlugin from '../../../main';
import { VStack, HStack } from '../../pure-react/view-template/h-stack';
import { WorkflowConfig, addWorkflowToConfig, getOrCreateConfigFile } from './workflow-config-modal';

interface OnboardingStep {
    title: string;
    description: string;
    component?: React.ReactNode;
}

/**
 * Onboarding wizard to help new users get started quickly
 */
export class OnboardingWizard extends Modal {
    root: Root | null = null;
    plugin: OdaPmToolPlugin;

    constructor(app: App, plugin: OdaPmToolPlugin) {
        super(app);
        this.plugin = plugin;
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('tag-project-onboarding');

        // Create React root and render the wizard
        this.root = createRoot(contentEl);
        this.root.render(
            <OnboardingWizardContent
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

function OnboardingWizardContent({
    app,
    plugin,
    onClose
}: {
    app: App;
    plugin: OdaPmToolPlugin;
    onClose: () => void;
}) {
    const [currentStep, setCurrentStep] = useState(0);
    const [quickWorkflows, setQuickWorkflows] = useState<{
        development: boolean;
        research: boolean;
        review: boolean;
    }>({
        development: false,
        research: false,
        review: false
    });

    const steps: OnboardingStep[] = [
        {
            title: 'Welcome to Tag Project! 🎉',
            description: 'This quick wizard will help you set up your first workflows in minutes.',
        },
        {
            title: 'What is a Workflow?',
            description: 'A workflow is a template that defines the steps a task goes through. For example, a development workflow might have steps like: todo → doing → done.',
        },
        {
            title: 'Quick Start: Choose Templates',
            description: 'Select some common workflows to get started. You can customize or add more later.',
        },
    ];

    async function handleFinish() {
        const workflowsToCreate: WorkflowConfig[] = [];

        if (quickWorkflows.development) {
            workflowsToCreate.push({
                name: 'development',
                type: 'chain',
                steps: ['todo', 'doing', 'review', 'done']
            });
        }

        if (quickWorkflows.research) {
            workflowsToCreate.push({
                name: 'research',
                type: 'chain',
                steps: ['identify', 'investigate', 'summarize', 'apply']
            });
        }

        if (quickWorkflows.review) {
            workflowsToCreate.push({
                name: 'review',
                type: 'checkbox',
                steps: ['content', 'grammar', 'formatting', 'accuracy']
            });
        }

        if (workflowsToCreate.length === 0) {
            new Notice('No workflows selected. You can create them later from the Manage Workflows button.');
            onClose();
            return;
        }

        try {
            // Ensure config file exists
            await getOrCreateConfigFile(app);

            // Add all selected workflows
            for (const workflow of workflowsToCreate) {
                await addWorkflowToConfig(app, workflow);
            }

            new Notice(`Created ${workflowsToCreate.length} workflow(s)! Open the Manage Page to start using them.`);
            
            // Reload database to reflect new workflows
            plugin.getEmitter().emit('tpm-db-reload-req');
            
            onClose();
            
            // Optionally open the manage page
            setTimeout(() => {
                plugin.activateManagePageView();
            }, 500);

        } catch (error) {
            console.error('Failed to create workflows:', error);
            new Notice('Failed to create workflows. Please try again or create them manually.');
        }
    }

    function renderStepContent() {
        switch (currentStep) {
            case 0:
                return (
                    <VStack spacing={16}>
                        <p style={{ fontSize: '1.1em', lineHeight: 1.6 }}>
                            Tag Project helps you organize tasks across your entire vault using tags and workflows.
                        </p>
                        <div style={{
                            padding: '16px',
                            backgroundColor: 'var(--background-secondary)',
                            borderRadius: '8px',
                            borderLeft: '4px solid var(--interactive-accent)'
                        }}>
                            <p style={{ margin: 0, fontStyle: 'italic' }}>
                                "Write tasks anywhere, manage them in one place."
                            </p>
                        </div>
                    </VStack>
                );

            case 1:
                return (
                    <VStack spacing={16}>
                        <div style={{
                            padding: '16px',
                            backgroundColor: 'var(--background-secondary)',
                            borderRadius: '8px'
                        }}>
                            <h4 style={{ marginTop: 0 }}>Example: Development Workflow</h4>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '12px'
                            }}>
                                {['todo', 'doing', 'review', 'done'].map((step, index) => (
                                    <React.Fragment key={step}>
                                        <div style={{
                                            padding: '8px 16px',
                                            backgroundColor: 'var(--interactive-accent)',
                                            color: 'var(--text-on-accent)',
                                            borderRadius: '6px',
                                            fontWeight: 'bold'
                                        }}>
                                            {step}
                                        </div>
                                        {index < 3 && <span style={{ fontSize: '1.2em' }}>→</span>}
                                    </React.Fragment>
                                ))}
                            </div>
                            <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--text-muted)' }}>
                                Tasks move through these steps sequentially, giving you clear visibility of progress.
                            </p>
                        </div>

                        <p>
                            You can create two types of workflows:
                        </p>
                        <ul style={{ paddingLeft: '24px' }}>
                            <li><strong>Chain:</strong> Steps are completed sequentially (todo → doing → done)</li>
                            <li><strong>Checkbox:</strong> Steps can be completed in any order</li>
                        </ul>
                    </VStack>
                );

            case 2:
                return (
                    <VStack spacing={16}>
                        <p>Select one or more workflow templates to get started:</p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <label style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px',
                                padding: '16px',
                                backgroundColor: 'var(--background-secondary)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                border: quickWorkflows.development
                                    ? '2px solid var(--interactive-accent)'
                                    : '2px solid transparent'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={quickWorkflows.development}
                                    onChange={(e) => setQuickWorkflows({
                                        ...quickWorkflows,
                                        development: e.target.checked
                                    })}
                                    style={{ marginTop: '4px' }}
                                />
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: '0 0 8px 0' }}>📝 Development Workflow</h4>
                                    <p style={{ margin: '0 0 8px 0', fontSize: '0.9em' }}>
                                        Steps: <code>todo</code> → <code>doing</code> → <code>review</code> → <code>done</code>
                                    </p>
                                    <p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)' }}>
                                        Perfect for tracking feature development, bug fixes, or any sequential work.
                                    </p>
                                </div>
                            </label>

                            <label style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px',
                                padding: '16px',
                                backgroundColor: 'var(--background-secondary)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                border: quickWorkflows.research
                                    ? '2px solid var(--interactive-accent)'
                                    : '2px solid transparent'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={quickWorkflows.research}
                                    onChange={(e) => setQuickWorkflows({
                                        ...quickWorkflows,
                                        research: e.target.checked
                                    })}
                                    style={{ marginTop: '4px' }}
                                />
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: '0 0 8px 0' }}>🔍 Research Workflow</h4>
                                    <p style={{ margin: '0 0 8px 0', fontSize: '0.9em' }}>
                                        Steps: <code>identify</code> → <code>investigate</code> → <code>summarize</code> → <code>apply</code>
                                    </p>
                                    <p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)' }}>
                                        Great for research tasks, learning new topics, or investigation work.
                                    </p>
                                </div>
                            </label>

                            <label style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px',
                                padding: '16px',
                                backgroundColor: 'var(--background-secondary)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                border: quickWorkflows.review
                                    ? '2px solid var(--interactive-accent)'
                                    : '2px solid transparent'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={quickWorkflows.review}
                                    onChange={(e) => setQuickWorkflows({
                                        ...quickWorkflows,
                                        review: e.target.checked
                                    })}
                                    style={{ marginTop: '4px' }}
                                />
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: '0 0 8px 0' }}>✅ Review Workflow (Checkbox)</h4>
                                    <p style={{ margin: '0 0 8px 0', fontSize: '0.9em' }}>
                                        Steps: <code>content</code>, <code>grammar</code>, <code>formatting</code>, <code>accuracy</code>
                                    </p>
                                    <p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)' }}>
                                        Checkbox workflow for reviews where steps can be completed in any order.
                                    </p>
                                </div>
                            </label>
                        </div>

                        <div style={{
                            padding: '12px',
                            backgroundColor: 'var(--background-modifier-info)',
                            borderRadius: '6px',
                            fontSize: '0.9em'
                        }}>
                            💡 <strong>Tip:</strong> You can create custom workflows anytime using the "Manage Workflows" button.
                        </div>
                    </VStack>
                );

            default:
                return null;
        }
    }

    return (
        <div style={{ padding: '24px', minWidth: '500px', maxWidth: '700px' }}>
            <VStack spacing={24}>
                {/* Header */}
                <div>
                    <h2 style={{ margin: '0 0 8px 0' }}>{steps[currentStep].title}</h2>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                        {steps[currentStep].description}
                    </p>
                </div>

                {/* Progress indicator */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    {steps.map((_, index) => (
                        <div
                            key={index}
                            style={{
                                width: '40px',
                                height: '4px',
                                backgroundColor: index <= currentStep
                                    ? 'var(--interactive-accent)'
                                    : 'var(--background-modifier-border)',
                                borderRadius: '2px',
                                transition: 'background-color 0.3s ease'
                            }}
                        />
                    ))}
                </div>

                {/* Step content */}
                <div style={{ minHeight: '300px' }}>
                    {renderStepContent()}
                </div>

                {/* Navigation buttons */}
                <HStack spacing={12} style={{ justifyContent: 'space-between' }}>
                    <button
                        onClick={() => {
                            if (currentStep === 0) {
                                onClose();
                            } else {
                                setCurrentStep(currentStep - 1);
                            }
                        }}
                        style={{
                            padding: '10px 20px',
                            fontSize: '0.95em'
                        }}
                    >
                        {currentStep === 0 ? 'Skip' : 'Back'}
                    </button>

                    <button
                        onClick={() => {
                            if (currentStep === steps.length - 1) {
                                handleFinish();
                            } else {
                                setCurrentStep(currentStep + 1);
                            }
                        }}
                        style={{
                            padding: '10px 20px',
                            fontSize: '0.95em',
                            backgroundColor: 'var(--interactive-accent)',
                            color: 'var(--text-on-accent)',
                            fontWeight: 'bold'
                        }}
                    >
                        {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                    </button>
                </HStack>
            </VStack>
        </div>
    );
}
