import React, { useEffect, useState } from "react";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { Box, Spacer, Text, render, useApp, useInput } from "ink";

const require = createRequire(import.meta.url);
const runtime = require("../runtime");
const worktree = require("../worktree");

const h = React.createElement;

const theme = {
  bg: "#272822",
  panel: "#1E1F1C",
  border: "#75715E",
  text: "#F8F8F2",
  muted: "#A59F85",
  dim: "#8C8772",
  cyan: "#66D9EF",
  green: "#A6E22E",
  orange: "#FD971F",
  red: "#F92672",
  purple: "#AE81FF",
  yellow: "#E6DB74",
};

const providerFormatOptions = [
  { label: "OpenAI compatible", value: "openai", hint: "适合 OpenCode 等 OpenAI 兼容配置" },
  { label: "Anthropic compatible", value: "anthropic", hint: "适合 Claude 或 Anthropic 兼容线路" },
];

const cliOptions = [
  { label: "OpenCode", value: "opencode", hint: "OpenAI 兼容的主线路" },
  { label: "Claude Code", value: "claude", hint: "只展示 anthropic provider" },
];

let pendingShellPath = "";

function sanitizeName(value, fallback = "item") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || fallback;
}

function uniqueName(baseName, existingNames) {
  const base = sanitizeName(baseName, "item");
  const names = new Set(existingNames);
  if (!names.has(base)) {
    return base;
  }
  let index = 2;
  while (names.has(`${base}-${index}`)) {
    index += 1;
  }
  return `${base}-${index}`;
}

function maskSecret(value) {
  if (!value) {
    return "-";
  }
  if (value.length <= 8) {
    return "*".repeat(value.length);
  }
  return `${value.slice(0, 4)}${"*".repeat(Math.max(4, value.length - 8))}${value.slice(-4)}`;
}

function compactText(value, max = 48) {
  if (!value) {
    return "-";
  }
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 1)}…`;
}

function joinCompact(values, max = 56) {
  if (!Array.isArray(values) || values.length === 0) {
    return "-";
  }
  return compactText(values.join(", "), max);
}

function windowItems(items, selectedIndex, visibleCount = 8) {
  if (items.length <= visibleCount) {
    return items.map((item, index) => ({ item, index }));
  }
  const half = Math.floor(visibleCount / 2);
  let start = Math.max(0, selectedIndex - half);
  if (start + visibleCount > items.length) {
    start = items.length - visibleCount;
  }
  return items.slice(start, start + visibleCount).map((item, offset) => ({
    item,
    index: start + offset,
  }));
}

function toneColor(tone) {
  if (tone === "success") return theme.green;
  if (tone === "warning") return theme.orange;
  if (tone === "error") return theme.red;
  return theme.cyan;
}

function formatTone(format) {
  return format === "anthropic" ? theme.purple : theme.cyan;
}

function cliTone(cli) {
  return cli === "claude" ? theme.orange : theme.cyan;
}

function renderSegments(segments = [], fallbackColor = theme.muted, selected = false) {
  return segments.map((segment, index) =>
    h(Text, {
      key: `${segment.text}-${index}`,
      color: selected ? (segment.selectedColor || segment.color || fallbackColor) : (segment.color || fallbackColor),
      bold: Boolean(selected && segment.bold),
    }, segment.text),
  );
}

function panelTitle(title, hint = "") {
  return h(
    Box,
    { marginBottom: 1 },
    h(Text, { color: theme.yellow, bold: true }, title),
    hint ? h(Text, { color: theme.muted }, `  ${hint}`) : null,
  );
}

function loadProvidersDetailed() {
  return runtime.listProviderNames().map((name) => ({
    name,
    ...runtime.getProvider(name),
  }));
}

function loadSpritesDetailed() {
  return runtime.listSpriteNames().map((name) => ({
    name,
    config: runtime.getSpriteConfig(name),
  }));
}

function providersForCli(cli) {
  return runtime.listProviderNames().filter((name) => {
    if (cli !== "claude") {
      return true;
    }
    return (runtime.getProvider(name).format || "openai") === "anthropic";
  });
}

function isProviderCompatibleWithCli(providerName, cli) {
  if (!providerName) {
    return true;
  }
  if (!runtime.listProviderNames().includes(providerName)) {
    return false;
  }
  return providersForCli(cli).includes(providerName);
}

function modelOptions(cli, providerName, currentModel = "") {
  const items = [{ label: "不设置 model", value: "", hint: "删除 model 字段" }];
  const seen = new Set();
  if (currentModel) {
    items.push({ label: currentModel, value: currentModel, hint: "当前值" });
    seen.add(currentModel);
  }

  for (const spriteName of runtime.listSpriteNames()) {
    const config = runtime.getSpriteConfig(spriteName);
    if (!config.model || seen.has(config.model)) {
      continue;
    }
    const sameProvider = providerName && config.provider === providerName;
    const sameCli = config.cli === cli;
    if (!sameProvider && !sameCli) {
      continue;
    }
    seen.add(config.model);
    items.push({
      label: config.model,
      value: config.model,
      hint: `来自 ${spriteName}`,
    });
  }

  return items;
}

function normalizeSpriteConfig(config) {
  const next = { ...config };
  if (!next.provider) delete next.provider;
  if (!next.model) delete next.model;
  if (!Array.isArray(next.skill_links)) next.skill_links = [];
  if (!Array.isArray(next.mcp_links)) next.mcp_links = [];
  delete next.skills;
  return next;
}

function getReferencingSprites(providerName) {
  return runtime.listSpriteNames().filter((name) => runtime.getSpriteConfig(name).provider === providerName);
}

function saveProviderEntry(previousName, nextName, nextConfig) {
  const providers = runtime.getProviders();
  const normalizedName = sanitizeName(nextName, "");
  if (!normalizedName) {
    throw new Error("provider 名不能为空");
  }
  if (normalizedName !== previousName && providers[normalizedName]) {
    throw new Error(`provider '${normalizedName}' 已存在`);
  }

  if (previousName && previousName !== normalizedName) {
    delete providers[previousName];
    for (const spriteName of getReferencingSprites(previousName)) {
      const spriteConfig = runtime.getSpriteConfig(spriteName);
      spriteConfig.provider = normalizedName;
      runtime.saveSpriteConfig(spriteName, normalizeSpriteConfig(spriteConfig));
    }
  }

  providers[normalizedName] = {
    base_url: String(nextConfig.base_url || "").trim(),
    api_key: String(nextConfig.api_key || ""),
    remark: String(nextConfig.remark || "").trim(),
    format: nextConfig.format || "openai",
  };
  runtime.saveProviders(providers);
  return normalizedName;
}

function deleteProviderEntry(providerName, replacement) {
  const providers = runtime.getProviders();
  if (!providers[providerName]) {
    throw new Error(`provider '${providerName}' 不存在`);
  }

  for (const spriteName of getReferencingSprites(providerName)) {
    const spriteConfig = runtime.getSpriteConfig(spriteName);
    if (replacement) {
      spriteConfig.provider = replacement;
    } else {
      delete spriteConfig.provider;
    }
    runtime.saveSpriteConfig(spriteName, normalizeSpriteConfig(spriteConfig));
  }

  delete providers[providerName];
  runtime.saveProviders(providers);
}

function providerFieldRows(providerName, provider) {
  if (!providerName || !provider) {
    return [
      { key: "create", label: "还没有 provider", value: "按 Enter 或 N 新建第一条配置", tone: theme.green },
    ];
  }

  return [
    { key: "name", label: "Provider 名", value: providerName, tone: theme.purple, valueTone: theme.purple },
    {
      key: "format",
      label: "格式",
      value: provider.format || "openai",
      tone: theme.cyan,
      valueTone: formatTone(provider.format || "openai"),
    },
    { key: "base_url", label: "API URL", value: compactText(provider.base_url || "-"), tone: theme.yellow, valueTone: theme.yellow },
    { key: "api_key", label: "API Key", value: maskSecret(provider.api_key || ""), tone: theme.orange, valueTone: theme.orange },
    { key: "remark", label: "备注", value: compactText(provider.remark || "-"), tone: theme.text, valueTone: theme.green },
    {
      key: "delete",
      label: "删除 Provider",
      value: `${getReferencingSprites(providerName).length} 个智能体引用`,
      tone: theme.red,
      valueTone: theme.red,
    },
  ];
}

function spriteBaseName(sourceName, providerName, cli) {
  if (sourceName) return `${sourceName}-copy`;
  if (providerName) return `${providerName}-${cli}`;
  return `${cli}-sprite`;
}

function providerChoiceOptions(cli, current) {
  return [
    { label: "不设置 provider", value: "", hint: "清空 provider，运行时走外部环境或 CLI 默认配置" },
    ...providersForCli(cli).map((name) => {
      const provider = runtime.getProvider(name);
      return {
        label: name,
        value: name,
        hint: compactText(`${provider.format || "openai"}  ${provider.remark || "-"}  ${provider.base_url || "-"}`, 56),
        current: name === current,
      };
    }),
  ];
}

function providerChoiceDescription(cli) {
  const formatText = cli === "claude" ? "anthropic 兼容 provider" : "provider.json 中的全部 provider";
  return [
    `来源: ${runtime.PROVIDERS_FILE}`,
    `过滤规则: ${formatText}`,
  ];
}

function skillsOptions() {
  return runtime.getAvailableSkillLinks().map((name) => ({ label: name, value: name }));
}

function mcpOptions() {
  return runtime.getAvailableMcpServers().map((name) => ({ label: name, value: name }));
}

function launchShell(pathValue) {
  const shell = process.env.SHELL || "/bin/zsh";
  spawnSync(shell, ["-i"], {
    cwd: pathValue,
    stdio: "inherit",
  });
}

function safeAction(setOverlay, setStatus, fn) {
  try {
    fn();
  } catch (error) {
    if (setOverlay) {
      setOverlay(null);
    }
    setStatus({
      tone: "error",
      text: error?.message || String(error),
    });
  }
}

function KeyHint({ text, tone = theme.muted }) {
  return h(Text, { color: tone }, text);
}

function Section({ title, hint = "", children, borderColor = theme.border, width }) {
  return h(
    Box,
    {
      flexDirection: "column",
      borderStyle: "round",
      borderColor,
      paddingX: 1,
      paddingY: 1,
      width,
    },
    panelTitle(title, hint),
    children,
  );
}

function ScreenFrame({ title, subtitle = "", shortcuts = "", status, children }) {
  const accent = subtitle.includes("Provider")
    ? theme.cyan
    : subtitle.includes("Sprite")
      ? theme.green
      : subtitle.includes("Worktree")
        ? theme.orange
        : theme.purple;
  return h(
    Section,
    {
      title,
      hint: subtitle,
      borderColor: accent,
    },
    h(
      Box,
      { marginBottom: 1, flexDirection: "column" },
      h(Text, { color: theme.muted }, `配置目录: ${runtime.CONFIG_BASE}`),
      shortcuts ? h(KeyHint, { text: shortcuts }) : null,
    ),
    children,
    h(Box, { marginTop: 1 }),
    h(Text, { color: toneColor(status.tone) }, status.text),
  );
}

function ListBlock({ items, selectedIndex, title, hint = "", active = true, visibleCount = 8 }) {
  const visibleItems = windowItems(items, selectedIndex, visibleCount);
  const blankCount = Math.max(0, visibleCount - visibleItems.length);
  return h(
    Box,
    { flexDirection: "column" },
    h(Text, { color: active ? theme.cyan : theme.border, bold: true }, title),
    hint ? h(Text, { color: theme.muted }, hint) : null,
    h(Box, { marginBottom: 1 }),
    ...visibleItems.map(({ item, index }) =>
      h(
        Box,
        { key: `${title}-${item.key || item.label}-${index}` },
        h(Text, { color: index === selectedIndex ? (item.tone || theme.cyan) : theme.muted }, index === selectedIndex ? "› " : "  "),
        h(Text, { color: index === selectedIndex ? (item.tone || theme.text) : (item.tone || theme.muted), bold: index === selectedIndex }, item.label),
        item.segments
          ? h(Box, null, h(Text, { color: theme.dim }, "  "), ...renderSegments(item.segments, theme.muted, index === selectedIndex))
          : item.hint
            ? h(Text, { color: item.hintTone || theme.muted }, `  ${item.hint}`)
            : null,
      ),
    ),
    ...Array.from({ length: blankCount }, (_, index) =>
      h(Text, { key: `${title}-blank-${index}`, color: theme.muted }, " "),
    ),
  );
}

function FieldBlock({ rows, selectedIndex, title, hint = "", active = true, visibleCount = 8 }) {
  const visibleRows = rows.slice(0, visibleCount);
  const blankCount = Math.max(0, visibleCount - visibleRows.length);
  return h(
    Box,
    { flexDirection: "column" },
    h(Text, { color: active ? theme.purple : theme.border, bold: true }, title),
    hint ? h(Text, { color: theme.muted }, hint) : null,
    h(Box, { marginBottom: 1 }),
    ...visibleRows.map((row, index) =>
      h(
        Box,
        {
          key: row.key,
        },
        h(Text, { color: index === selectedIndex ? row.tone || theme.purple : theme.muted }, index === selectedIndex ? "› " : "  "),
        h(Text, { color: row.labelTone || (index === selectedIndex ? row.tone || theme.purple : theme.muted) }, `${row.label}: `),
        h(Text, { color: row.valueTone || (index === selectedIndex ? theme.text : theme.muted), bold: index === selectedIndex }, compactText(row.value, 60)),
      ),
    ),
    ...Array.from({ length: blankCount }, (_, index) =>
      h(Text, { key: `${title}-blank-${index}`, color: theme.muted }, " "),
    ),
  );
}

function TextInputModal({ title, description = [], initialValue = "", placeholder = "", secret = false, onSubmit, onCancel }) {
  const [value, setValue] = useState(initialValue);

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.return) {
      onSubmit(value);
      return;
    }
    if (key.backspace || key.delete) {
      setValue((current) => current.slice(0, -1));
      return;
    }
    if (key.ctrl && input === "u") {
      setValue("");
      return;
    }
    if (!key.ctrl && !key.meta && input) {
      setValue((current) => `${current}${input}`);
    }
  });

  const display = value.length === 0 ? placeholder : secret ? "*".repeat(value.length) : value;
  return h(
    Box,
    {
      marginTop: 1,
      flexDirection: "column",
    },
    h(Text, { color: theme.orange, bold: true }, title),
    ...description.map((line, index) => h(Text, { key: `${title}-${index}`, color: theme.muted }, line)),
    h(Box, { marginTop: 1 }, h(Text, { color: theme.text }, display || "")),
    h(Box, null, h(Text, { color: theme.orange }, "▌")),
    h(Box, { marginTop: 1 }, h(KeyHint, { text: "Enter 保存  Esc 取消  Ctrl+U 清空" })),
  );
}

function ChoiceModal({ title, description = [], options, onSelect, onCancel, selectedTone = theme.cyan }) {
  const [index, setIndex] = useState(0);

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.upArrow || input === "k") {
      setIndex((current) => (current === 0 ? options.length - 1 : current - 1));
      return;
    }
    if (key.downArrow || input === "j") {
      setIndex((current) => (current === options.length - 1 ? 0 : current + 1));
      return;
    }
    if (key.return) {
      onSelect(options[index].value);
    }
  });

  return h(
    Box,
    {
      marginTop: 1,
      flexDirection: "column",
    },
    h(Text, { color: selectedTone, bold: true }, title),
    ...description.map((line, idx) => h(Text, { key: `${title}-d-${idx}`, color: theme.muted }, line)),
    h(Box, { marginTop: 1, flexDirection: "column" }, ...options.map((option, optionIndex) =>
      h(
        Box,
        { key: `${title}-${option.value}-${optionIndex}` },
        h(Text, { color: optionIndex === index ? selectedTone : theme.muted }, optionIndex === index ? "› " : "  "),
        h(Text, { color: optionIndex === index ? theme.text : theme.muted, bold: optionIndex === index }, option.label),
        option.hint ? h(Text, { color: theme.muted }, `  ${option.hint}`) : null,
      ),
    )),
    h(Box, { marginTop: 1 }, h(KeyHint, { text: "↑/↓ 选择  Enter 确认  Esc 取消" })),
  );
}

function MultiSelectModal({ title, description = [], options, initialValues = [], onSubmit, onCancel }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(() => new Set(initialValues));

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.upArrow || input === "k") {
      setIndex((current) => (current === 0 ? options.length - 1 : current - 1));
      return;
    }
    if (key.downArrow || input === "j") {
      setIndex((current) => (current === options.length - 1 ? 0 : current + 1));
      return;
    }
    if (key.return) {
      onSubmit(options.filter((option) => selected.has(option.value)).map((option) => option.value));
      return;
    }
    if (input === " ") {
      const value = options[index].value;
      setSelected((current) => {
        const next = new Set(current);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        return next;
      });
    }
  });

  return h(
    Box,
    {
      marginTop: 1,
      flexDirection: "column",
    },
    h(Text, { color: theme.green, bold: true }, title),
    ...description.map((line, idx) => h(Text, { key: `${title}-desc-${idx}`, color: theme.muted }, line)),
    h(Box, { marginTop: 1, flexDirection: "column" }, ...options.map((option, optionIndex) =>
      h(
        Box,
        { key: `${title}-${option.value}-${optionIndex}` },
        h(Text, { color: optionIndex === index ? theme.green : theme.muted }, optionIndex === index ? "› " : "  "),
        h(Text, { color: selected.has(option.value) ? theme.green : theme.muted }, selected.has(option.value) ? "[x] " : "[ ] "),
        h(Text, { color: optionIndex === index ? theme.text : theme.muted, bold: optionIndex === index }, option.label),
      ),
    )),
    h(Box, { marginTop: 1 }, h(KeyHint, { text: "↑/↓ 选择  Space 勾选  Enter 保存  Esc 取消" })),
  );
}

function ProviderScreen({ onBack, setStatus, status }) {
  const [version, setVersion] = useState(0);
  const [listIndex, setListIndex] = useState(0);
  const [fieldIndex, setFieldIndex] = useState(0);
  const [page, setPage] = useState("list");
  const [overlay, setOverlay] = useState(null);

  const providers = loadProvidersDetailed();
  const listItems = [{ key: "__create__", label: "＋ 新建 Provider", hint: "创建新的 API 供应商配置" }].concat(
    providers.map((provider) => ({
      key: provider.name,
      label: provider.name,
      tone: formatTone(provider.format || "openai"),
      segments: [
        { text: provider.format || "openai", color: formatTone(provider.format || "openai"), bold: true },
        { text: "  ", color: theme.dim },
        { text: compactText(provider.remark || "-", 18), color: theme.dim },
      ],
    })),
  );
  const safeListIndex = Math.min(listIndex, Math.max(0, listItems.length - 1));
  const selectedItem = listItems[safeListIndex];
  const selectedProviderName = selectedItem?.key && selectedItem.key !== "__create__" ? selectedItem.key : "";
  const selectedProvider = selectedProviderName ? runtime.getProvider(selectedProviderName) : null;
  const rows = providerFieldRows(selectedProviderName, selectedProvider);
  const safeFieldIndex = Math.min(fieldIndex, Math.max(0, rows.length - 1));

  useEffect(() => {
    setListIndex((current) => Math.min(current, Math.max(0, listItems.length - 1)));
    setFieldIndex((current) => Math.min(current, Math.max(0, rows.length - 1)));
  }, [version, listItems.length, rows.length]);

  function refresh(message, tone = "success") {
    setVersion((current) => current + 1);
    setStatus({ tone, text: message });
  }

  function openCreateFlow() {
    const suggestion = uniqueName("provider", runtime.listProviderNames());
    setOverlay({
      type: "text",
      title: "新建 Provider",
      description: ["先给 provider 一个名字。后续会依次填写格式、URL、Key 和备注。"],
      initialValue: suggestion,
      onSubmit: (nameValue) => {
        const draftName = sanitizeName(nameValue, "");
        if (!draftName) {
          setStatus({ tone: "error", text: "provider 名不能为空" });
          setOverlay(null);
          return;
        }
        if (runtime.listProviderNames().includes(draftName)) {
          setStatus({ tone: "error", text: `provider '${draftName}' 已存在` });
          setOverlay(null);
          return;
        }
        setOverlay({
          type: "choice",
          title: "选择 Provider 格式",
          description: [draftName],
          options: providerFormatOptions,
          onSelect: (formatValue) => {
            setOverlay({
              type: "text",
              title: "输入 API URL",
              description: [draftName, "例如 https://api.example.com/v1"],
              initialValue: "",
              onSubmit: (baseUrlValue) => {
                setOverlay({
                  type: "text",
                  title: "输入 API Key",
                  description: [draftName, "支持留空，后续再补。"],
                  initialValue: "",
                  onSubmit: (apiKeyValue) => {
                    setOverlay({
                      type: "text",
                      title: "输入备注",
                      description: [draftName, "可留空，例如：主线路 / 便宜线路 / 官方接口"],
                      initialValue: "",
                      onSubmit: (remarkValue) => {
                        safeAction(setOverlay, setStatus, () => {
                          saveProviderEntry("", draftName, {
                            format: formatValue,
                            base_url: baseUrlValue,
                            api_key: apiKeyValue,
                            remark: remarkValue,
                          });
                          setOverlay(null);
                          setListIndex(runtime.listProviderNames().indexOf(draftName) + 1);
                          setPage("detail");
                          refresh(`已创建 provider '${draftName}'`);
                        });
                      },
                      onCancel: () => setOverlay(null),
                    });
                  },
                  onCancel: () => setOverlay(null),
                  secret: true,
                });
              },
              onCancel: () => setOverlay(null),
            });
          },
          onCancel: () => setOverlay(null),
        });
      },
      onCancel: () => setOverlay(null),
    });
  }

  function openEditField(rowKey) {
    if (!selectedProviderName || !selectedProvider) {
      openCreateFlow();
      return;
    }
    if (rowKey === "format") {
      setOverlay({
        type: "choice",
        title: `修改 ${selectedProviderName} 的格式`,
        options: providerFormatOptions,
        onSelect: (formatValue) => {
          safeAction(setOverlay, setStatus, () => {
            saveProviderEntry(selectedProviderName, selectedProviderName, {
              ...selectedProvider,
              format: formatValue,
            });
            setOverlay(null);
            refresh(`已更新 ${selectedProviderName} 的格式`);
          });
        },
        onCancel: () => setOverlay(null),
      });
      return;
    }
    if (rowKey === "delete") {
      const references = getReferencingSprites(selectedProviderName);
      if (references.length > 0) {
        const otherProviders = runtime.listProviderNames().filter((name) => name !== selectedProviderName);
        setOverlay({
          type: "choice",
          title: `删除 ${selectedProviderName}`,
          description: [`有 ${references.length} 个智能体在引用它。请先选择替代方案。`],
          options: [{ label: "清空这些智能体的 provider", value: "" }].concat(
            otherProviders.map((name) => ({
              label: name,
              value: name,
              hint: runtime.getProvider(name).remark || "-",
            })),
          ),
          onSelect: (replacement) => {
            safeAction(setOverlay, setStatus, () => {
              deleteProviderEntry(selectedProviderName, replacement);
              setOverlay(null);
              setListIndex(0);
              setPage("list");
              refresh(`已删除 provider '${selectedProviderName}'`, "warning");
            });
          },
          onCancel: () => setOverlay(null),
        });
        return;
      }
      setOverlay({
        type: "choice",
        title: `确认删除 ${selectedProviderName}`,
        options: [
          { label: "删除", value: "delete", hint: "这个操作不可撤销" },
          { label: "取消", value: "cancel" },
        ],
        onSelect: (value) => {
          if (value === "delete") {
            safeAction(setOverlay, setStatus, () => {
              deleteProviderEntry(selectedProviderName, "");
              setListIndex(0);
              setPage("list");
              refresh(`已删除 provider '${selectedProviderName}'`, "warning");
            });
          }
          setOverlay(null);
        },
        onCancel: () => setOverlay(null),
        tone: theme.red,
      });
      return;
    }

    const fieldMeta = {
      name: { title: "修改 Provider 名", initialValue: selectedProviderName, secret: false },
      base_url: { title: "修改 API URL", initialValue: selectedProvider.base_url || "", secret: false },
      api_key: { title: "修改 API Key", initialValue: selectedProvider.api_key || "", secret: true },
      remark: { title: "修改备注", initialValue: selectedProvider.remark || "", secret: false },
    }[rowKey];

    if (!fieldMeta) {
      return;
    }

    setOverlay({
      type: "text",
      title: fieldMeta.title,
      initialValue: fieldMeta.initialValue,
      secret: fieldMeta.secret,
      placeholder: rowKey === "remark" ? "可留空" : "",
      onSubmit: (value) => {
        const nextName = rowKey === "name" ? sanitizeName(value, "") : selectedProviderName;
        safeAction(setOverlay, setStatus, () => {
          saveProviderEntry(selectedProviderName, nextName, {
            ...selectedProvider,
            [rowKey]: value,
          });
          setOverlay(null);
          setListIndex(runtime.listProviderNames().indexOf(nextName) + 1);
          refresh(`已更新 ${nextName} 的 ${fieldMeta.title.replace("修改", "")}`);
        });
      },
      onCancel: () => setOverlay(null),
    });
  }

  useInput((input, key) => {
    if (overlay) {
      return;
    }
    if (key.escape) {
      if (page === "detail") {
        setPage("list");
      } else {
        onBack();
      }
      return;
    }
    if (input === "n" || input === "N") {
      openCreateFlow();
      return;
    }
    if (page === "list") {
      if (key.upArrow || input === "k") {
        setListIndex((current) => (current === 0 ? listItems.length - 1 : current - 1));
        return;
      }
      if (key.downArrow || input === "j") {
        setListIndex((current) => (current === listItems.length - 1 ? 0 : current + 1));
        return;
      }
      if (key.return) {
        if (selectedItem.key === "__create__") {
          openCreateFlow();
        } else {
          setFieldIndex(0);
          setPage("detail");
        }
      }
      return;
    }

    if (key.upArrow || input === "k") {
      setFieldIndex((current) => (current === 0 ? rows.length - 1 : current - 1));
      return;
    }
    if (key.downArrow || input === "j") {
      setFieldIndex((current) => (current === rows.length - 1 ? 0 : current + 1));
      return;
    }
    if (key.return) {
      openEditField(rows[safeFieldIndex].key);
    }
  });

  return h(
    ScreenFrame,
    {
      title: "callcli",
      subtitle: "Provider Studio",
      shortcuts: page === "list" ? "↑/↓ 选择  Enter 进入  N 新建  Esc 返回" : "↑/↓ 选择字段  Enter 编辑  Esc 返回列表",
      status,
    },
    page === "list"
      ? h(ListBlock, {
          title: "Providers",
          hint: "选择一个 provider 进入详情页",
          items: listItems,
          selectedIndex: safeListIndex,
          active: true,
        })
      : h(FieldBlock, {
          title: selectedProviderName || "Provider Details",
          hint: selectedProviderName ? `${getReferencingSprites(selectedProviderName).length} 个智能体引用` : "当前还没有选中 provider",
          rows,
          selectedIndex: safeFieldIndex,
          active: true,
        }),
    overlay
      ? renderOverlay(overlay)
      : h(
          Box,
          { marginTop: 1, flexDirection: "column" },
          page === "list"
            ? h(KeyHint, { text: "Enter 进入 provider 详情页；详情页里再编辑具体字段。" })
            : h(KeyHint, { text: "API URL / API Key / Remark / Name / Format 都支持修改。" }),
          page === "detail" && selectedProviderName
            ? h(
                Text,
                { color: theme.muted },
                `当前 provider 文件: ${runtime.PROVIDERS_FILE}`,
              )
            : null,
        ),
  );
}

function SpriteScreen({ onBack, setStatus, status }) {
  const [version, setVersion] = useState(0);
  const [listIndex, setListIndex] = useState(0);
  const [fieldIndex, setFieldIndex] = useState(0);
  const [page, setPage] = useState("list");
  const [overlay, setOverlay] = useState(null);
  const sprites = loadSpritesDetailed();
  const listItems = [{ key: "__create__", label: "＋ 新建智能体", hint: "继续保持免打字创建" }].concat(
    sprites.map((sprite) => ({
      key: sprite.name,
      label: sprite.name === runtime.getDefault() ? `${sprite.name}  [默认]` : sprite.name,
      tone: cliTone(sprite.config.cli || "opencode"),
      segments: [
        { text: sprite.config.cli || "opencode", color: cliTone(sprite.config.cli || "opencode"), bold: true },
        { text: "  ", color: theme.dim },
        {
          text: compactText(sprite.config.provider || "-", 14),
          color: sprite.config.provider ? theme.purple : theme.dim,
        },
        { text: "  ", color: theme.dim },
        { text: compactText(sprite.config.model || "-", 20), color: theme.yellow },
      ],
    })),
  );
  const safeListIndex = Math.min(listIndex, Math.max(0, listItems.length - 1));
  const selectedItem = listItems[safeListIndex];
  const spriteName = selectedItem?.key && selectedItem.key !== "__create__" ? selectedItem.key : "";
  const spriteConfig = spriteName ? runtime.getSpriteConfig(spriteName) : null;
  const rows = !spriteName || !spriteConfig
    ? [{ key: "create", label: "还没有选中智能体", value: "按 Enter 或 C 新建", tone: theme.green }]
    : [
        {
          key: "cli",
          label: "CLI",
          value: spriteConfig.cli === "claude" ? "claude" : "opencode",
          tone: theme.cyan,
          valueTone: cliTone(spriteConfig.cli || "opencode"),
        },
        {
          key: "provider",
          label: "Provider",
          value: spriteConfig.provider
            ? `${spriteConfig.provider}${isProviderCompatibleWithCli(spriteConfig.provider, spriteConfig.cli || "opencode") ? "" : "  [不兼容当前 CLI]"}` 
            : "-",
          tone: isProviderCompatibleWithCli(spriteConfig.provider || "", spriteConfig.cli || "opencode") ? theme.purple : theme.red,
          valueTone: isProviderCompatibleWithCli(spriteConfig.provider || "", spriteConfig.cli || "opencode") ? theme.purple : theme.red,
        },
        { key: "model", label: "Model", value: compactText(spriteConfig.model || "-", 64), tone: theme.yellow, valueTone: theme.yellow },
        {
          key: "autoupdate",
          label: "Autoupdate",
          value: String(Boolean(spriteConfig.autoupdate)),
          tone: theme.green,
          valueTone: spriteConfig.autoupdate ? theme.green : theme.orange,
        },
        {
          key: "skills",
          label: "Skills",
          value: joinCompact(spriteConfig.skill_links, 64),
          tone: theme.text,
          valueTone: theme.cyan,
        },
        {
          key: "mcp",
          label: "MCP",
          value: joinCompact(spriteConfig.mcp_links, 64),
          tone: theme.text,
          valueTone: theme.orange,
        },
        {
          key: "default",
          label: "默认智能体",
          value: runtime.getDefault() === spriteName ? "已设为默认" : "设为默认",
          tone: theme.orange,
          valueTone: runtime.getDefault() === spriteName ? theme.green : theme.orange,
        },
        { key: "delete", label: "删除智能体", value: "删除目录和配置", tone: theme.red, valueTone: theme.red },
      ];
  const safeFieldIndex = Math.min(fieldIndex, Math.max(0, rows.length - 1));

  useEffect(() => {
    setListIndex((current) => Math.min(current, Math.max(0, listItems.length - 1)));
    setFieldIndex((current) => Math.min(current, Math.max(0, rows.length - 1)));
  }, [version, listItems.length, rows.length]);

  function refresh(message, tone = "success") {
    setVersion((current) => current + 1);
    setStatus({ tone, text: message });
  }

  function createSpriteFlow() {
    const currentSprites = runtime.listSpriteNames();
    const modeOptions = [{ label: "从空白模板创建", value: "blank" }];
    if (currentSprites.length > 0) {
      modeOptions.push({ label: "复制现有智能体", value: "clone", hint: "最快创建变体" });
    }
    setOverlay({
      type: "choice",
      title: "新建智能体",
      options: modeOptions,
      onSelect: (modeValue) => {
        if (modeValue === "clone") {
          setOverlay({
            type: "choice",
            title: "选择模板智能体",
            options: currentSprites.map((name) => ({
              label: name,
              value: name,
              hint: runtime.getSpriteConfig(name).provider || "-",
            })),
            onSelect: (sourceName) => runSpriteWizard(sourceName),
            onCancel: () => setOverlay(null),
          });
        } else {
          runSpriteWizard("");
        }
      },
      onCancel: () => setOverlay(null),
    });
  }

  function runSpriteWizard(sourceName) {
    const sourceConfig = sourceName ? runtime.getSpriteConfig(sourceName) : {};
    setOverlay({
      type: "choice",
      title: "选择 CLI",
      options: cliOptions,
      onSelect: (cliValue) => {
        setOverlay({
          type: "choice",
          title: "选择 Provider",
          description: providerChoiceDescription(cliValue),
          options: providerChoiceOptions(cliValue, sourceConfig.provider || ""),
          onSelect: (providerValue) => {
            setOverlay({
              type: "choice",
              title: "选择 Model",
              options: modelOptions(cliValue, providerValue, sourceConfig.model || ""),
              onSelect: (modelValue) => {
                setOverlay({
                  type: "choice",
                  title: "选择 autoupdate",
                  options: [
                    { label: "开启", value: true },
                    { label: "关闭", value: false },
                  ],
                  onSelect: (autoupdateValue) => {
                    setOverlay({
                      type: "multi",
                      title: "选择技能",
                      options: skillsOptions(),
                      initialValues: Array.isArray(sourceConfig.skill_links) ? sourceConfig.skill_links : [],
                      onSubmit: (skillLinks) => {
                        setOverlay({
                          type: "multi",
                          title: "选择 MCP",
                          options: mcpOptions(),
                          initialValues: Array.isArray(sourceConfig.mcp_links) ? sourceConfig.mcp_links : [],
                          onSubmit: (mcpLinks) => {
                            const nextName = uniqueName(
                              spriteBaseName(sourceName, providerValue, cliValue),
                              runtime.listSpriteNames(),
                            );
                            setOverlay({
                              type: "choice",
                              title: `创建智能体 ${nextName}`,
                              options: [
                                { label: "仅创建", value: "create" },
                                { label: "创建并设为默认", value: "create-default" },
                              ],
                              onSelect: (finalAction) => {
                                safeAction(setOverlay, setStatus, () => {
                                  runtime.createSpriteFromTemplate(nextName, sourceName);
                                  runtime.saveSpriteConfig(nextName, normalizeSpriteConfig({
                                    ...sourceConfig,
                                    cli: cliValue,
                                    provider: providerValue,
                                    model: modelValue,
                                    autoupdate: autoupdateValue,
                                    skill_links: skillLinks,
                                    mcp_links: mcpLinks,
                                  }));
                                  runtime.syncSkills(nextName);
                                  if (finalAction === "create-default") {
                                    runtime.setDefault(nextName);
                                  }
                                  setOverlay(null);
                                  setListIndex(runtime.listSpriteNames().indexOf(nextName) + 1);
                                  setPage("detail");
                                  refresh(`已创建智能体 '${nextName}'`);
                                });
                              },
                              onCancel: () => setOverlay(null),
                            });
                          },
                          onCancel: () => setOverlay(null),
                        });
                      },
                      onCancel: () => setOverlay(null),
                    });
                  },
                  onCancel: () => setOverlay(null),
                });
              },
              onCancel: () => setOverlay(null),
            });
          },
          onCancel: () => setOverlay(null),
        });
      },
      onCancel: () => setOverlay(null),
    });
  }

  function editSpriteField(rowKey) {
    if (!spriteName || !spriteConfig) {
      createSpriteFlow();
      return;
    }
    if (rowKey === "cli") {
      setOverlay({
        type: "choice",
        title: `修改 ${spriteName} 的 CLI`,
        description: ["可在 opencode 和 claude 之间切换。切换后会重新选择兼容 provider。"],
        options: cliOptions.map((option) => ({
          ...option,
          hint: option.value === (spriteConfig.cli || "opencode") ? `${option.hint}  [当前]` : option.hint,
        })),
        onSelect: (cliValue) => {
          const nextConfig = { ...spriteConfig, cli: cliValue };
          const providerNames = providerChoiceOptions(
            cliValue,
            isProviderCompatibleWithCli(nextConfig.provider || "", cliValue) ? nextConfig.provider || "" : "",
          );
          if (providerNames.length === 1) {
            safeAction(setOverlay, setStatus, () => {
              nextConfig.provider = "";
              runtime.saveSpriteConfig(spriteName, normalizeSpriteConfig(nextConfig));
              setOverlay(null);
              refresh(`已切换 ${spriteName} 到 ${cliValue}，当前没有兼容 provider，已清空 provider`, "warning");
            });
            return;
          }
          setOverlay({
            type: "choice",
            title: `为 ${cliValue} 选择 Provider`,
            description: providerChoiceDescription(cliValue),
            options: providerNames,
            onSelect: (providerValue) => {
              safeAction(setOverlay, setStatus, () => {
                nextConfig.provider = providerValue;
                runtime.saveSpriteConfig(spriteName, normalizeSpriteConfig(nextConfig));
                setOverlay(null);
                refresh(`已更新 ${spriteName} 的 CLI 为 ${cliValue}`);
              });
            },
            onCancel: () => setOverlay(null),
          });
        },
        onCancel: () => setOverlay(null),
      });
      return;
    }
    if (rowKey === "provider") {
      const currentCli = spriteConfig.cli || "opencode";
      const options = providerChoiceOptions(currentCli, spriteConfig.provider || "");
      if (options.length === 1) {
        setStatus({
          tone: "warning",
          text: currentCli === "claude"
            ? "provider.json 中没有 anthropic 兼容 provider，无法为 claude 选择供应商"
            : "provider.json 中没有可选 provider",
        });
        return;
      }
      setOverlay({
        type: "choice",
        title: `修改 ${spriteName} 的 Provider`,
        description: providerChoiceDescription(currentCli),
        options,
        onSelect: (providerValue) => {
          safeAction(setOverlay, setStatus, () => {
            runtime.saveSpriteConfig(spriteName, normalizeSpriteConfig({
              ...spriteConfig,
              provider: providerValue,
            }));
            setOverlay(null);
            refresh(`已更新 ${spriteName} 的 provider`);
          });
        },
        onCancel: () => setOverlay(null),
      });
      return;
    }
    if (rowKey === "model") {
      setOverlay({
        type: "choice",
        title: `修改 ${spriteName} 的 Model`,
        options: modelOptions(spriteConfig.cli || "opencode", spriteConfig.provider || "", spriteConfig.model || ""),
        onSelect: (modelValue) => {
          safeAction(setOverlay, setStatus, () => {
            runtime.saveSpriteConfig(spriteName, normalizeSpriteConfig({
              ...spriteConfig,
              model: modelValue,
            }));
            setOverlay(null);
            refresh(`已更新 ${spriteName} 的 model`);
          });
        },
        onCancel: () => setOverlay(null),
      });
      return;
    }
    if (rowKey === "autoupdate") {
      safeAction(null, setStatus, () => {
        runtime.saveSpriteConfig(spriteName, normalizeSpriteConfig({
          ...spriteConfig,
          autoupdate: !spriteConfig.autoupdate,
        }));
        refresh(`已切换 ${spriteName} 的 autoupdate`);
      });
      return;
    }
    if (rowKey === "skills") {
      setOverlay({
        type: "multi",
        title: `修改 ${spriteName} 的技能`,
        options: skillsOptions(),
        initialValues: Array.isArray(spriteConfig.skill_links) ? spriteConfig.skill_links : [],
        onSubmit: (values) => {
          safeAction(setOverlay, setStatus, () => {
            runtime.saveSpriteConfig(spriteName, normalizeSpriteConfig({
              ...spriteConfig,
              skill_links: values,
            }));
            runtime.syncSkills(spriteName);
            setOverlay(null);
            refresh(`已更新 ${spriteName} 的 skills`);
          });
        },
        onCancel: () => setOverlay(null),
      });
      return;
    }
    if (rowKey === "mcp") {
      setOverlay({
        type: "multi",
        title: `修改 ${spriteName} 的 MCP`,
        options: mcpOptions(),
        initialValues: Array.isArray(spriteConfig.mcp_links) ? spriteConfig.mcp_links : [],
        onSubmit: (values) => {
          safeAction(setOverlay, setStatus, () => {
            runtime.saveSpriteConfig(spriteName, normalizeSpriteConfig({
              ...spriteConfig,
              mcp_links: values,
            }));
            setOverlay(null);
            refresh(`已更新 ${spriteName} 的 MCP`);
          });
        },
        onCancel: () => setOverlay(null),
      });
      return;
    }
    if (rowKey === "default") {
      safeAction(null, setStatus, () => {
        runtime.setDefault(spriteName);
        refresh(`已将 ${spriteName} 设为默认智能体`);
      });
      return;
    }
    if (rowKey === "delete") {
      setOverlay({
        type: "choice",
        title: `删除 ${spriteName}`,
        options: [
          { label: "删除", value: "delete", hint: "会删除整个 sprite 目录" },
          { label: "取消", value: "cancel" },
        ],
        onSelect: (value) => {
          if (value === "delete") {
            safeAction(setOverlay, setStatus, () => {
              runtime.deleteSprite(spriteName);
              setListIndex(0);
              setPage("list");
              refresh(`已删除智能体 '${spriteName}'`, "warning");
            });
          }
          setOverlay(null);
        },
        onCancel: () => setOverlay(null),
      });
    }
  }

  useInput((input, key) => {
    if (overlay) {
      return;
    }
    if (key.escape) {
      if (page === "detail") {
        setPage("list");
      } else {
        onBack();
      }
      return;
    }
    if (input === "c" || input === "n") {
      createSpriteFlow();
      return;
    }
    if (page === "list") {
      if (key.upArrow || input === "k") {
        setListIndex((current) => (current === 0 ? listItems.length - 1 : current - 1));
        return;
      }
      if (key.downArrow || input === "j") {
        setListIndex((current) => (current === listItems.length - 1 ? 0 : current + 1));
        return;
      }
      if (key.return) {
        if (selectedItem.key === "__create__") createSpriteFlow();
        else {
          setFieldIndex(0);
          setPage("detail");
        }
      }
      return;
    }

    if (key.upArrow || input === "k") {
      setFieldIndex((current) => (current === 0 ? rows.length - 1 : current - 1));
      return;
    }
    if (key.downArrow || input === "j") {
      setFieldIndex((current) => (current === rows.length - 1 ? 0 : current + 1));
      return;
    }
    if (key.return) {
      editSpriteField(rows[safeFieldIndex].key);
    }
  });

  return h(
    ScreenFrame,
    {
      title: "callcli",
      subtitle: "Sprite Studio",
      shortcuts: page === "list" ? "↑/↓ 选择  Enter 进入  C/N 新建  Esc 返回" : "↑/↓ 选择字段  Enter 编辑  Esc 返回列表",
      status,
    },
    page === "list"
      ? h(ListBlock, {
          title: "Sprites",
          hint: "选择一个智能体进入详情页",
          items: listItems,
          selectedIndex: safeListIndex,
          active: true,
        })
      : h(FieldBlock, {
          title: spriteName || "Sprite Details",
          hint: spriteName ? `CLI=${spriteConfig.cli || "opencode"}` : "当前没有选中智能体",
          rows,
          selectedIndex: safeFieldIndex,
          active: true,
        }),
    overlay
      ? renderOverlay(overlay)
      : h(
          Box,
          { marginTop: 1, flexDirection: "column" },
          page === "list"
            ? h(KeyHint, { text: "Enter 进入智能体详情页；详情页里再编辑 CLI / Provider / Skills / MCP。" })
            : h(KeyHint, { text: "Provider / Skills / MCP / CLI / Model / Autoupdate / Default 都能直接改。" }),
        ),
  );
}

function WorktreeScreen({ onBack, setStatus, requestShell, status }) {
  const [actionIndex, setActionIndex] = useState(0);
  const [overlay, setOverlay] = useState(null);
  const repoRoot = worktree.findGitRoot(process.cwd());
  const currentBranch = repoRoot ? worktree.getCurrentBranch(repoRoot) || "HEAD(detached)" : "";
  const actions = [
    { key: "new", label: "基于当前分支新建 Worktree", hint: "自动给出 codex/ 分支名建议", tone: theme.green },
    { key: "existing", label: "使用现有分支创建 Worktree", hint: "适合已经存在的分支", tone: theme.cyan },
    { key: "list", label: "查看现有 Worktree", hint: "显示 branch -> path", tone: theme.purple },
    { key: "back", label: "返回主菜单", tone: theme.orange },
  ];

  function openNewWorktreeFlow() {
    const suggestedBranch = worktree.ensureUniqueBranchName(repoRoot, worktree.suggestBranchName(repoRoot));
    setOverlay({
      type: "text",
      title: "输入新分支名",
      description: ["默认使用 codex/ 前缀。"],
      initialValue: suggestedBranch,
      onSubmit: (branchName) => {
        const resolvedBranch = String(branchName || "").trim();
        setOverlay({
          type: "text",
          title: "输入 Worktree 目录",
          description: ["默认放在当前仓库同级目录。"],
          initialValue: worktree.suggestWorktreePath(repoRoot, resolvedBranch),
          onSubmit: (pathValue) => {
            const resolvedPath = path.resolve(String(pathValue || "").trim());
            safeAction(setOverlay, setStatus, () => {
              worktree.createWorktreeForNewBranch(repoRoot, resolvedBranch, resolvedPath, currentBranch === "HEAD(detached)" ? "HEAD" : currentBranch);
              setOverlay({
                type: "choice",
                title: "Worktree 已创建",
                description: [resolvedPath],
                options: [
                  { label: "进入新 worktree 的 shell", value: "shell" },
                  { label: "返回 Worktree 菜单", value: "back" },
                ],
                onSelect: (value) => {
                  setOverlay(null);
                  setStatus({ tone: "success", text: `已创建 ${resolvedBranch}` });
                  if (value === "shell") {
                    requestShell(resolvedPath);
                  }
                },
                onCancel: () => setOverlay(null),
              });
            });
          },
          onCancel: () => setOverlay(null),
        });
      },
      onCancel: () => setOverlay(null),
    });
  }

  function openExistingWorktreeFlow() {
    const branches = worktree.getAvailableBranchesForWorktree(repoRoot);
    if (branches.length === 0) {
      setStatus({ tone: "warning", text: "没有可用于新 worktree 的现有分支" });
      return;
    }
    setOverlay({
      type: "choice",
      title: "选择现有分支",
      options: branches.map((branch) => ({ label: branch, value: branch })),
      onSelect: (branchName) => {
        setOverlay({
          type: "text",
          title: "输入 Worktree 目录",
          description: ["默认放在当前仓库同级目录。"],
          initialValue: worktree.suggestWorktreePath(repoRoot, branchName),
          onSubmit: (pathValue) => {
            const resolvedPath = path.resolve(String(pathValue || "").trim());
            safeAction(setOverlay, setStatus, () => {
              worktree.createWorktreeForExistingBranch(repoRoot, branchName, resolvedPath);
              setOverlay({
                type: "choice",
                title: "Worktree 已创建",
                description: [resolvedPath],
                options: [
                  { label: "进入新 worktree 的 shell", value: "shell" },
                  { label: "返回 Worktree 菜单", value: "back" },
                ],
                onSelect: (value) => {
                  setOverlay(null);
                  setStatus({ tone: "success", text: `已创建 ${branchName}` });
                  if (value === "shell") {
                    requestShell(resolvedPath);
                  }
                },
                onCancel: () => setOverlay(null),
              });
            });
          },
          onCancel: () => setOverlay(null),
        });
      },
      onCancel: () => setOverlay(null),
    });
  }

  function openWorktreeList() {
    const items = worktree.listWorktrees(repoRoot);
    setOverlay({
      type: "choice",
      title: "现有 Worktree",
      options: items.length > 0
        ? items.map((item) => ({
            label: item.branch || "detached",
            value: "ok",
            hint: item.path,
          }))
        : [{ label: "当前没有额外 worktree", value: "ok" }],
      onSelect: () => setOverlay(null),
      onCancel: () => setOverlay(null),
    });
  }

  useInput((input, key) => {
    if (overlay) {
      return;
    }
    if (key.escape) {
      onBack();
      return;
    }
    if (key.upArrow || input === "k") {
      setActionIndex((current) => (current === 0 ? actions.length - 1 : current - 1));
      return;
    }
    if (key.downArrow || input === "j") {
      setActionIndex((current) => (current === actions.length - 1 ? 0 : current + 1));
      return;
    }
    if (!repoRoot) {
      if (key.return) {
        onBack();
      }
      return;
    }
    if (key.return) {
      const action = actions[actionIndex].key;
      if (action === "new") openNewWorktreeFlow();
      if (action === "existing") openExistingWorktreeFlow();
      if (action === "list") openWorktreeList();
      if (action === "back") onBack();
    }
  });

  return h(
    ScreenFrame,
    {
      title: "callcli",
      subtitle: "Worktree Builder",
      shortcuts: "Enter 执行  Esc 返回",
      status,
    },
    h(ListBlock, {
      title: "Actions",
      hint: repoRoot ? `仓库: ${compactText(repoRoot, 56)}  当前分支: ${currentBranch}` : "当前目录不是 git 仓库",
      items: actions,
      selectedIndex: actionIndex,
      active: true,
    }),
    overlay
      ? renderOverlay(overlay)
      : h(
          Box,
          { marginTop: 1, flexDirection: "column" },
          h(KeyHint, { text: "由于 CLI 进程无法直接改父 shell cwd，所以创建后会提供进入子 shell。" }),
          !repoRoot ? h(KeyHint, { text: "请先 cd 到一个 git 仓库目录再使用。", tone: theme.red }) : null,
        ),
  );
}

function HomeScreen({ openScreen, status }) {
  const { exit } = useApp();
  const [index, setIndex] = useState(0);
  const items = [
    { label: "编辑大模型供应商", hint: "Monokai 风格的 Provider Studio", value: "providers", tone: theme.cyan },
    { label: "编辑智能体", hint: "少打字、列表优先的 Sprite Studio", value: "sprites", tone: theme.green },
    { label: "创建 Worktree", hint: "常用 git worktree 封装", value: "worktree", tone: theme.orange },
    { label: "退出", hint: "Esc 也可以直接退出", value: "exit", tone: theme.red },
  ];

  useInput((input, key) => {
    if (key.escape) {
      exit();
      return;
    }
    if (key.upArrow || input === "k") {
      setIndex((current) => (current === 0 ? items.length - 1 : current - 1));
      return;
    }
    if (key.downArrow || input === "j") {
      setIndex((current) => (current === items.length - 1 ? 0 : current + 1));
      return;
    }
    if (key.return) {
      if (items[index].value === "exit") exit();
      else openScreen(items[index].value);
    }
  });

  return h(
    ScreenFrame,
    {
      title: "callcli",
      subtitle: "Main Menu",
      shortcuts: "↑/↓ 选择  Enter 进入  Esc 退出",
      status,
    },
    h(ListBlock, {
      title: "Main Menu",
      hint: "单面板导航",
      items: items.map((item) => ({ key: item.value, label: item.label, hint: item.hint })),
      selectedIndex: index,
      active: true,
    }),
  );
}

function renderOverlay(overlay) {
  if (overlay.type === "text") {
    return h(TextInputModal, overlay);
  }
  if (overlay.type === "choice") {
    return h(ChoiceModal, overlay);
  }
  if (overlay.type === "multi") {
    return h(MultiSelectModal, overlay);
  }
  return null;
}

function App() {
  const { exit } = useApp();
  const [screen, setScreen] = useState("home");
  const [status, setStatus] = useState({ tone: "info", text: "Ink + Monokai 已启用。Provider 编辑支持字段级修改。" });

  useEffect(() => {
    const bootstrapped = runtime.ensureReady();
    if (bootstrapped) {
      setStatus({ tone: "success", text: `已初始化配置目录: ${runtime.CONFIG_BASE}` });
    }
  }, []);

  const goHome = () => setScreen("home");
  const requestShell = (pathValue) => {
    pendingShellPath = pathValue;
    exit();
  };

  let content = null;
  if (screen === "home") {
    content = h(HomeScreen, { openScreen: setScreen, status });
  }
  if (screen === "providers") {
    content = h(ProviderScreen, { onBack: goHome, setStatus, status });
  }
  if (screen === "sprites") {
    content = h(SpriteScreen, { onBack: goHome, setStatus, status });
  }
  if (screen === "worktree") {
    content = h(WorktreeScreen, { onBack: goHome, setStatus, requestShell, status });
  }

  return h(Box, { flexDirection: "column", paddingX: 1, paddingY: 0 }, content);
}

export async function runCallCli() {
  const app = render(h(App), {
    exitOnCtrlC: true,
  });
  await app.waitUntilExit();
  if (pendingShellPath) {
    const pathValue = pendingShellPath;
    pendingShellPath = "";
    launchShell(pathValue);
  }
}
