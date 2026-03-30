#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const PACKAGE_JSON = path.join(ROOT, "package.json");
const VALID_BUMPS = new Set(["patch", "minor", "major", "prepatch", "preminor", "premajor", "prerelease"]);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, ...options.env },
  });

  if (result.error) {
    if (result.error.code === "ENOENT") {
      fail(`未找到命令: ${command}`);
    }
    fail(result.error.message);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function readPackageVersion() {
  return JSON.parse(fs.readFileSync(PACKAGE_JSON, "utf8")).version;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {
    bump: "",
    publish: false,
    publishOnly: false,
    packOnly: false,
    help: false,
    tag: "",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      args.help = true;
      continue;
    }
    if (VALID_BUMPS.has(arg) || /^\d+\.\d+\.\d+([-.].+)?$/.test(arg)) {
      args.bump = arg;
      continue;
    }
    if (arg === "--publish") {
      args.publish = true;
      continue;
    }
    if (arg === "--publish-only") {
      args.publishOnly = true;
      continue;
    }
    if (arg === "--pack-only") {
      args.packOnly = true;
      continue;
    }
    if (arg === "--tag") {
      if (!argv[i + 1]) {
        fail("缺少 --tag 的值");
      }
      args.tag = argv[i + 1];
      i += 1;
      continue;
    }
    fail(`未知参数: ${arg}`);
  }

  return args;
}

function showHelp() {
  console.log(`release.js 用法:

  node scripts/release.js --pack-only
  node scripts/release.js --publish-only [--tag beta]
  node scripts/release.js <patch|minor|major|prepatch|preminor|premajor|prerelease|x.y.z> [--publish] [--tag beta]

说明:
  --pack-only      只做 npm 打包检查
  --publish-only   不改版本，直接发布当前版本
  --publish        版本升级后立刻发布
  --tag <name>     发布到指定 dist-tag，例如 beta
`);
}

function ensureCleanGit() {
  const result = spawnSync("git", ["status", "--porcelain"], {
    cwd: ROOT,
    encoding: "utf8",
  });

  if (result.error) {
    fail("无法检查 git 状态");
  }
  if (result.status !== 0) {
    fail("git status 检查失败");
  }
  if (result.stdout.trim()) {
    fail("工作区不是干净状态。请先提交或清理变更，再执行 release。");
  }
}

function ensureNpmAuth() {
  run("npm", ["whoami"]);
}

function packCheck() {
  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "callx-npm-cache-"));
  run("npm", ["pack", "--dry-run", "--cache", cacheDir]);
}

function bumpVersion(bump) {
  if (!bump) {
    fail("请提供版本升级类型，例如 patch/minor/major");
  }
  run("npm", ["version", bump, "-m", "release: %s"]);
}

function publish(tag) {
  const args = ["publish", "--access", "public"];
  if (tag) {
    args.push("--tag", tag);
  }
  run("npm", args);
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    showHelp();
    return;
  }

  if (args.packOnly) {
    packCheck();
    return;
  }

  if (args.publishOnly) {
    ensureNpmAuth();
    packCheck();
    publish(args.tag);
    return;
  }

  ensureCleanGit();
  const before = readPackageVersion();
  bumpVersion(args.bump);
  const after = readPackageVersion();
  console.log(`版本已更新: ${before} -> ${after}`);

  packCheck();

  if (args.publish) {
    ensureNpmAuth();
    publish(args.tag);
  } else {
    console.log("已完成版本升级和打包检查，尚未发布到 npm。");
    console.log("下一步可执行: npm run publish:npm");
  }
}

main();
