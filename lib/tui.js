const readline = require("readline");

const ALT_SCREEN_ON = "\u001B[?1049h";
const ALT_SCREEN_OFF = "\u001B[?1049l";
const HIDE_CURSOR = "\u001B[?25l";
const SHOW_CURSOR = "\u001B[?25h";
const CLEAR_SCREEN = "\u001B[2J\u001B[H";

function chunkItems(items, selectedIndex, maxItems) {
  if (items.length <= maxItems) {
    return { start: 0, visible: items };
  }
  const half = Math.floor(maxItems / 2);
  let start = Math.max(0, selectedIndex - half);
  if (start + maxItems > items.length) {
    start = items.length - maxItems;
  }
  return {
    start,
    visible: items.slice(start, start + maxItems),
  };
}

class TerminalUI {
  constructor(stdin = process.stdin, stdout = process.stdout) {
    this.stdin = stdin;
    this.stdout = stdout;
    this.active = false;
    this.rawModeWasEnabled = false;
  }

  enter() {
    if (!this.stdin.isTTY || !this.stdout.isTTY) {
      throw new Error("callcli 需要在交互式终端中运行");
    }
    if (this.active) {
      return;
    }
    readline.emitKeypressEvents(this.stdin);
    this.rawModeWasEnabled = Boolean(this.stdin.isRaw);
    if (!this.rawModeWasEnabled) {
      this.stdin.setRawMode(true);
    }
    this.stdin.resume();
    this.stdout.write(`${ALT_SCREEN_ON}${HIDE_CURSOR}`);
    this.active = true;
  }

  leave() {
    if (!this.active) {
      return;
    }
    if (!this.rawModeWasEnabled && this.stdin.isRaw) {
      this.stdin.setRawMode(false);
    }
    this.stdin.pause();
    this.stdout.write(`${SHOW_CURSOR}${ALT_SCREEN_OFF}`);
    this.active = false;
  }

  getRows() {
    return this.stdout.rows || 24;
  }

  clear() {
    this.stdout.write(CLEAR_SCREEN);
  }

  renderScreen(title, descriptionLines, contentLines, footerLines) {
    const lines = [];
    lines.push(title);
    lines.push("");
    for (const line of descriptionLines || []) {
      lines.push(line);
    }
    if (descriptionLines && descriptionLines.length > 0) {
      lines.push("");
    }
    for (const line of contentLines || []) {
      lines.push(line);
    }
    if (footerLines && footerLines.length > 0) {
      lines.push("");
      for (const line of footerLines) {
        lines.push(line);
      }
    }
    this.clear();
    this.stdout.write(lines.join("\n"));
  }

  readKey() {
    return new Promise((resolve, reject) => {
      const onKeypress = (str, key) => {
        this.stdin.off("keypress", onKeypress);
        if (key && key.ctrl && key.name === "c") {
          reject(new Error("用户中断"));
          return;
        }
        resolve({ str, key: key || {} });
      };
      this.stdin.on("keypress", onKeypress);
    });
  }

  async message({ title, lines = [], actionLabel = "返回" }) {
    await this.select({
      title,
      description: lines,
      items: [{ label: actionLabel, value: "ok" }],
      canCancel: false,
    });
  }

  async confirm({ title, lines = [], confirmLabel = "确认", cancelLabel = "取消" }) {
    const result = await this.select({
      title,
      description: lines,
      items: [
        { label: confirmLabel, value: true },
        { label: cancelLabel, value: false },
      ],
      canCancel: true,
    });
    return Boolean(result);
  }

  async select({ title, description = [], items, canCancel = true, footer = [] }) {
    if (!items || items.length === 0) {
      throw new Error("select items 不能为空");
    }

    let index = 0;
    while (true) {
      const maxItems = Math.max(5, this.getRows() - description.length - footer.length - 8);
      const { start, visible } = chunkItems(items, index, maxItems);
      const contentLines = visible.map((item, offset) => {
        const absoluteIndex = start + offset;
        const cursor = absoluteIndex === index ? "›" : " ";
        const hint = item.hint ? `  ${item.hint}` : "";
        return `${cursor} ${item.label}${hint}`;
      });
      const footerLines = footer.length > 0 ? footer : ["↑/↓ 选择  Enter 确认", canCancel ? "Esc 返回" : ""].filter(Boolean);
      this.renderScreen(title, description, contentLines, footerLines);

      const { key } = await this.readKey();
      if (key.name === "up" || key.name === "k") {
        index = index === 0 ? items.length - 1 : index - 1;
        continue;
      }
      if (key.name === "down" || key.name === "j") {
        index = index === items.length - 1 ? 0 : index + 1;
        continue;
      }
      if (key.name === "return" || key.name === "enter") {
        return items[index].value;
      }
      if (canCancel && (key.name === "escape" || key.name === "backspace" || key.name === "left")) {
        return null;
      }
    }
  }

  async multiSelect({ title, description = [], items, selectedValues = [] }) {
    if (!items || items.length === 0) {
      return [];
    }

    const selected = new Set(selectedValues);
    let index = 0;

    while (true) {
      const maxItems = Math.max(5, this.getRows() - description.length - 10);
      const { start, visible } = chunkItems(items, index, maxItems);
      const contentLines = visible.map((item, offset) => {
        const absoluteIndex = start + offset;
        const cursor = absoluteIndex === index ? "›" : " ";
        const mark = selected.has(item.value) ? "[x]" : "[ ]";
        const hint = item.hint ? `  ${item.hint}` : "";
        return `${cursor} ${mark} ${item.label}${hint}`;
      });
      const footerLines = [
        "↑/↓ 选择  Space 勾选  Enter 保存",
        "Esc 返回",
      ];
      this.renderScreen(title, description, contentLines, footerLines);

      const { str, key } = await this.readKey();
      if (key.name === "up" || key.name === "k") {
        index = index === 0 ? items.length - 1 : index - 1;
        continue;
      }
      if (key.name === "down" || key.name === "j") {
        index = index === items.length - 1 ? 0 : index + 1;
        continue;
      }
      if (key.name === "space" || str === " ") {
        const value = items[index].value;
        if (selected.has(value)) {
          selected.delete(value);
        } else {
          selected.add(value);
        }
        continue;
      }
      if (key.name === "return" || key.name === "enter") {
        return items.filter((item) => selected.has(item.value)).map((item) => item.value);
      }
      if (key.name === "escape" || key.name === "backspace" || key.name === "left") {
        return null;
      }
    }
  }

  async input({
    title,
    description = [],
    label = "请输入",
    defaultValue = "",
    placeholder = "",
    allowEmpty = false,
    secret = false,
  }) {
    let value = defaultValue;
    let cursor = value.length;

    while (true) {
      const display = value.length === 0 ? placeholder : secret ? "*".repeat(value.length) : value;
      const promptLine = `${label}: ${display}`;
      const cursorLine = `${" ".repeat(label.length + 2 + cursor)}^`;
      const footerLines = ["Enter 保存  Backspace 删除  Ctrl+U 清空", "Esc 返回"];
      this.renderScreen(title, description, [promptLine, cursorLine], footerLines);

      const { str, key } = await this.readKey();
      if (key.name === "return" || key.name === "enter") {
        if (!allowEmpty && value.trim() === "") {
          continue;
        }
        return value;
      }
      if (key.name === "escape") {
        return null;
      }
      if (key.ctrl && key.name === "u") {
        value = "";
        cursor = 0;
        continue;
      }
      if (key.name === "backspace") {
        if (cursor > 0) {
          value = `${value.slice(0, cursor - 1)}${value.slice(cursor)}`;
          cursor -= 1;
        }
        continue;
      }
      if (key.name === "delete") {
        value = `${value.slice(0, cursor)}${value.slice(cursor + 1)}`;
        continue;
      }
      if (key.name === "left") {
        cursor = Math.max(0, cursor - 1);
        continue;
      }
      if (key.name === "right") {
        cursor = Math.min(value.length, cursor + 1);
        continue;
      }
      if (key.name === "home") {
        cursor = 0;
        continue;
      }
      if (key.name === "end") {
        cursor = value.length;
        continue;
      }
      if (str && !key.ctrl && !key.meta) {
        value = `${value.slice(0, cursor)}${str}${value.slice(cursor)}`;
        cursor += str.length;
      }
    }
  }
}

module.exports = {
  TerminalUI,
};
