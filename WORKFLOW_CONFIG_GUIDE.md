# Workflow Configuration Guide

## 新功能概述

为了简化新用户的上手流程，我们添加了以下新功能：

### 1. 可视化工作流配置管理器 🎨

用户现在可以在 UI 中直接创建、编辑和删除 workflow，无需手动编辑 markdown 文件。

**使用方式：**
- 通过命令面板：`Ctrl/Cmd + P` → 输入 "Manage Workflows"
- 在 Manage Page 中点击 "Manage Workflows" 按钮
- 所有配置会自动保存到 `tag-project-config.md` 文件

**功能特性：**
- ✅ 创建新的 workflow
- ✅ 编辑已有的 workflow
- ✅ 删除不需要的 workflow
- ✅ 实时预览 workflow 列表
- ✅ 自动验证 workflow 名称和步骤
- ✅ 自动刷新数据库

### 2. 快速开始向导 🚀

首次使用或没有 workflow 时，会看到一个友好的向导界面，帮助快速创建常用的 workflow 模板。

**使用方式：**
- 通过命令面板：`Ctrl/Cmd + P` → 输入 "Quick Start Wizard"
- 在空的 Manage Page 中点击 "Quick Start Wizard" 按钮

**预设模板：**

1. **📝 Development Workflow** (Chain)
   - Steps: `todo` → `doing` → `review` → `done`
   - 适用于：功能开发、bug 修复、顺序工作

2. **🔍 Research Workflow** (Chain)
   - Steps: `identify` → `investigate` → `summarize` → `apply`
   - 适用于：研究任务、学习新主题、调查工作

3. **✅ Review Workflow** (Checkbox)
   - Steps: `content`, `grammar`, `formatting`, `accuracy`
   - 适用于：审查工作，步骤可以任意顺序完成

### 3. 自动配置文件管理 📄

系统会自动创建和管理 `tag-project-config.md` 配置文件：

- 首次使用时自动创建
- 包含示例 workflow 作为参考
- 可以通过 UI 或手动编辑
- 所有 UI 操作会实时同步到文件

## 配置文件格式

`tag-project-config.md` 文件使用标准的 markdown 任务格式：

```markdown
# Tag Project Configuration

## Your Workflows

- [ ] workflow_name #tpm/workflow_type/chain #tpm/step/step1 #tpm/step/step2 #tpm/step/step3
- [ ] another_workflow #tpm/workflow_type/checkbox #tpm/step/todo #tpm/step/done
```

### Workflow 类型

1. **Chain** (`#tpm/workflow_type/chain`)
   - 步骤按顺序完成
   - 适合有明确流程的任务

2. **Checkbox** (`#tpm/workflow_type/checkbox`)
   - 步骤可以任意顺序完成
   - 适合独立的检查项

### 添加 Project (可选)

可以为 workflow 指定所属项目：

```markdown
- [ ] my_workflow #tpm/workflow_type/chain #tpm/step/todo #tpm/step/done #prj/my_project
```

## 使用示例

### 创建第一个 Workflow

1. 打开 Obsidian
2. 打开命令面板 (`Ctrl/Cmd + P`)
3. 输入 "Quick Start Wizard" 并选择
4. 按照向导选择预设模板
5. 点击 "Finish" 完成创建

### 自定义 Workflow

1. 打开 Manage Page
2. 点击 "Manage Workflows" 按钮
3. 在表单中填写：
   - **Name**: workflow 名称（只能包含字母、数字、下划线、连字符）
   - **Type**: 选择 Chain 或 Checkbox
   - **Steps**: 逗号分隔的步骤列表，如 `todo, doing, done`
   - **Project**: （可选）所属项目名称
4. 点击 "Create" 创建

### 使用 Workflow

创建 workflow 后，在任何 markdown 文件中创建任务：

```markdown
- [ ] 实现用户登录功能 #tpm/workflow/development
- [ ] 研究新的框架 #tpm/workflow/research
- [ ] 审查文档 #tpm/workflow/review
```

然后在 Manage Page 中就能看到这些任务，并按 workflow 管理它们。

## 新增命令

| 命令 | 描述 | 快捷键 |
|------|------|--------|
| Manage Workflows | 打开工作流配置管理器 | 可自定义 |
| Quick Start Wizard | 打开快速开始向导 | 可自定义 |

## 改进的用户体验

### 空工作流视图

当没有定义任何 workflow 时，新的界面会显示：
- 醒目的"Quick Start Wizard"按钮
- "Manage Workflows"按钮
- 刷新数据库的选项
- 清晰的指引文字

### Manage Page 增强

在 Project Filter 旁边添加了"Manage Workflows"按钮，方便随时管理 workflow 配置。

## 技术实现

### 新增文件

```
src/ui/obsidian/workflow-config-manager/
├── workflow-config-modal.tsx     # 配置管理模态框和工具函数
├── workflow-config-editor.tsx    # 配置编辑器 UI 组件
└── onboarding-wizard.tsx         # 快速开始向导组件
```

### 核心功能

- **parseWorkflowsFromMarkdown**: 从 markdown 内容解析 workflow 定义
- **addWorkflowToConfig**: 添加新的 workflow 到配置文件
- **updateWorkflowInConfig**: 更新已有的 workflow
- **deleteWorkflowFromConfig**: 删除 workflow
- **getOrCreateConfigFile**: 获取或创建配置文件

### 集成点

- `src/main.ts`: 添加新命令
- `src/ui/react-view/react-manage-page.tsx`: 添加 UI 按钮和改进空视图

## 未来改进建议

1. 支持批量导入 workflow
2. 导出 workflow 配置为模板
3. 在线 workflow 模板市场
4. Workflow 可视化编辑器（拖拽式）
5. Workflow 统计和分析
6. 支持 workflow 之间的依赖关系

## 常见问题

### Q: 配置文件在哪里？
A: 配置文件 `tag-project-config.md` 会自动创建在 vault 的根目录。

### Q: 我可以手动编辑配置文件吗？
A: 可以！UI 和手动编辑都会生效，系统会自动同步。

### Q: 如何删除所有 workflow？
A: 可以在 Manage Workflows 界面中逐个删除，或者直接编辑 `tag-project-config.md` 文件。

### Q: Workflow 名称有什么限制？
A: Workflow 名称只能包含字母、数字、下划线（_）和连字符（-），不能包含空格和特殊字符。

### Q: 更改会立即生效吗？
A: 是的，所有更改会自动触发数据库刷新，立即在 Manage Page 中反映。

## 贡献

如果您有任何建议或发现问题，欢迎提交 Issue 或 Pull Request。
