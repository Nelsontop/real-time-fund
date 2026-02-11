-- ============================================
-- 基估宝 - Supabase 数据库配置（修正版）
-- ============================================

-- 创建用户配置表
CREATE TABLE IF NOT EXISTS public.user_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS user_configs_user_id_idx ON public.user_configs(user_id);

-- 启用行级安全策略 (RLS)
ALTER TABLE public.user_configs ENABLE ROW LEVEL SECURITY;

-- 删除已存在的策略（如果有的话）
DROP POLICY IF EXISTS "Users can view own config" ON public.user_configs;
DROP POLICY IF EXISTS "Users can insert own config" ON public.user_configs;
DROP POLICY IF EXISTS "Users can update own config" ON public.user_configs;
DROP POLICY IF EXISTS "Users can delete own config" ON public.user_configs;

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
  RAISE NOTICE '数据库表: user_configs';
  RAISE NOTICE '行级安全: 已启用';
  RAISE NOTICE 'RLS 策略: 已配置';
  RAISE NOTICE '触发器: 已创建';
  RAISE NOTICE '========================================';
END $$;
