create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  plan text not null default 'free' check (plan in ('free', 'creator', 'unlimited', 'large')),
  status text not null default 'free' check (status in ('free', 'incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_usage_months (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  period_end timestamptz not null,
  interactions integer not null default 0 check (interactions >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, period_start)
);

create table public.stripe_webhook_events (
  id text primary key,
  event_type text not null,
  processed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create index subscriptions_customer_idx on public.subscriptions(stripe_customer_id);
create index subscriptions_subscription_idx on public.subscriptions(stripe_subscription_id);
create index stripe_webhook_events_unprocessed_idx on public.stripe_webhook_events(created_at)
  where processed_at is null;

alter table public.subscriptions enable row level security;
alter table public.ai_usage_months enable row level security;
alter table public.stripe_webhook_events enable row level security;

revoke all on public.subscriptions from anon, authenticated;
revoke all on public.ai_usage_months from anon, authenticated;
revoke all on public.stripe_webhook_events from anon, authenticated;
grant select, insert, update on public.subscriptions to service_role;
grant select, insert, update on public.ai_usage_months to service_role;
grant select, insert, update on public.stripe_webhook_events to service_role;

create or replace function public.reserve_ai_interaction(p_user_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_plan text := 'free';
  v_status text := 'free';
  v_current_start timestamptz;
  v_current_end timestamptz;
  v_period_start date;
  v_period_end timestamptz;
  v_limit integer := 10;
  v_used integer := 0;
  v_allowed boolean := false;
begin
  select s.plan, s.status, s.current_period_start, s.current_period_end
    into v_plan, v_status, v_current_start, v_current_end
    from public.subscriptions s
    where s.user_id = p_user_id;

  if not found or v_status not in ('active', 'trialing') then
    v_plan := 'free';
    v_status := 'free';
    v_current_start := null;
    v_current_end := null;
  end if;

  v_limit := case v_plan
    when 'free' then 10
    when 'creator' then 100
    else null
  end;

  if v_current_start is not null then
    v_period_start := timezone('UTC', v_current_start)::date;
    v_period_end := coalesce(v_current_end, v_current_start + interval '1 month');
  else
    v_period_start := date_trunc('month', timezone('UTC', now()))::date;
    v_period_end := (v_period_start + interval '1 month')::timestamptz;
  end if;

  insert into public.ai_usage_months(user_id, period_start, period_end, interactions)
  values (p_user_id, v_period_start, v_period_end, 0)
  on conflict (user_id, period_start) do nothing;

  if v_limit is null then
    update public.ai_usage_months
      set interactions = interactions + 1, updated_at = now(), period_end = v_period_end
      where user_id = p_user_id and period_start = v_period_start
      returning interactions into v_used;
    v_allowed := true;
  else
    update public.ai_usage_months
      set interactions = interactions + 1, updated_at = now(), period_end = v_period_end
      where user_id = p_user_id
        and period_start = v_period_start
        and interactions < v_limit
      returning interactions into v_used;
    v_allowed := found;
    if not v_allowed then
      select interactions into v_used
        from public.ai_usage_months
        where user_id = p_user_id and period_start = v_period_start;
    end if;
  end if;

  return jsonb_build_object(
    'allowed', v_allowed,
    'plan', v_plan,
    'status', v_status,
    'limit', v_limit,
    'used', v_used,
    'remaining', case when v_limit is null then null else greatest(v_limit - v_used, 0) end,
    'periodStart', v_period_start,
    'periodEnd', v_period_end
  );
end;
$$;

create or replace function public.release_ai_interaction(p_user_id uuid, p_period_start date)
returns void
language sql
set search_path = ''
as $$
  update public.ai_usage_months
    set interactions = greatest(interactions - 1, 0), updated_at = now()
    where user_id = p_user_id and period_start = p_period_start;
$$;

revoke all on function public.reserve_ai_interaction(uuid) from public, anon, authenticated;
revoke all on function public.release_ai_interaction(uuid, date) from public, anon, authenticated;
grant execute on function public.reserve_ai_interaction(uuid) to service_role;
grant execute on function public.release_ai_interaction(uuid, date) to service_role;
