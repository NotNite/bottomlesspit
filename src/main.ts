import { Editor, MarkdownView, Plugin } from "obsidian";
import { DEFAULT_SETTINGS, SettingsTab, Settings } from "./settings";
import { getTasks, getTaskOnCursor, rollTasks } from "./task";
import { StatusBar } from "./bar";
import { annotationPlugin } from "./editor";

type QueuedEvent = () => void;

export default class BottomlessPit extends Plugin {
  static instance: BottomlessPit;

  private safe = true;
  queued: QueuedEvent | null = null;

  settings: Settings;
  statusBar: StatusBar;

  async onload() {
    BottomlessPit.instance = this;

    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.addSettingTab(new SettingsTab(this));

    this.statusBar = new StatusBar(this, this.addStatusBarItem());
    this.statusBar.update();

    this.registerCommands();
    this.registerEvents();

    this.registerEditorExtension([annotationPlugin]);
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private registerCommands() {
    this.addCommand({
      id: "roll-task",
      name: "Roll task",
      hotkeys: [{ modifiers: ["Alt"], key: "r" }],
      editorCallback: (editor: Editor, view: MarkdownView) => {
        const tasks = getTasks(this, view.data);
        const task = rollTasks(tasks);
        if (task != null) task.jumpTo(view);
      }
    });

    this.addCommand({
      id: "toggle-task",
      name: "Toggle current task",
      hotkeys: [{ modifiers: ["Alt"], key: "t" }],
      editorCallback: (editor: Editor, view: MarkdownView) => {
        if (this.safe) {
          this.toggleCurrentTask(editor, view);
        } else {
          this.queued = () => this.toggleCurrentTask(editor, view);
          view.save();
        }
      }
    });
  }

  private registerEvents() {
    this.registerEvent(
      this.app.vault.on("modify", () => {
        this.statusBar.update();
      })
    );

    this.registerEvent(
      this.app.workspace.on("editor-change", (editor) => {
        this.statusBar.update();
      })
    );

    this.registerEvent(
      this.app.metadataCache.on("changed", () => {
        this.safe = true;
        this.queued?.();
        this.queued = null;
        this.statusBar.update();
      })
    );
  }

  private toggleCurrentTask(editor: Editor, view: MarkdownView) {
    const tasks = getTasks(this, view.data);
    const task = getTaskOnCursor(tasks, editor.getCursor());
    if (task != null) {
      /*const children = getChildren(tasks, task);
      const enabled = task.toggle(view);
      if (enabled && this.settings.markChildrenComplete) {
        for (const child of children) child.set(view, true);
      }*/
      task.toggle(view);
    }
  }

  get unsafe() {
    return !this.safe;
  }
}
