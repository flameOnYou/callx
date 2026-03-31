const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function runGit(cwd, args) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
  });

  if (result.error) {
    if (result.error.code === "ENOENT") {
      throw new Error("未找到 git 命令");
    }
    throw result.error;
  }

  if (result.status !== 0) {
    const output = (result.stderr || result.stdout || "").trim();
    throw new Error(output || `git ${args.join(" ")} 执行失败`);
  }

  return (result.stdout || "").trim();
}

function findGitRoot(cwd) {
  try {
    return runGit(cwd, ["rev-parse", "--show-toplevel"]);
  } catch {
    return "";
  }
}

function getCurrentBranch(repoRoot) {
  try {
    return runGit(repoRoot, ["branch", "--show-current"]);
  } catch {
    return "";
  }
}

function listLocalBranches(repoRoot) {
  const output = runGit(repoRoot, ["for-each-ref", "--format=%(refname:short)", "refs/heads"]);
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .sort();
}

function listWorktrees(repoRoot) {
  const output = runGit(repoRoot, ["worktree", "list", "--porcelain"]);
  const lines = output.split("\n");
  const worktrees = [];
  let current = null;

  for (const line of lines) {
    if (!line.trim()) {
      if (current) {
        worktrees.push(current);
        current = null;
      }
      continue;
    }

    const [key, ...rest] = line.split(" ");
    const value = rest.join(" ").trim();

    if (key === "worktree") {
      current = { path: value, branch: "", detached: false };
      continue;
    }
    if (!current) {
      continue;
    }
    if (key === "branch") {
      current.branch = value.replace(/^refs\/heads\//, "");
      continue;
    }
    if (key === "detached") {
      current.detached = true;
    }
  }

  if (current) {
    worktrees.push(current);
  }

  return worktrees;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/\//g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function timestamp() {
  const now = new Date();
  const parts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ];
  return `${parts[0]}${parts[1]}${parts[2]}-${parts[3]}${parts[4]}${parts[5]}`;
}

function suggestBranchName(repoRoot) {
  const repoName = slugify(path.basename(repoRoot)) || "repo";
  return `codex/${repoName}-${timestamp()}`;
}

function ensureUniqueBranchName(repoRoot, baseName) {
  const existing = new Set(listLocalBranches(repoRoot));
  if (!existing.has(baseName)) {
    return baseName;
  }
  let index = 2;
  while (existing.has(`${baseName}-${index}`)) {
    index += 1;
  }
  return `${baseName}-${index}`;
}

function suggestWorktreePath(repoRoot, branchName) {
  const repoName = slugify(path.basename(repoRoot)) || "repo";
  const branchPart = slugify(branchName.replace(/^codex\//, "")) || timestamp();
  const basePath = path.join(path.dirname(repoRoot), `${repoName}-${branchPart}`);
  if (!fs.existsSync(basePath)) {
    return basePath;
  }
  let index = 2;
  while (fs.existsSync(`${basePath}-${index}`)) {
    index += 1;
  }
  return `${basePath}-${index}`;
}

function getAvailableBranchesForWorktree(repoRoot) {
  const branches = new Set(listLocalBranches(repoRoot));
  const usedBranches = new Set(
    listWorktrees(repoRoot)
      .map((item) => item.branch)
      .filter(Boolean),
  );
  return [...branches].filter((branch) => !usedBranches.has(branch)).sort();
}

function createWorktreeForNewBranch(repoRoot, branchName, worktreePath, startPoint) {
  runGit(repoRoot, ["worktree", "add", "-b", branchName, worktreePath, startPoint]);
}

function createWorktreeForExistingBranch(repoRoot, branchName, worktreePath) {
  runGit(repoRoot, ["worktree", "add", worktreePath, branchName]);
}

module.exports = {
  createWorktreeForExistingBranch,
  createWorktreeForNewBranch,
  ensureUniqueBranchName,
  findGitRoot,
  getAvailableBranchesForWorktree,
  getCurrentBranch,
  listLocalBranches,
  listWorktrees,
  runGit,
  suggestBranchName,
  suggestWorktreePath,
};
