import { MarkdownView } from "obsidian";
import BottomlessPit from "./main";
import { getTasks } from "./task";

export class StatusBar {
  private plugin: BottomlessPit;
  private element: HTMLElement;

  constructor(plugin: BottomlessPit, element: HTMLElement) {
    this.plugin = plugin;
    this.element = element;
    this.element.addClass("bottomlesspit-bar");
  }

  update() {
    this.element.empty();

    const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (view == null) return;

    const tasks = getTasks(this.plugin, view.data);

    const lastSevenDays = [];
    for (let i = 7; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const completed = tasks.filter((t) => t.doneOn(date) && t.completed);
      lastSevenDays.push(completed.length);
    }

    const maxDone = Math.max(...lastSevenDays);
    const graphContainer = document.createElement("div");
    graphContainer.addClasses([
      "bottomlesspit-bar-item",
      "bottomlesspit-bar-graph"
    ]);

    for (const done of lastSevenDays) {
      const bar = document.createElement("div");
      bar.addClass("bottomlesspit-bar-graph-item");
      bar.style.height = `${(done / maxDone) * 100}%`;
      graphContainer.appendChild(bar);
    }

    this.element.appendChild(graphContainer);

    const doneToday = tasks.filter((t) => t.doneOn(new Date()) && t.completed);
    this.element.appendChild(this.makeItem(`${doneToday.length} today`));
  }

  private makeItem(text: string): HTMLElement {
    const item = document.createElement("span");
    item.setText(text);
    item.addClass("bottomlesspit-bar-item");
    return item;
  }
}
