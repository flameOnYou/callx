const fs = require("fs");
const os = require("os");
const path = require("path");

const SCRIPT_DIR = path.join(__dirname, "..");
const CONFIG_BASE = path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"), "callx");
const SPRITES_DIR = path.join(CONFIG_BASE, "sprites");
const SKILLPACKS_DIR = path.join(CONFIG_BASE, "skillpacks");
const MCPSERVERS_DIR = path.join(CONFIG_BASE, "mcpservers");
const PROVIDERS_FILE = path.join(CONFIG_BASE, "providers.json");
const DEFAULT_FILE = path.join(CONFIG_BASE, ".default");
const SPRITE_SUBDIRS = ["agents", "commands", "modes", "plugins", "skills", "tools", "themes"];

function fileExists(target) {
  return fs.existsSync(target);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyMissing(srcRoot, dstRoot) {
  if (!fileExists(srcRoot)) {
    return;
  }
  ensureDir(dstRoot);
  for (const entry of fs.readdirSync(srcRoot, { withFileTypes: true })) {
    const src = path.join(srcRoot, entry.name);
    const dst = path.join(dstRoot, entry.name);
    if (fileExists(dst)) {
      continue;
    }
    if (entry.isDirectory()) {
      fs.cpSync(src, dst, { recursive: true });
    } else {
      fs.copyFileSync(src, dst);
    }
  }
}

function readJson(file, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function bootstrapConfigIfMissing() {
  const needsBootstrap = !fileExists(PROVIDERS_FILE) || !fileExists(SPRITES_DIR) || !fileExists(SKILLPACKS_DIR);
  if (!needsBootstrap) {
    return false;
  }

  ensureDir(CONFIG_BASE);
  ensureDir(SPRITES_DIR);
  ensureDir(SKILLPACKS_DIR);
  ensureDir(MCPSERVERS_DIR);

  const providersSeed = path.join(SCRIPT_DIR, "providers.example.json");
  if (fileExists(providersSeed) && !fileExists(PROVIDERS_FILE)) {
    fs.copyFileSync(providersSeed, PROVIDERS_FILE);
  }

  copyMissing(path.join(SCRIPT_DIR, "sprites"), SPRITES_DIR);
  copyMissing(path.join(SCRIPT_DIR, "skillpacks"), SKILLPACKS_DIR);
  copyMissing(path.join(SCRIPT_DIR, "mcpservers"), MCPSERVERS_DIR);

  if (!fileExists(DEFAULT_FILE) && fileExists(path.join(SPRITES_DIR, "open-01"))) {
    fs.writeFileSync(DEFAULT_FILE, "open-01\n", "utf8");
  }

  return true;
}

function ensureReady() {
  return bootstrapConfigIfMissing();
}

function getDefault() {
  if (!fileExists(DEFAULT_FILE)) {
    return "";
  }
  return fs.readFileSync(DEFAULT_FILE, "utf8").trim();
}

function setDefault(name) {
  const dir = path.join(SPRITES_DIR, name);
  if (!fileExists(dir)) {
    throw new Error(`sprite '${name}' 不存在`);
  }
  fs.writeFileSync(DEFAULT_FILE, `${name}\n`, "utf8");
}

function clearDefault() {
  if (fileExists(DEFAULT_FILE)) {
    fs.rmSync(DEFAULT_FILE, { force: true });
  }
}

function sortKeys(value) {
  const result = {};
  for (const key of Object.keys(value).sort()) {
    result[key] = value[key];
  }
  return result;
}

function normalizeProvider(provider) {
  const normalized = {};
  if ("base_url" in provider) normalized.base_url = provider.base_url;
  if ("api_key" in provider) normalized.api_key = provider.api_key;
  if ("format" in provider) normalized.format = provider.format;
  if ("remark" in provider) normalized.remark = provider.remark;
  for (const [key, value] of Object.entries(provider)) {
    if (!(key in normalized)) {
      normalized[key] = value;
    }
  }
  return normalized;
}

function normalizeProviders(providers) {
  const normalized = {};
  for (const name of Object.keys(providers).sort()) {
    normalized[name] = normalizeProvider(providers[name] || {});
  }
  return normalized;
}

function getProviders() {
  return readJson(PROVIDERS_FILE, {});
}

function saveProviders(providers) {
  writeJson(PROVIDERS_FILE, normalizeProviders(providers));
}

function listProviderNames() {
  return Object.keys(getProviders()).sort();
}

function getProvider(providerName) {
  return getProviders()[providerName] || {};
}

function getProviderValue(providerName, field) {
  return getProvider(providerName)?.[field] || "";
}

function getSpriteDir(name) {
  return path.join(SPRITES_DIR, name);
}

function getSpriteConfigPath(name) {
  return path.join(getSpriteDir(name), "config.json");
}

function normalizeSpriteConfig(config) {
  const normalized = {};
  if ("cli" in config) normalized.cli = config.cli;
  if ("provider" in config) normalized.provider = config.provider;
  if ("model" in config) normalized.model = config.model;
  if ("autoupdate" in config) normalized.autoupdate = config.autoupdate;
  if ("skill_links" in config) normalized.skill_links = Array.isArray(config.skill_links) ? config.skill_links : [];
  if ("mcp_links" in config) normalized.mcp_links = Array.isArray(config.mcp_links) ? config.mcp_links : [];
  for (const [key, value] of Object.entries(config)) {
    if (!(key in normalized)) {
      normalized[key] = value;
    }
  }
  return normalized;
}

function getSpriteConfig(name) {
  return readJson(getSpriteConfigPath(name), {});
}

function listSpriteNames() {
  if (!fileExists(SPRITES_DIR)) {
    return [];
  }
  return fs
    .readdirSync(SPRITES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function ensureSpriteScaffold(name) {
  const spriteDir = getSpriteDir(name);
  ensureDir(spriteDir);
  for (const subdir of SPRITE_SUBDIRS) {
    ensureDir(path.join(spriteDir, subdir));
  }
}

function saveSpriteConfig(name, config) {
  ensureSpriteScaffold(name);
  writeJson(getSpriteConfigPath(name), normalizeSpriteConfig(config));
}

function createSpriteFromTemplate(name, sourceName = "") {
  const targetDir = getSpriteDir(name);
  if (fileExists(targetDir)) {
    throw new Error(`sprite '${name}' 已存在`);
  }
  if (sourceName) {
    const sourceDir = getSpriteDir(sourceName);
    if (!fileExists(sourceDir)) {
      throw new Error(`模板 sprite '${sourceName}' 不存在`);
    }
    fs.cpSync(sourceDir, targetDir, { recursive: true });
    return;
  }
  ensureSpriteScaffold(name);
}

function deleteSprite(name) {
  const spriteDir = getSpriteDir(name);
  if (!fileExists(spriteDir)) {
    throw new Error(`sprite '${name}' 不存在`);
  }
  fs.rmSync(spriteDir, { recursive: true, force: true });
  if (getDefault() === name) {
    clearDefault();
  }
}

function getSubSkills(dir) {
  if (!fileExists(dir)) {
    return [];
  }
  const subs = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && fileExists(path.join(dir, entry.name, "SKILL.md"))) {
      subs.push(entry.name);
    }
  }
  return subs.sort();
}

function getAvailableSkillLinks() {
  if (!fileExists(SKILLPACKS_DIR)) {
    return [];
  }
  const links = new Set();
  for (const entry of fs.readdirSync(SKILLPACKS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const packDir = path.join(SKILLPACKS_DIR, entry.name);
    if (fileExists(path.join(packDir, "SKILL.md"))) {
      links.add(entry.name);
    }
    for (const sub of getSubSkills(packDir)) {
      links.add(`${entry.name}/${sub}`);
    }
  }
  return [...links].sort();
}

function getAvailableMcpServers() {
  if (!fileExists(MCPSERVERS_DIR)) {
    return [];
  }
  return fs
    .readdirSync(MCPSERVERS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fileExists(path.join(MCPSERVERS_DIR, entry.name, "mcp.json")))
    .map((entry) => entry.name)
    .sort();
}

function syncSkills(sprite) {
  const config = getSpriteConfig(sprite);
  const links = Array.isArray(config.skill_links) ? config.skill_links : [];
  const skillsDir = path.join(getSpriteDir(sprite), "skills");
  ensureDir(skillsDir);

  const expectedLinks = new Set();

  for (const skill of links) {
    if (skill.includes("/")) {
      const target = path.join(SKILLPACKS_DIR, skill);
      if (!fileExists(target)) {
        continue;
      }
      const linkName = path.basename(skill);
      expectedLinks.add(linkName);
      const link = path.join(skillsDir, linkName);
      if (fileExists(link)) {
        fs.rmSync(link, { recursive: true, force: true });
      }
      const type = process.platform === "win32" ? "junction" : "dir";
      fs.symlinkSync(target, link, type);
      continue;
    }

    const target = path.join(SKILLPACKS_DIR, skill);
    if (!fileExists(target)) {
      continue;
    }
    const subs = getSubSkills(target);
    if (subs.length > 0) {
      for (const sub of subs) {
        expectedLinks.add(sub);
        const link = path.join(skillsDir, sub);
        if (fileExists(link)) {
          fs.rmSync(link, { recursive: true, force: true });
        }
        const type = process.platform === "win32" ? "junction" : "dir";
        fs.symlinkSync(path.join(target, sub), link, type);
      }
      continue;
    }
    expectedLinks.add(skill);
    const link = path.join(skillsDir, skill);
    if (fileExists(link)) {
      fs.rmSync(link, { recursive: true, force: true });
    }
    const type = process.platform === "win32" ? "junction" : "dir";
    fs.symlinkSync(target, link, type);
  }

  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    const fullPath = path.join(skillsDir, entry.name);
    if (!expectedLinks.has(entry.name) && fs.lstatSync(fullPath).isSymbolicLink()) {
      fs.unlinkSync(fullPath);
    }
  }
}

function syncMcp(sprite) {
  const config = getSpriteConfig(sprite);
  const links = Array.isArray(config.mcp_links) ? config.mcp_links : [];
  if (links.length === 0) {
    return {};
  }

  const servers = {};
  for (const name of links) {
    const mcpFile = path.join(MCPSERVERS_DIR, name, "mcp.json");
    if (!fileExists(mcpFile)) {
      continue;
    }
    const def = readJson(mcpFile, {});
    if (def.enabled === false) {
      continue;
    }
    servers[name] = def;
  }
  return servers;
}

function buildClaudeMcpJson(servers) {
  const result = {};
  for (const [name, def] of Object.entries(servers)) {
    if (def.type === "remote") {
      result[name] = { type: "http", url: def.url };
      if (def.headers) result[name].headers = def.headers;
      continue;
    }
    result[name] = { command: def.command, args: def.args || [] };
    if (def.env && Object.keys(def.env).length > 0) {
      result[name].env = def.env;
    }
  }
  return result;
}

function buildOpenCodeMcp(servers) {
  const result = {};
  for (const [name, def] of Object.entries(servers)) {
    if (def.type === "remote") {
      const entry = { type: "remote", url: def.url };
      if (def.headers) entry.headers = def.headers;
      if (def.oauth) entry.oauth = def.oauth;
      result[name] = entry;
      continue;
    }
    const entry = {
      type: "local",
      command: [def.command, ...(def.args || [])],
      enabled: true,
    };
    if (def.env && Object.keys(def.env).length > 0) {
      entry.environment = def.env;
    }
    if (def.timeout) {
      entry.timeout = def.timeout;
    }
    result[name] = entry;
  }
  return result;
}

function buildOpenCodeConfig(sprite, autoMode) {
  const spriteCfg = getSpriteConfig(sprite);
  const providers = getProviders();
  const providerName = spriteCfg.provider || "";

  const config = {
    $schema: "https://opencode.ai/config.json",
  };

  if (spriteCfg.model) {
    config.model = spriteCfg.model;
  }
  if (spriteCfg.autoupdate) {
    config.autoupdate = spriteCfg.autoupdate;
  }
  if (Array.isArray(spriteCfg.skill_links) && spriteCfg.skill_links.length > 0) {
    config.skills = { paths: ["./skills"] };
  } else if (spriteCfg.skills) {
    config.skills = spriteCfg.skills;
  }

  if (providerName && providers[providerName]) {
    const prov = providers[providerName];
    if (prov.format === "anthropic") {
      config.provider = {
        anthropic: {
          options: {
            apiKey: prov.api_key || "",
            baseURL: prov.base_url || "",
          },
        },
      };
    } else {
      config.provider = {
        [providerName]: {
          options: {
            apiKey: prov.api_key || "",
            baseURL: prov.base_url || "",
          },
        },
      };
    }
  }

  if (autoMode) {
    config.permission = "allow";
  }

  const mcpServers = syncMcp(sprite);
  if (Object.keys(mcpServers).length > 0) {
    config.mcp = buildOpenCodeMcp(mcpServers);
  }

  return JSON.stringify(config);
}

module.exports = {
  CONFIG_BASE,
  DEFAULT_FILE,
  MCPSERVERS_DIR,
  PROVIDERS_FILE,
  SKILLPACKS_DIR,
  SPRITES_DIR,
  bootstrapConfigIfMissing,
  buildClaudeMcpJson,
  buildOpenCodeConfig,
  buildOpenCodeMcp,
  clearDefault,
  createSpriteFromTemplate,
  deleteSprite,
  ensureDir,
  ensureReady,
  ensureSpriteScaffold,
  fileExists,
  getAvailableMcpServers,
  getAvailableSkillLinks,
  getDefault,
  getProvider,
  getProviderValue,
  getProviders,
  getSpriteConfig,
  getSpriteConfigPath,
  getSpriteDir,
  listProviderNames,
  listSpriteNames,
  readJson,
  saveProviders,
  saveSpriteConfig,
  setDefault,
  sortKeys,
  syncMcp,
  syncSkills,
  writeJson,
};
