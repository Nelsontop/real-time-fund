-- ============================================
-- 修复 user_configs 表的唯一约束
-- ============================================
-- 问题：upsert 报错 "no unique or exclusion constraint matching the ON CONFLICT specification"
-- 原因：user_id 列缺少 UNIQUE 约束
-- 解决：重新创建表结构
-- ============================================

-- 步骤1：备份现有数据（可选）
-- 创建备份表
CREATE TABLE IF NOT EXISTS public.user_configs_backup AS
SELECT * FROM public.user_configs;

-- 步骤2：删除旧表
DROP TABLE IF EXISTS public.user_configs CASCADE;

-- 步骤3：重新创建表（带正确的约束）
CREATE TABLE public.user_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,  -- ⚠️ 关键：这里必须有 UNIQUE 约束
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 步骤4：创建索引
CREATE INDEX user_configs_user_id_idx ON public.user_configs(user_id);

-- 步骤5：恢复数据（如果有备份）
INSERT INTO public.user_configs (id, user_id, data, created_at, updated_at)
SELECT
  id,
  user_id,
  data,
  created_at,
  updated_at
FROM public.user_configs_backup;

-- 步骤6：启用行级安全
ALTER TABLE public.user_configs ENABLE ROW LEVEL SECURITY;

-- 步骤7：创建 RLS 策略
CREATE POLICY "Users can view own config"
  ON public.user_configs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own config"
  ON public.user_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own config"
  ON public.user_configs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own config"
  ON public.user_configs FOR DELETE
  USING (auth.uid() = user_id);

-- 步骤8：创建自动更新时间戳的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language plpgsql;

-- 步骤9：创建触发器
CREATE TRIGGER update_user_configs_updated_at
  BEFORE UPDATE ON public.user_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 验证修复
-- ============================================

-- 验证1：检查表是否存在
DO $$
DECLARE
  table_exists TEXT;
BEGIN
  SELECT tablename INTO table_exists
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'user_configs';

  IF table_exists IS NOT NULL THEN
    RAISE NOTICE '✓ Table user_configs exists';
  ELSE
    RAISE EXCEPTION 'Table user_configs does not exist!';
  END IF;
END $$;

-- 验证2：检查 user_id 唯一约束
DO $$
DECLARE
  constraint_exists INT;
BEGIN
  SELECT COUNT(*) INTO constraint_exists
  FROM pg_constraint
  WHERE conrelid = 'public.user_configs'::regclass
    AND conname = 'user_configs_user_id_key';

  IF constraint_exists > 0 THEN
    RAISE NOTICE '✓ UNIQUE constraint on user_id exists';
  ELSE
    RAISE EXCEPTION 'UNIQUE constraint on user_id MISSING!';
  END IF;
END $$;

-- 验证3：检查 data 列是否存在
DO $$
DECLARE
  column_exists INT;
BEGIN
  SELECT COUNT(*) INTO column_exists
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'user_configs'
    AND column_name = 'data';

  IF column_exists > 0 THEN
    RAISE NOTICE '✓ Column "data" exists';
  ELSE
    RAISE EXCEPTION 'Column "data" does not exist!';
  END IF;
END $$;

-- 验证4：查询当前所有配置
-- 运行此查询查看数据：
-- SELECT user_id, data->>'refreshMs' as refreshMs, updated_at
-- FROM public.user_configs;

-- ============================================
-- 清理（可选，完成后可删除）
-- ============================================
-- 删除备份表（确认数据无误后）
-- DROP TABLE IF EXISTS public.user_configs_backup;

-- ============================================
-- 使用说明
-- ============================================
-- 1. 在 Supabase Dashboard 中打开 SQL Editor
-- 2. 复制本文件的全部内容
-- 3. 粘贴到 SQL Editor
-- 4. 点击 Run 执行
-- 5. 查看底部的 NOTICE 消息确认成功
-- 6. 在应用中重新测试云同步功能
-- ============================================
