# 实时基金估值 (Real-time Fund Valuation)

一个基于 Next.js 开发的纯前端基金估值与重仓股实时追踪工具。采用玻璃拟态设计（Glassmorphism），支持移动端适配，且无需后端服务器即可运行。

预览地址：[https://Nelsontop.github.io/real-time-fund/](https://Nelsontop.github.io/real-time-fund/)

## ✨ 特性

- **📊 实时估值**：通过输入基金编号，实时获取并展示基金的单位净值、估值净值及实时涨跌幅
- **📈 历史走势**：点击基金卡片查看详情弹窗，展示近 7 天、1 月、3 月、6 月、1 年的历史净值曲线图
- **🏢 重仓追踪**：在详情弹窗中查看基金前 10 大重仓股票及占比
- **📤 分组操作**：在详情弹窗中可直接将基金移出当前分组
- **💾 数据备份**：支持导出/导入配置，启用云同步实现跨设备数据备份
- **🌐 纯前端运行**：采用 JSONP 方案直连东方财富、腾讯财经等公开接口，彻底解决跨域问题
- **🔄 本地持久化**：使用 `localStorage` 存储已添加的基金列表及配置信息，刷新不丢失
- **📱 响应式设计**：完美适配 PC 与移动端，针对移动端优化了交互体验
- **⭐ 自选功能**：支持将基金添加至"自选"列表，通过 Tab 切换快速访问
- **⏱️ 可自定义频率**：支持设置自动刷新间隔（5秒 - 300秒），并提供手动刷新按钮
- **👥 分组管理**：支持创建自定义分组，便于管理不同类型的基金
- **💰 持仓追踪**：支持记录基金持有份额和成本，自动计算盈亏

## 🛠 技术栈

- **框架**：[Next.js](https://nextjs.org/) 16 (App Router)
- **UI 库**：[Framer Motion](https://www.framer.com/motion/) (动画)、[Recharts](https://recharts.org/) (图表)
- **样式**：原生 CSS (Global CSS) + 玻璃拟态设计
- **数据源**：
  - 基金估值：天天基金 (JSONP)
  - 历史净值：东方财富 (分页获取)
  - 重仓数据：东方财富 (HTML Parsing)
  - 股票行情：腾讯财经 (Script Tag Injection)
- **云同步**：[Supabase](https://supabase.com/) (认证 + 数据库)
- **部署**：GitHub Actions + GitHub Pages / Docker

## 🚀 快速开始

### Docker 运行（推荐）

使用 Docker Compose 快速启动：

```bash
# 克隆仓库
git clone https://github.com/Nelsontop/real-time-fund.git
cd real-time-fund

# 启动服务（自动构建）
docker compose up -d --build

# 访问应用
open http://localhost:3000
```

**特点**：
- ✅ 自动重启策略 (`unless-stopped`)
- ✅ 健康检查（30秒间隔）
- ✅ 系统重启后自动启动
- ✅ 数据存储在浏览器中，容器重启不影响数据

### 手动构建

```bash
# 安装依赖
npm install --legacy-peer-deps

# 开发模式
npm run dev

# 生产构建
npm run build

# 预览构建
npm start
```

### 配置环境变量（可选）

如需使用云同步功能，创建 `.env.local` 文件：

```bash
cp env.example .env.local
```

填入以下值：
- `NEXT_PUBLIC_SUPABASE_URL`：Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`：Supabase 匿名公钥
- `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY`：Web3Forms Access Key

## 📖 使用说明

### 基本操作

1. **添加基金**：在顶部输入框输入 6 位基金代码（如 `110022`），点击"添加"
2. **查看详情**：点击基金卡片空白区域，弹出详情窗口
   - 查看历史净值走势图（近7天、1月、3月、6月、1年）
   - 查看期间涨跌幅
   - 查看前10重仓股票
   - 分组内基金可移出分组
3. **调整频率**：点击右上角"设置"图标，可调整自动刷新的间隔时间
4. **删除基金**：在详情弹窗底部点击"删除基金"按钮

### 分组管理

1. 点击分组栏右侧的 "+" 按钮
2. 输入分组名称
3. 添加基金到分组
4. 通过 Tab 切换不同分组

### 持仓追踪

1. 在基金卡片上点击持仓金额区域
2. 输入持有份额和成本价
3. 自动计算盈亏和收益率

### 数据备份

**方法1：导出/导入**（推荐）
```
设置 → 导出配置 → 保存 JSON 文件
设置 → 选择文件 → 导入配置
```

**方法2：云同步**
```
点击用户图标 → 输入邮箱 → 验证码登录 → 自动同步
```

详细说明：[数据持久化指南](./docs/DATA_PERSISTENCE.md)

## 🧪 测试工具

项目包含自动化测试工具：

```bash
# 验证备份文件格式
node scripts/validate-backup.js ~/Downloads/realtime-fund-config-*.json

# 运行完整功能测试
bash scripts/test-backup.sh

# 查看备份提示
bash scripts/backup-data.sh
```

## 📁 项目结构

```
real-time-fund/
├── app/
│   ├── page.jsx              # 主应用（~5000行）
│   ├── layout.jsx            # 根布局
│   ├── globals.css           # 全局样式（玻璃拟态）
│   ├── components/           # 可复用组件
│   ├── lib/                  # Supabase 客户端
│   └── api/                  # API 函数
├── scripts/
│   ├── validate-backup.js    # 备份文件验证工具
│   ├── test-backup.sh        # 备份功能测试脚本
│   └── backup-data.sh        # 备份指导脚本
├── docs/
│   ├── DATA_PERSISTENCE.md   # 数据持久化详细指南
│   └── BACKUP_TEST_REPORT.md # 备份功能测试报告
├── docker-compose.yml        # Docker Compose 配置
├── Dockerfile                # Docker 镜像构建
└── CLAUDE.md                 # 开发指南（给 Claude Code 用）
```

## 🔧 开发指南

详细的开发指南请查看 [CLAUDE.md](./CLAUDE.md)，包含：
- 强制性开发工作流程
- Docker 开发环境设置
- 架构设计说明
- 代码模式和约定

## 📊 数据说明

### 数据存储位置

**重要**：所有数据存储在**浏览器的 localStorage** 中

| 操作 | 数据是否丢失 |
|------|-------------|
| 重启容器 | ❌ 不丢失 |
| 删除容器 | ❌ 不丢失 |
| 清除浏览器缓存 | ✅ **会丢失** |
| 更换浏览器 | ✅ **会丢失** |

### 务必备份的场景

- [ ] 清除浏览器缓存之前
- [ ] 更换浏览器之前
- [ ] 重装操作系统之前
- [ ] 定期备份（建议每月一次）

## 📝 免责声明

本项目所有数据均来自公开接口，仅供个人学习及参考使用。数据可能存在延迟，不作为任何投资建议。

## 📄 开源协议 (License)

本项目采用 **[GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.html)**（AGPL-3.0）开源协议。

- **允许**：自由使用、修改、分发本软件；若您通过网络服务向用户提供基于本项目的修改版本，须向该服务的用户提供对应源代码。
- **要求**：基于本项目衍生或修改的作品需以相同协议开源，并保留版权声明与协议全文。
- **无担保**：软件按「原样」提供，不提供任何明示或暗示的担保。

完整协议文本见仓库根目录 [LICENSE](./LICENSE) 文件，或 [GNU AGPL v3 官方说明](https://www.gnu.org/licenses/agpl-3.0.html)。

---
