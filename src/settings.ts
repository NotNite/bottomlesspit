import { PluginSettingTab, Setting } from "obsidian";
import BottomlessPit from "./main";

export interface Settings {
  defaultPriority: number | null;
  markChildrenComplete: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  defaultPriority: null,
  markChildrenComplete: false
};

export class SettingsTab extends PluginSettingTab {
  plugin: BottomlessPit;

  constructor(plugin: BottomlessPit) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Default priority")
      .setDesc(
        "What to use when no priority is specified - empty for no priority"
      )
      .addText((text) => {
        text
          .setPlaceholder("Enter a number")
          .setValue(this.plugin.settings.defaultPriority?.toString() ?? "")
          .onChange(async (value) => {
            this.plugin.settings.defaultPriority = parseInt(value);
            if (isNaN(this.plugin.settings.defaultPriority)) {
              this.plugin.settings.defaultPriority = null;
            }
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Automatically mark children as complete")
      .setDesc(
        "When marking a parent as complete, mark its children as complete too"
      )
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.markChildrenComplete)
          .onChange(async (value) => {
            this.plugin.settings.markChildrenComplete = value;
            await this.plugin.saveSettings();
          });
      });
  }
}
