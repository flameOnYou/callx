# 技能库管理

所有技能统一存放在 `~/.config/callx/skillpacks/`，遵循 [Agent Skills](https://agentskills.io) 开放规范。

## 工作原理

各 sprite 通过 `config.json` 的 `skill_links` 字段声明需要哪些技能，`call` 启动时自动在对应 sprite 的 `skills/` 目录下建立软链接，指向 `skillpacks/` 中的技能。

**修改技能只需改 `skillpacks/`，所有 sprite 立即生效。**

## 内置技能

| 技能 | 说明 |
|------|------|
| `code-skill` | 代码质量检查，自动检测语言并运行对应 linter |
| `send-email` | 通过 msmtp 发送邮件，支持正文和附件 |

## 嵌套技能（技能组）

技能支持嵌套组织。当一个目录的子目录中包含 `SKILL.md` 时，它被视为**技能组**，引用时会自动展开所有子技能：

```text
skillpacks/
├── code-skill/          # 普通技能
│   └── SKILL.md
└── devops/              # 技能组
    ├── docker/
    │   └── SKILL.md
    ├── k8s/
    │   └── SKILL.md
    └── ci/
        └── SKILL.md
```

配置 `"skill_links": ["devops"]` 等价于分别引用 docker、k8s、ci 三个技能，它们会被平铺链接到 `skills/` 目录下。

如果只需要其中一个子技能，使用路径写法：

```json
{
  "skill_links": ["devops/docker"]
}
```

判断规则：
- 子目录包含 `SKILL.md` → 技能组，展开子技能
- 否则 → 普通技能，整体链接

## 新增技能

1. 将技能目录放入 `skillpacks/`
2. 在需要的 sprite 的 `config.json` 的 `skill_links` 里加上技能名
3. 下次召唤时自动生效

## 邮件技能依赖

`send-email` 技能依赖 `msmtp`，请确保 `~/.msmtprc` 已配置好 SMTP 账户。
