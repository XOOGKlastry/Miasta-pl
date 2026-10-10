-- Wydarzenie tygodnia na planszy: wynik gracza w krainie tygodnia (suma punktów z jej poziomów).
-- Tydzień ISO liczy serwer (strefa Europe/Warsaw), więc nie da się wpisać wyniku do innego tygodnia.
create table if not exists public.event_scores(
  week text not null,
  public_id uuid not null,
  score int not null check (score between 0 and 10000),
  updated_at timestamptz not null default now(),
  primary key(week, public_id)
);
create index if not exists event_scores_week on public.event_scores(week, score desc);
alter table public.event_scores enable row level security;   -- bez polityk: tylko przez funkcje

create or replace function public._tydzien()
returns text language sql stable set search_path = '' as $$
  select to_char(now() at time zone 'Europe/Warsaw', 'IYYY') || '-W' || to_char(now() at time zone 'Europe/Warsaw', 'IW')
$$;
revoke all on function public._tydzien() from public, anon, authenticated;

create or replace function public.event_publish(p_device uuid, p_token text, p_week text, p_score int)
returns int language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token);
begin
  if v_me is null then raise exception 'Najpierw zapisz swój pseudonim w rankingu.'; end if;
  if p_week is distinct from public._tydzien() then return 0; end if;   -- stary tydzień: nic nie zapisujemy
  insert into public.event_scores(week, public_id, score) values (p_week, v_me, least(greatest(coalesce(p_score, 0), 0), 2400))
  on conflict (week, public_id) do update set score = greatest(public.event_scores.score, excluded.score), updated_at = now();
  return (select score from public.event_scores where week = p_week and public_id = v_me);
end $$;
grant execute on function public.event_publish(uuid, text, text, int) to anon, authenticated;

create or replace function public.event_leaderboard(p_week text default null)
returns table(place bigint, nickname text, value bigint, public_id uuid, week text)
language sql stable security definer set search_path = '' as $$
  select rank() over(order by e.score desc), g.nickname, e.score::bigint, e.public_id, e.week
  from public.event_scores e join public._gracze() g on g.public_id = e.public_id
  where e.week = coalesce(p_week, public._tydzien()) and g.visible
  order by e.score desc, g.nickname limit 100
$$;
grant execute on function public.event_leaderboard(text) to anon, authenticated;
