# 澳新旅行英语手机网页端

这是独立的手机网页/PWA 项目，不依赖 Electron，也不会影响电脑版悬浮窗。

## 本地运行

```bash
cd mobile-web
npm install
cp .env.example .env
npm run dev
```

如果不配置 Supabase 环境变量，网页会进入本地模式，学习进度只保存在当前浏览器。配置 Supabase 后，网页会使用内置的个人默认同步通道，不再要求输入同步码。

## 环境变量

`.env`:

```bash
VITE_SUPABASE_URL=你的 Supabase Project URL
VITE_SUPABASE_ANON_KEY=你的 Supabase anon public key
```

不要把 `service_role` key 放进前端代码或 Cloudflare Pages 环境变量。

## Supabase SQL

在 Supabase SQL Editor 中执行：

```sql
create table if not exists travel_english_sync_profiles (
  sync_code text primary key,
  last_item_id text,
  study_mode text not null default 'sequence',
  filters jsonb not null default '{}'::jsonb,
  hide_chinese boolean not null default false,
  speech_rate numeric not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists travel_english_item_statuses (
  sync_code text not null,
  item_id text not null,
  review_status text not null default '未学',
  updated_at timestamptz not null default now(),
  primary key (sync_code, item_id)
);

create or replace function set_travel_english_updated_at()
returns trigger
language plpgsql
as $$
begin
  if new.updated_at is null then
    new.updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_travel_english_profiles_updated_at on travel_english_sync_profiles;
create trigger trg_travel_english_profiles_updated_at
before insert or update on travel_english_sync_profiles
for each row execute function set_travel_english_updated_at();

drop trigger if exists trg_travel_english_statuses_updated_at on travel_english_item_statuses;
create trigger trg_travel_english_statuses_updated_at
before insert or update on travel_english_item_statuses
for each row execute function set_travel_english_updated_at();

alter table travel_english_sync_profiles enable row level security;
alter table travel_english_item_statuses enable row level security;

drop policy if exists "anon read sync profiles" on travel_english_sync_profiles;
create policy "anon read sync profiles"
on travel_english_sync_profiles
for select
to anon
using (true);

drop policy if exists "anon insert sync profiles" on travel_english_sync_profiles;
create policy "anon insert sync profiles"
on travel_english_sync_profiles
for insert
to anon
with check (true);

drop policy if exists "anon update sync profiles" on travel_english_sync_profiles;
create policy "anon update sync profiles"
on travel_english_sync_profiles
for update
to anon
using (true)
with check (true);

drop policy if exists "anon read item statuses" on travel_english_item_statuses;
create policy "anon read item statuses"
on travel_english_item_statuses
for select
to anon
using (true);

drop policy if exists "anon insert item statuses" on travel_english_item_statuses;
create policy "anon insert item statuses"
on travel_english_item_statuses
for insert
to anon
with check (true);

drop policy if exists "anon update item statuses" on travel_english_item_statuses;
create policy "anon update item statuses"
on travel_english_item_statuses
for update
to anon
using (true)
with check (true);
```

安全说明：当前 MVP 使用一个内置默认 `sync_code` 作为个人同步通道，适合只有你自己使用的私人学习站点。这个方案不适合公开多人系统；如果要给很多用户正式使用，应改成 Supabase Auth，并用用户身份限制 RLS。

## 构建

```bash
cd mobile-web
npm run build
```

构建前会自动把 `../src/data/travel-english.json` 复制到 `mobile-web/src/data/travel-english.json`。

## Cloudflare Pages 部署

- Root directory: `mobile-web`
- Build command: `npm run build`
- Build output directory: `dist`
- 环境变量：
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

## 使用流程

1. 打开网页。
2. 没有 Supabase 配置时直接本地学习；配置 Supabase 后自动使用默认同步通道。
3. 标记学习状态、切换条目、修改筛选后，网页会先保存本地，再延迟约 1 秒尝试云同步。
4. 断网或 Supabase 失败时，本地学习不受影响；恢复网络后点击“立即同步”或继续操作即可再同步。

## PWA

项目包含 `public/manifest.webmanifest` 和图标，可在 iPhone Safari 或 Android Chrome 中添加到主屏幕。基础静态资源会由 `vite-plugin-pwa` 缓存。
