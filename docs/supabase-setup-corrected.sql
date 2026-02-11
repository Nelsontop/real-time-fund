-- ============================================
-- 基估宝 - Supabase 数据库配置（修正版）
-- ============================================
--
-- 重要说明：此 SQL 文件与代码中的字段名一致
-- 代码使用 'data' 字段存储配置，不是 'config' 字段
-- ============================================

-- 删除旧表（如果存在）并重新创建
DROP TABLE IF EXISTS public.user_configs CASCADE;

-- 创建用户配置表 - 使用 'data' 字段（与代码一致）
CREATE TABLE public.user_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 创建索引以提高查询性能
CREATE INDEX user_configs_user_id_idx ON public.user_configs(user_id);

-- 启用行级安全策略 (RLS)
ALTER TABLE public.user_configs ENABLE ROW LEVEL SECURITY;

-- 创建策略
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

-- 创建自动更新时间戳的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language plpgsql;

-- 为 user_configs 表创建触发器
CREATE TRIGGER update_user_configs_updated_at
  BEFORE UPDATE ON public.user_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 验证配置
-- ============================================
DO $$
DECLARE
  table_exists TEXT;
  column_exists INT;
BEGIN
  -- 检查表是否存在
  SELECT INTO table_exists tablename
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'user_configs';

  IF table_exists IS NOT NULL THEN
    RAISE NOTICE 'Table user_configs exists';

    -- 检查 data 列是否存在
    SELECT INTO column_exists COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_configs'
      AND column_name = 'data';

    IF column_exists > 0 THEN
      RAISE NOTICE 'Column "data" exists (correct)';
    ELSE
      RAISE NOTICE 'WARNING: Column "data" does not exist!';
    END IF;

    -- 检查 config 列是否存在（不应该存在）
    SELECT INTO column_exists COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_configs'
      AND column_name = 'config';

    IF column_exists > 0 THEN
      RAISE NOTICE 'WARNING: Old column "config" still exists - should use "data"';
    END IF;
  ELSE
    RAISE NOTICE 'ERROR: Table user_configs was not created!';
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE '基估宝 Supabase 配置完成！';
  RAISE NOTICE '数据库表: user_configs';
  RAISE NOTICE '数据列名: data (JSONB)';
  RAISE NOTICE '行级安全: 已启用';
  RAISE NOTICE 'RLS 策略: 已配置';
  RAISE NOTICE '触发器: 已创建';
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- 查询现有用户配置（用于调试）
-- ============================================
-- 运行此查询查看所有用户配置：
-- SELECT user_id, data, updated_at FROM public.user_configs;
--
-- 检查特定邮箱用户的配置（需要在 Supabase 仪表板中运行）：
-- SELECT uc.user_id, uc.data, uc.updated_at, au.email
-- FROM public.user_configs uc
-- JOIN auth.users au ON uc.user_id = au.id
-- WHERE au.email = '379852731@qq.com';
