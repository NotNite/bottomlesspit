import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  PluginSpec,
  PluginValue,
  ViewPlugin,
  ViewUpdate
} from "@codemirror/view";
import { Task, getTasks } from "./task";
import BottomlessPit from "./main";
import * as chrono from "chrono-node";
import { formatRelativeTime } from "./date";

/*class AnnotationWidget extends WidgetType {
  private annotation: Annotation;

  constructor(annotation: Annotation) {
    super();
    this.annotation = annotation;
  }

  toDOM(view: EditorView): HTMLElement {
    const span = document.createElement("span");
    span.addClass("bottomlesspit-annotation");
    span.setText(`${this.annotation.key}: ${this.annotation.value}`);
    return span;
  }
}*/

class AnnotationPlugin implements PluginValue {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = this.buildDecorations(view);
  }

  update(update: ViewUpdate) {
    this.decorations = this.buildDecorations(update.view);
  }

  destroy() {}

  buildDecorations(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();

    // HACK
    const plugin = BottomlessPit.instance;
    const tasks = getTasks(plugin, view.state.doc.toString());

    const alreadyDoneTasks: Task[] = [];

    for (const { from, to } of view.visibleRanges) {
      syntaxTree(view.state).iterate({
        from,
        to,
        enter(node) {
          const task = tasks.find((t) => t.position.start.offset === node.from);

          if (task != null) {
            if (alreadyDoneTasks.includes(task)) return;
            alreadyDoneTasks.push(task);

            // sort by offset (lowest first) so it doesn't get mad
            const annotations = task.annotations.sort(
              (a, b) => a.offset - b.offset
            );

            for (const annotation of annotations) {
              const offset = task.position.start.offset + annotation.offset;

              let title = "";
              if (annotation.key === "due") {
                try {
                  const date = chrono.parseDate(annotation.value);
                  title = formatRelativeTime(date);
                } catch (e) {
                  console.error(e);
                }
              }

              builder.add(
                offset,
                offset + annotation.length,
                Decoration.mark({
                  attributes: {
                    class: "bottomlesspit-annotation",
                    title
                  }
                })
                /*Decoration.replace({
                  widget: new AnnotationWidget(annotation)
                })*/
              );
            }
          }
        }
      });
    }

    return builder.finish();
  }
}

const pluginSpec: PluginSpec<AnnotationPlugin> = {
  decorations: (value: AnnotationPlugin) => value.decorations
};

export const annotationPlugin = ViewPlugin.fromClass(
  AnnotationPlugin,
  pluginSpec
);
