import {App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting} from 'obsidian';
import {ExampleView, VIEW_TYPE_EXAMPLE} from "./Samples/exampleView";
import {ManagePageView, ManagePageViewId} from "./ManagePageView";


// Remember to rename these classes and interfaces!

interface OdaPmToolSettings {
    mySetting: string;
}

const DEFAULT_SETTINGS: OdaPmToolSettings = {
    mySetting: 'default'
}

// const Ep = ExamplePlugin;
// export default Ep;

export default class OdaPmToolPlugin extends Plugin {
    settings: OdaPmToolSettings;

    async onload() {
        console.log('loading plugin')

        await this.loadSettings();
        // region Ribbon integration
        // This creates an icon in the left ribbon.
        const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
            // Called when the user clicks the icon.
            new Notice('This is a notice!');
        });
        // Perform additional things with the ribbon
        ribbonIconEl.addClass('my-plugin-ribbon-class');
        // Oda: This adds a text to the ribbon icon
        // ribbonIconEl.createEl('span', {text: 'Ribbon Text'});
        //endregion


        // region Status Bar integration
        // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
        const statusBarItemEl = this.addStatusBarItem();
        statusBarItemEl.setText('Status Bar Text');
        // endregion

        // region Command Palette integration
        // This adds a simple command that can be triggered anywhere
        this.addCommand({
            id: 'open-sample-modal-simple',
            name: 'Open sample modal (simple)',
            callback: () => {
                new SampleModal(this.app).open();
            }
        });
        // This adds an editor command that can perform some operation on the current editor instance
        this.addCommand({
            id: 'sample-editor-command',
            name: 'Sample editor command',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                console.log(editor.getSelection());
                editor.replaceSelection('Sample Editor Command');
            }
        });
        // This adds a complex command that can check whether the current state of the app allows execution of the command
        this.addCommand({
            id: 'open-sample-modal-complex',
            name: 'Open sample modal (complex)',
            checkCallback: (checking: boolean) => {
                // Conditions to check
                const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (markdownView) {
                    // If checking is true, we're simply "checking" if the command can be run.
                    // If checking is false, then we want to actually perform the operation.
                    if (!checking) {
                        new SampleModal(this.app).open();
                    }

                    // This command will only show up in Command Palette when the check function returns true
                    return true;
                }
            }
        });
        // endregion

        // region Settings Tab integration
        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new SampleSettingTab(
            this.app,
            this));
        // endregion

        // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
        // Using this function will automatically remove the event listener when this plugin is disabled.
        this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
            // console.log('click', evt);
        });

        // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
        this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

        this.initExampleView();
        this.addRibbonIcon("arrow-big-left", "Print leaf types", () => {
            this.app.workspace.iterateAllLeaves((leaf) => {
                console.log(leaf.getViewState().type);
            });
        });
    }

    // region Example View integration
    private initExampleView() {
        this.registerView(
            ManagePageViewId,
            (leaf) => new ManagePageView(leaf, this)
        );

        this.addRibbonIcon("bell-plus", "Show Pm Window", () => {
            this.activateView();
        });
    }

    async activateView() {
        // Remove existing views.
        this.app.workspace.detachLeavesOfType(ManagePageViewId);

        await this.app.workspace.getRightLeaf(false).setViewState({
            type: ManagePageViewId,
            active: true,
        });

        this.app.workspace.revealLeaf(
            this.app.workspace.getLeavesOfType(ManagePageViewId)[0]
        );
    }

    // endregion
    onunload() {
        console.log('unloading plugin')
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class SampleModal extends Modal {
    constructor(app: App) {
        super(app);
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.setText('Woah!');
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}

class SampleSettingTab extends PluginSettingTab {
    plugin: OdaPmToolPlugin;

    constructor(app: App, plugin: OdaPmToolPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;

        containerEl.empty();
        const book = containerEl.createEl("div");
        book.createEl("div", {text: "How to Take Smart Notes"});
        book.createEl("small", {text: "Söne Ahrens"});

        new Setting(containerEl)
            .setName('Setting #1')
            .setDesc('It\'s a secret')
            .addText(text => text
                .setPlaceholder('Enter your secret')
                .setValue(this.plugin.settings.mySetting)
                .onChange(async (value) => {
                    this.plugin.settings.mySetting = value;
                    await this.plugin.saveSettings();
                }));
    }
}
