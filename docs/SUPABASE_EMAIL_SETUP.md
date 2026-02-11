# Supabase 邮件验证配置指南

## 问题：收到 Magic Link 而不是验证码

如果你收到的邮件包含超链接而不是 6 位验证码，说明 Supabase 邮件模板配置不正确。

## 解决方案

### 步骤 1：登录 Supabase Dashboard

访问：https://supabase.com/dashboard

选择你的项目 → **Authentication** → **Email Templates**

### 步骤 2：修改 "Confirm signup" 模板

点击 **"Confirm signup"** 邮件模板，将内容替换为：

```html
<h2>验证码</h2>

<p>你的登录验证码是：</p>

<h1 style="
  letter-spacing: 5px;
  font-size: 32px;
  margin: 20px 0;
  text-align: center;
  color: #333;
">
  {{ .Token }}
</h1>

<p>请在页面中输入此 6 位验证码完成登录。</p>

<p style="
  color: #999;
  font-size: 14px;
  margin-top: 30px;
">
  此验证码将在 10 分钟后过期。<br>
  如果这不是你的操作，请忽略此邮件。
</p>
```

### 步骤 3：确认模板中只有 Token

**重要**：确保邮件模板中：
- ✅ **包含**：`{{ .Token }}` - 这会显示 6 位验证码
- ❌ **不要包含**：`{{ .ConfirmationURL }}` - 这会生成超链接

### 步骤 4：保存并测试

点击 **Save** 保存模板，然后：
1. 访问应用
2. 输入邮箱
3. 点击"发送邮箱验证码"
4. 查收邮箱，应该看到 6 位数字验证码

## 常见问题

### Q: 为什么还是收到超链接？

A: 请检查邮件模板中是否还有 `{{ .ConfirmationURL }}` 或其他链接代码。模板应该只包含 `{{ .Token }}`。

### Q: 可以同时使用验证码和超链接吗？

A: 不推荐。Supabase 会根据模板内容自动选择发送方式：
- 模板包含 `{{ .Token }}` → 发送验证码
- 模板包含 `{{ .ConfirmationURL }}` → 发送超链接

### Q: 如何恢复默认模板？

A: 在 Email Templates 页面，点击 **"Reset to default"** 恢复默认模板，然后手动修改为只包含 `{{ .Token }}`。

## 验证配置成功

配置成功后，收到的邮件应该类似：

```
验证码

你的登录验证码是：

   1 2 3 4 5 6

请在页面中输入此 6 位验证码完成登录。

此验证码将在 10 分钟后过期。
如果这不是你的操作，请忽略此邮件。
```

## 相关链接

- Supabase Authentication 文档：https://supabase.com/docs/guides/auth
- 邮件模板配置：https://supabase.com/dashboard/project/_/auth/templates
