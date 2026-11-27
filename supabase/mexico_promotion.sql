begin;
create table if not exists public.mexico_promo_usage (
 user_id uuid primary key references auth.users(id) on delete cascade,
 interactions integer not null default 0 check (interactions between 0 and 100),
 first_seen timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.mexico_promo_usage enable row level security;
revoke all on public.mexico_promo_usage from public, anon, authenticated;
grant select, insert, update on public.mexico_promo_usage to service_role;

create or replace function public.mexico_promo_access(p_user_id uuid, p_action text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
 v_used integer := 0;
 v_allowed boolean := false;
begin
 if p_action = 'release' then
   update public.mexico_promo_usage set interactions = greatest(interactions-1,0), updated_at=now()
   where user_id=p_user_id;
   return null;
 end if;
 if p_action not in ('status','reserve') then raise exception 'Invalid action'; end if;
 if now() < timestamptz '2026-11-27 00:00:00-08' or now() >= timestamptz '2026-12-11 00:00:00-08'
 or exists(select 1 from public.subscriptions where user_id=p_user_id and status in ('active','trialing','past_due') and plan <> 'free') then
   return null;
 end if;
 if p_action='reserve' then
   insert into public.mexico_promo_usage(user_id) values(p_user_id) on conflict(user_id) do nothing;
   update public.mexico_promo_usage set interactions=interactions+1, updated_at=now()
     where user_id=p_user_id and interactions<100 returning interactions into v_used;
   v_allowed := found;
 end if;
 if p_action='status' or not v_allowed then
   select coalesce((select interactions from public.mexico_promo_usage where user_id=p_user_id),0) into v_used;
 end if;
 return jsonb_build_object('allowed',case when p_action='status' then v_used<100 else v_allowed end,
 'plan','free','planName','México — promoción gratuita','status','free','limit',100,'used',v_used,
 'remaining',greatest(100-v_used,0),'promotion','mexico','periodEnd','2026-12-11T08:00:00Z',
 'currentPeriodEnd','2026-12-11T08:00:00Z');
end;
$$;
revoke all on function public.mexico_promo_access(uuid,text) from public, anon, authenticated;
grant execute on function public.mexico_promo_access(uuid,text) to service_role;
commit;