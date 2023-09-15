import { EditorPosition, MarkdownView, Pos } from "obsidian";
import BottomlessPit from "./main";
import * as chrono from "chrono-node";

const taskCheck = /\[(.)\]/;
const task = /(-|\*)\s+(.*)/g;

// optionally allow values in quotes for whitespace
const taskAnnotation = /%(?<key>[^=\s]+)=(?<value>(?:[^"\s]+)|(?:"[^"]+"))/g;
type TaskAnnotation = { key: string; value: string };

export class Annotation {
  private match: RegExpMatchArray;
  private segment: string;
  private segmentPos: Pos;

  key: string;
  value: string;

  offset: number;
  length: number;

  constructor(match: RegExpMatchArray, segment: string, segmentPos: Pos) {
    this.match = match;
    this.segment = segment;
    this.segmentPos = segmentPos;

    const { key, value } = match.groups as TaskAnnotation;
    this.key = key;
    this.value = value;

    this.offset = match.index ?? 0;
    this.length = match[0].length;
  }
}

function offsetToPos(data: string, start: number, end: number): Pos {
  return {
    start: {
      line: data.substring(0, start).split("\n").length - 1,
      col: start - data.lastIndexOf("\n", start - 1) - 1,
      offset: start
    },
    end: {
      line: data.substring(0, end).split("\n").length - 1,
      col: end - data.lastIndexOf("\n", end - 1) - 1,
      offset: end
    }
  };
}

export class Task {
  private plugin: BottomlessPit;
  readonly annotations: Annotation[] = [];

  position: Pos;
  completed: boolean;

  priority: number | null = null;
  due: Date | null = null;
  done: Date | null = null;

  constructor(plugin: BottomlessPit, data: string, pos: Pos) {
    this.plugin = plugin;
    this.position = pos;

    const segment = data.substring(
      this.position.start.offset,
      this.position.end.offset
    );
    const match = segment.match(taskCheck);
    this.completed = match != null && match[1] !== " ";

    const matches = [...segment.matchAll(taskAnnotation)];
    for (const match of matches) {
      if (match.groups == null) continue;

      const annotation = new Annotation(match, segment, this.position);
      this.annotations.push(annotation);

      switch (annotation.key) {
        case "prio": {
          this.priority = parseInt(annotation.value);
          break;
        }

        case "due": {
          try {
            this.due = chrono.parseDate(annotation.value);
          } catch (e) {
            console.error(e);
          }
          break;
        }

        case "done": {
          try {
            this.done = chrono.parseDate(annotation.value);
          } catch (e) {
            console.error(e);
          }
          break;
        }
      }
    }

    if (this.priority == null || isNaN(this.priority)) {
      this.priority = this.plugin.settings.defaultPriority;
    }
  }

  jumpTo(view: MarkdownView) {
    view.editor.setCursor({
      line: this.position.start.line,
      ch: this.position.start.col
    });
  }

  set(view: MarkdownView, value: boolean) {
    let segment = view.data.substring(
      this.position.start.offset,
      this.position.end.offset
    );
    segment = segment.replace(taskCheck, `[${value ? "x" : " "}]`);

    const doneStr = `%done="${new Date().toISOString()}"`;
    const done = this.annotations.find((a) => a.key === "done");

    if (value) {
      if (done != null) {
        const before = segment.substring(0, done.offset);
        const after = segment.substring(done.offset + done.length);
        segment = before + " " + doneStr + after;
      } else {
        segment += " " + doneStr;
      }
    } else if (done != null) {
      const before = segment.substring(0, done.offset);
      const after = segment.substring(done.offset + done.length);
      segment = (before + after).trim();
    }

    view.editor.replaceRange(
      segment,
      {
        line: this.position.start.line,
        ch: this.position.start.col
      },
      {
        line: this.position.end.line,
        ch: this.position.end.col
      }
    );
    view.save();
  }

  toggle(view: MarkdownView): boolean {
    this.completed = !this.completed;
    this.set(view, this.completed);
    return this.completed;
  }

  doneOn(date: Date): boolean {
    if (this.done == null) return false;
    return (
      this.done.getFullYear() === date.getFullYear() &&
      this.done.getMonth() === date.getMonth() &&
      this.done.getDate() === date.getDate()
    );
  }
}

export function getTaskOnCursor(
  tasks: Task[],
  pos: EditorPosition
): Task | null {
  for (const task of tasks) {
    const inCursor = pos.line === task.position.start.line;
    if (inCursor) {
      //console.log(task);
      return task;
    }
  }

  return null;
}

/*export function getChildren(tasks: Task[], rootTask: Task): Task[] {
  const result: Task[] = [];

  for (const task of tasks) {
    let current: Task | null = task;

    while (current != null) {
      if (current.parent === rootTask.position.start.line) {
        result.push(current);
        break;
      }

      current =
        tasks.find((t) => t.position.start.line === current?.parent) ?? null;
    }
  }

  return result;
}*/

export function getTasks(plugin: BottomlessPit, data: string): Task[] {
  const result = [];
  const matches = [...data.matchAll(task)];

  for (const match of matches) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    result.push(new Task(plugin, data, offsetToPos(data, start, end)));
  }

  return result;
}

export function rollTasks(tasks: Task[]): Task | null {
  if (tasks.length === 0) return null;

  // Lower priority is better, so let's invert it
  const maxPriority = Math.max(...tasks.map((t) => t.priority ?? 0));
  const bag = [];

  for (const task of tasks) {
    if (task.priority == null) continue;
    const bagCount = maxPriority - (task.priority ?? 0) + 1;
    for (let i = 0; i < bagCount; i++) {
      bag.push(task);
    }
  }

  if (bag.length === 0) return null;
  const index = Math.floor(Math.random() * bag.length);
  return bag[index];
}
