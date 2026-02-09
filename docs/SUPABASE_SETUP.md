# Supabase 云同步配置指南

本指南将帮助您配置 Supabase 以启用基估宝的云同步功能。

## 🎯 配置完成后的功能

- ✅ 跨设备同步基金数据
- ✅ 自动备份配置到云端
- ✅ 多设备登录同一账号
- ✅ 实时数据同步

## 📋 配置步骤

### 步骤 1：创建 Supabase 项目

#### 1.1 注册/登录 Supabase

1. 访问 [https://supabase.com](https://supabase.com)
2. 点击 **"Start your project"**
3. 使用 GitHub 账号登录（推荐）

#### 1.2 创建新项目

1. 点击 **"New Project"** 按钮
2. 填写项目信息：

   | 字段 | 值 | 说明 |
   |------|-----|------|
   | **Name** | `real-time-fund` | 项目名称（可自定义） |
   | **Database Password** | `YourStrongPassword123!` | 设置强密码并保存 |
   | **Region** | `Southeast Asia (Singapore)` | 选择离您最近的区域 |
   | **Pricing Plan** | Free | 选择免费套餐 |

3. 点击 **"Create new project"**
4. 等待项目创建完成（约 1-2 分钟）

---

### 步骤 2：获取 API 凭证

#### 2.1 找到 API 设置

1. 在 Supabase 项目界面，点击左侧菜单的 **Settings** (齿轮图标⚙️)
2. 点击 **API** 子菜单

#### 2.2 复制 API 密钥

您会看到以下信息，请复制并保存到安全位置：

```
Project URL: https://xxxxx.supabase.co
Project API Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**重要提示**：
- ✅ `Project URL` → 对应 `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `Project API Key (anon/public)` → 对应 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ⚠️ 不要分享您的 `service_role` 密钥（它有完全访问权限）

---

### 步骤 3：创建数据库表

#### 3.1 打开 SQL Editor

1. 在左侧菜单点击 **SQL Editor** (图标是数据库📊)
2. 点击 **"New query"** 按钮

#### 3.2 执行 SQL 脚本

复制以下完整 SQL 并粘贴到编辑器中，然后点击 **"Run"**：

```sql
-- ============================================
-- 基估宝 - Supabase 数据库配置
-- ============================================

-- 创建用户配置表
CREATE TABLE IF NOT EXISTS public.user_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS user_configs_user_id_idx ON public.user_configs(user_id);

-- 启用行级安全策略 (RLS)
ALTER TABLE public.user_configs ENABLE ROW LEVEL SECURITY;

-- 允许已认证用户查看自己的配置
CREATE POLICY IF NOT EXISTS "Users can view own config"
  ON public.user_configs FOR SELECT
  USING (auth.uid() = user_id);

-- 允许已认证用户插入自己的配置
CREATE POLICY IF NOT EXISTS "Users can insert own config"
  ON public.user_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 允许已认证用户更新自己的配置
CREATE POLICY IF NOT EXISTS "Users can update own config"
  ON public.user_configs FOR UPDATE
  USING (auth.uid() = user_id);

-- 允许已认证用户删除自己的配置
CREATE POLICY IF NOT EXISTS "Users can delete own config"
  ON public.user_configs FOR DELETE
  USING (auth.uid() = user_id);

-- 创建自动更新时间戳的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language plpgsql;

-- 为 user_configs 表创建触发器
DROP TRIGGER IF EXISTS update_user_configs_updated_at ON public.user_configs;
CREATE TRIGGER update_user_configs_updated_at
  BEFORE UPDATE ON public.user_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 配置完成提示
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '基估宝 Supabase 配置完成！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '数据库表: user_configs';
  RAISE NOTICE '行级安全: 已启用';
  RAISE NOTICE 'RLS 策略: 已配置';
  RAISE NOTICE '触发器: 已创建';
  RAISE NOTICE '========================================';
END $$;
```

#### 3.3 验证表创建成功

执行后，您应该看到：
- 绿色的 "Success" 提示
- 系统通知显示 "基估宝 Supabase 配置完成！"

---

### 步骤 4：配置本地环境变量

#### 4.1 编辑 `.env.local` 文件

在项目根目录下创建 `.env.local` 文件：

```bash
# 在项目目录执行
nano .env.local
# 或使用任何文本编辑器
```

#### 4.2 填入您的 Supabase 凭证

```env
# Supabase 配置
# 替换为步骤2中获取的实际值
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here

# web3forms 配置（可选，用于反馈功能）
# 如果不使用反馈功能，可以留空或删除这行
NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY=
```

**示例**（请使用您自己的值，不要使用下面的示例）：

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicHJvamVjdF9pZCI6IjEyMzQ1Njc4LTkwYWItY2RlZi0xMjM0LTU2Nzg5MGFiY2RlZiIsInJvbGUiOiJhbm9uIiwicGVybWlzc2lvbnMiOlsiYXV0aCIsImRhdGFiYXNlIl0sInJlZnJlc2hfdG9rZW4iOiIyMDI0LTAyLTE1IiwiY2xhaW1zIjpudWxsLCJjb3Vyc2UiOiJhdXRvIn0.XXXXXXXX
```

**保存文件**：按 `Ctrl+O` 保存，然后 `Ctrl+X` 退出（如果使用 nano）

---

### 步骤 5：重启应用

#### 5.1 停止当前容器

```bash
docker compose down
```

#### 5.2 重新构建并启动

```bash
docker compose up -d --build
```

#### 5.3 验证配置成功

1. 访问 http://localhost:3000
2. 点击右上角的用户图标👤
3. 应该能看到登录界面（不再显示"未配置 Supabase"错误）

---

### 步骤 6：测试云同步功能

#### 6.1 注册/登录

1. 点击右上角 **用户图标👤**
2. 输入您的**邮箱地址**
3. 点击 **"发送验证码"**
4. 检查邮箱（包括垃圾邮件文件夹）
5. 复制收到的验证码
6. 粘贴到应用中
7. 点击 **"验证/登录"**

#### 6.2 验证云同步

登录成功后：
1. 添加一些基金
2. 刷新页面 - 数据应该保留
3. 在另一个浏览器或设备上登录同一账号 - 数据应该自动同步

---

## 🔍 故障排查

### 问题 1：登录时仍然提示"未配置 Supabase"

**可能原因**：环境变量未正确加载

**解决方案**：
```bash
# 检查 .env.local 文件是否存在
cat .env.local

# 重新构建容器（确保加载新环境变量）
docker compose down
docker compose up -d --build

# 查看容器日志
docker compose logs -f
```

### 问题 2：SQL 执行失败

**可能原因**：表已存在或权限问题

**解决方案**：
```sql
-- 如果表已存在，先删除
DROP TABLE IF EXISTS public.user_configs CASCADE;

-- 然后重新执行步骤 3 中的 SQL
```

### 问题 3：验证码邮件未收到

**可能原因**：
- 邮件被识别为垃圾邮件
- 邮箱地址输入错误
- Supabase 邮件服务限制

**解决方案**：
1. 检查垃圾邮件文件夹
2. 确认邮箱地址正确
3. 等待 3-5 分钟后重试
4. 尝试使用不同的邮箱地址

### 问题 4：登录后不同步数据

**可能原因**：RLS 策略配置问题

**解决方案**：
```sql
-- 验证 RLS 策略
SELECT * FROM pg_policies WHERE tablename = 'user_configs';

-- 检查当前用户
SELECT auth.uid();

-- 查看数据
SELECT * FROM public.user_configs;
```

---

## 🔒 安全建议

1. **保护您的密钥**
   - ✅ 不要将 `.env.local` 提交到 Git 仓库
   - ✅ `.gitignore` 已包含 `.env.local`
   - ✅ 只分享 `anon` 密钥，不要分享 `service_role` 密钥

2. **定期备份**
   - ✅ 定期导出应用配置
   - ✅ Supabase 有自动备份功能

3. **监控使用**
   - 在 Supabase Dashboard 的 **Authentication** 页面查看用户
   - 在 **Database** 页面查看数据

---

## 📚 相关文档

- [Supabase 官方文档](https://supabase.com/docs)
- [Supabase Auth 指南](https://supabase.com/docs/guides/auth)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

## 🆘 需要帮助？

如果遇到问题：
1. 检查本文档的故障排查部分
2. 查看 [Supabase Discord 社区](https://supabase.com/discord)
3. 在项目的 [GitHub Issues](https://github.com/Nelsontop/real-time-fund/issues) 提问

---

**配置完成后，您的基金数据将在所有设备上实时同步！** 🎉
