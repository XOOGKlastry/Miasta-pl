-- Profile graczy, wiadomości i wyzwania prosto z rankingu.
-- Gracz jest rozpoznawany po koncie (auth.uid()) albo po urządzeniu (identyfikator + sekret, jak w guest_scores).
-- Na zewnątrz widać tylko public_id: losowy identyfikator, który nie zdradza ani konta, ani urządzenia.
-- Zastosowane 8.10.2026 w czterech krokach, bez usuwania czegokolwiek: nowe wersje funkcji rankingu mają końcówkę 2
-- (publish_score2, publish_guest_score2, leaderboard2), stare zostają jako zapas dla starszych wersji gry.
-- Stare wiadomości (ponad 60 dni) są ukrywane w inbox/unread_count; blokady są tylko dodawane.

alter table public.player_scores add column if not exists public_id uuid not null default gen_random_uuid();
alter table public.guest_scores  add column if not exists public_id uuid not null default gen_random_uuid();
create unique index if not exists player_scores_public_id on public.player_scores(public_id);
create unique index if not exists guest_scores_public_id  on public.guest_scores(public_id);

alter table public.player_scores add column if not exists stats jsonb not null default '{}'::jsonb;
alter table public.guest_scores  add column if not exists stats jsonb not null default '{}'::jsonb;
alter table public.player_scores add column if not exists dm_open boolean not null default true;
alter table public.guest_scores  add column if not exists dm_open boolean not null default true;
alter table public.player_scores drop constraint if exists player_scores_stats_size;
alter table public.player_scores add constraint player_scores_stats_size check (pg_column_size(stats) < 4000);
alter table public.guest_scores drop constraint if exists guest_scores_stats_size;
alter table public.guest_scores add constraint guest_scores_stats_size check (pg_column_size(stats) < 4000);

-- wiadomości: zwykłe (msg), wyzwanie na pojedynek (challenge) i odesłany wynik (result)
create table if not exists public.player_messages(
  id bigint generated always as identity primary key,
  from_id uuid not null,
  to_id uuid not null,
  kind text not null default 'msg' check (kind in ('msg','challenge','result')),
  body text not null check (char_length(body) between 1 and 200),
  payload jsonb check (payload is null or (jsonb_typeof(payload) = 'object' and pg_column_size(payload) < 8000)),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists player_messages_to   on public.player_messages(to_id, created_at desc);
create index if not exists player_messages_from on public.player_messages(from_id, created_at desc);
create index if not exists player_messages_age  on public.player_messages(created_at);
alter table public.player_messages enable row level security;   -- bez polityk: dostęp tylko przez funkcje poniżej

create table if not exists public.player_blocks(
  owner_id uuid not null,
  blocked_id uuid not null,
  created_at timestamptz not null default now(),
  primary key(owner_id, blocked_id)
);
alter table public.player_blocks enable row level security;

create table if not exists public.player_reports(
  id bigint generated always as identity primary key,
  reporter_id uuid not null,
  reported_id uuid not null,
  message_id bigint,
  body text,
  created_at timestamptz not null default now()
);
alter table public.player_reports enable row level security;

-- kim jestem: konto ma pierwszeństwo, potem urządzenie z poprawnym sekretem
create or replace function public._ja(p_device uuid, p_token text)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare v uuid;
begin
  if auth.uid() is not null then
    select public_id into v from public.player_scores where user_id = auth.uid();
    if v is not null then return v; end if;
  end if;
  if p_device is not null and p_token is not null and char_length(p_token) >= 24 then
    select public_id into v from public.guest_scores
      where device_id = p_device and token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  end if;
  return v;
end $$;
revoke all on function public._ja(uuid, text) from public, anon, authenticated;

-- wszyscy gracze (konta i urządzenia) w jednym widoku wewnętrznym
create or replace function public._gracze()
returns table(public_id uuid, nickname text, visible boolean, dm_open boolean, points bigint, cards int, duel_points bigint, duel_wins int, stats jsonb, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select public_id, nickname, visible, dm_open, points, cards, duel_points, duel_wins, stats, updated_at from public.player_scores
  union all
  select public_id, nickname, visible, dm_open, points, cards::int, duel_points, duel_wins, stats, updated_at from public.guest_scores
$$;
revoke all on function public._gracze() from public, anon, authenticated;

-- zapis wyniku: teraz także statystyki profilu i zgoda na wiadomości; zwraca public_id
create or replace function public.publish_score2(p_nickname text, p_visible boolean, p_points bigint, p_cards integer,
  p_duel_points bigint default null, p_duel_wins integer default null, p_stats jsonb default null, p_dm_open boolean default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(trim(p_nickname)) not between 3 and 24 then raise exception 'Pseudonim musi mieć od 3 do 24 znaków'; end if;
  if p_stats is not null and (jsonb_typeof(p_stats) <> 'object' or pg_column_size(p_stats) >= 4000) then p_stats := null; end if;
  insert into public.player_scores(user_id, nickname, visible, points, cards, duel_points, duel_wins, stats, dm_open)
  values(auth.uid(), trim(p_nickname), p_visible, greatest(p_points, 0), greatest(p_cards, 0),
    greatest(coalesce(p_duel_points, 0), 0), greatest(coalesce(p_duel_wins, 0), 0), coalesce(p_stats, '{}'::jsonb), coalesce(p_dm_open, true))
  on conflict(user_id) do update set
    nickname = excluded.nickname, visible = excluded.visible, points = excluded.points, cards = excluded.cards,
    duel_points = coalesce(greatest(p_duel_points, 0), public.player_scores.duel_points),
    duel_wins = coalesce(greatest(p_duel_wins, 0), public.player_scores.duel_wins),
    stats = coalesce(p_stats, public.player_scores.stats),
    dm_open = coalesce(p_dm_open, public.player_scores.dm_open),
    updated_at = now()
  returning public_id into v;
  return v;
end $$;
revoke all on function public.publish_score2(text, boolean, bigint, integer, bigint, integer, jsonb, boolean) from public, anon;
grant execute on function public.publish_score2(text, boolean, bigint, integer, bigint, integer, jsonb, boolean) to authenticated;

create or replace function public.publish_guest_score2(p_device uuid, p_token text, p_nickname text, p_visible boolean, p_points bigint, p_cards integer,
  p_duel_points bigint default 0, p_duel_wins integer default 0, p_stats jsonb default null, p_dm_open boolean default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_hash text;
  v_id uuid;
  v_row public.guest_scores%rowtype;
begin
  if p_device is null or p_token is null or char_length(p_token) < 24 then raise exception 'Nieprawidłowy identyfikator gracza'; end if;
  if char_length(trim(p_nickname)) not between 3 and 24 then raise exception 'Pseudonim musi mieć od 3 do 24 znaków'; end if;
  if p_stats is not null and (jsonb_typeof(p_stats) <> 'object' or pg_column_size(p_stats) >= 4000) then p_stats := null; end if;
  v_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');
  select * into v_row from public.guest_scores where device_id = p_device;
  if found then
    if v_row.token_hash <> v_hash then raise exception 'To urządzenie nie może zmienić tego wyniku'; end if;
    if v_row.updated_at > now() - interval '5 seconds' then return v_row.public_id; end if;   -- prosty limit częstotliwości
    update public.guest_scores set nickname = trim(p_nickname), visible = p_visible,
      points = least(greatest(p_points, 0), 50000000), cards = least(greatest(p_cards, 0), 5000),
      duel_points = least(greatest(coalesce(p_duel_points, 0), 0), 10000000), duel_wins = least(greatest(coalesce(p_duel_wins, 0), 0), 1000000),
      stats = coalesce(p_stats, stats), dm_open = coalesce(p_dm_open, dm_open),
      updated_at = now()
    where device_id = p_device;
    return v_row.public_id;
  end if;
  insert into public.guest_scores(device_id, token_hash, nickname, visible, points, cards, duel_points, duel_wins, stats, dm_open)
  values (p_device, v_hash, trim(p_nickname), p_visible, least(greatest(p_points, 0), 50000000), least(greatest(p_cards, 0), 5000),
    least(greatest(coalesce(p_duel_points, 0), 0), 10000000), least(greatest(coalesce(p_duel_wins, 0), 0), 1000000),
    coalesce(p_stats, '{}'::jsonb), coalesce(p_dm_open, true))
  returning public_id into v_id;
  return v_id;
end $$;
grant execute on function public.publish_guest_score2(uuid, text, text, boolean, bigint, integer, bigint, integer, jsonb, boolean) to anon, authenticated;

-- ranking: dodatkowo public_id, żeby można było otworzyć profil
create or replace function public.leaderboard2(p_mode text)
returns table(place bigint, nickname text, value bigint, public_id uuid)
language sql stable security definer set search_path = '' as $$
  select rank() over(order by v.val desc), v.nickname, v.val, v.public_id
  from (
    select g.nickname, g.public_id,
      case p_mode when 'cards' then g.cards::bigint when 'duels' then g.duel_points else g.points end as val
    from public._gracze() g where g.visible
  ) v
  order by 3 desc, v.nickname limit 100;
$$;
grant execute on function public.leaderboard2(text) to anon, authenticated;

-- profil gracza widoczny w rankingu
create or replace function public.player_profile(p_id uuid)
returns table(public_id uuid, nickname text, points bigint, cards int, duel_points bigint, duel_wins int, stats jsonb,
  updated_at timestamptz, dm_open boolean, place_points bigint, place_cards bigint, place_duels bigint)
language sql stable security definer set search_path = '' as $$
  with w as (
    select g.*, rank() over(order by g.points desc) as pp, rank() over(order by g.cards desc) as pc, rank() over(order by g.duel_points desc) as pd
    from public._gracze() g where g.visible
  )
  select w.public_id, w.nickname, w.points, w.cards, w.duel_points, w.duel_wins, w.stats, w.updated_at, w.dm_open, w.pp, w.pc, w.pd
  from w where w.public_id = p_id;
$$;
grant execute on function public.player_profile(uuid) to anon, authenticated;

-- wysyłanie wiadomości i wyzwań
create or replace function public.send_message(p_device uuid, p_token text, p_to uuid, p_body text, p_kind text default 'msg', p_payload jsonb default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public._ja(p_device, p_token);
  v_to record;
  v_body text := trim(coalesce(p_body, ''));
  v_id bigint;
begin
  if v_me is null then raise exception 'Najpierw zapisz swój pseudonim w rankingu, żeby pisać do innych.'; end if;
  if p_to is null or p_to = v_me then raise exception 'Nieprawidłowy odbiorca'; end if;
  select * into v_to from public._gracze() g where g.public_id = p_to;
  if not found or not v_to.visible then raise exception 'Tego gracza nie ma w rankingu'; end if;
  if not v_to.dm_open and p_kind = 'msg' then raise exception 'Ten gracz nie przyjmuje wiadomości'; end if;
  if exists(select 1 from public.player_blocks b where b.owner_id = p_to and b.blocked_id = v_me) then raise exception 'Nie możesz napisać do tego gracza'; end if;
  if p_kind not in ('msg', 'challenge', 'result') then raise exception 'Nieprawidłowy rodzaj wiadomości'; end if;
  if char_length(v_body) not between 1 and 200 then raise exception 'Wiadomość może mieć od 1 do 200 znaków'; end if;
  if p_kind = 'msg' and v_body ~* '(https?://|www\.|[a-z0-9-]+\.(pl|com|net|org|eu|io|ru|info)(/|\s|$))' then raise exception 'Linki w wiadomościach są wyłączone'; end if;
  if p_kind = 'msg' then p_payload := null; end if;
  if p_payload is not null and (jsonb_typeof(p_payload) <> 'object' or pg_column_size(p_payload) >= 8000) then raise exception 'Za duże wyzwanie'; end if;
  if exists(select 1 from public.player_messages m where m.from_id = v_me and m.created_at > now() - interval '3 seconds') then raise exception 'Za szybko. Odczekaj chwilę.'; end if;
  if (select count(*) from public.player_messages m where m.from_id = v_me and m.created_at > now() - interval '1 day') >= 100 then raise exception 'Dzienny limit wiadomości wyczerpany'; end if;
  insert into public.player_messages(from_id, to_id, kind, body, payload) values (v_me, p_to, p_kind, v_body, p_payload) returning id into v_id;
  return v_id;
end $$;
grant execute on function public.send_message(uuid, text, uuid, text, text, jsonb) to anon, authenticated;

-- skrzynka: ostatnie 200 wiadomości w obie strony, bez zablokowanych
create or replace function public.inbox(p_device uuid, p_token text)
returns table(id bigint, kind text, body text, payload jsonb, created_at timestamptz, read_at timestamptz, mine boolean, other_id uuid, other_nick text, me uuid)
language plpgsql stable security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token);
begin
  if v_me is null then return; end if;
  return query
    select m.id, m.kind, m.body, m.payload, m.created_at, m.read_at, m.from_id = v_me,
      case when m.from_id = v_me then m.to_id else m.from_id end,
      coalesce((select g.nickname from public._gracze() g where g.public_id = case when m.from_id = v_me then m.to_id else m.from_id end limit 1), 'Gracz'),
      v_me
    from public.player_messages m
    where (m.to_id = v_me or m.from_id = v_me)
      and m.created_at > now() - interval '60 days'
      and not exists(select 1 from public.player_blocks b where b.owner_id = v_me and b.blocked_id = case when m.from_id = v_me then m.to_id else m.from_id end)
    order by m.created_at desc limit 200;
end $$;
grant execute on function public.inbox(uuid, text) to anon, authenticated;

create or replace function public.unread_count(p_device uuid, p_token text)
returns integer language plpgsql stable security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token);
begin
  if v_me is null then return 0; end if;
  return (select count(*) from public.player_messages m where m.to_id = v_me and m.read_at is null
    and m.created_at > now() - interval '60 days'
    and not exists(select 1 from public.player_blocks b where b.owner_id = v_me and b.blocked_id = m.from_id));
end $$;
grant execute on function public.unread_count(uuid, text) to anon, authenticated;

create or replace function public.mark_read(p_device uuid, p_token text, p_other uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token);
begin
  if v_me is null then return; end if;
  update public.player_messages set read_at = now() where to_id = v_me and from_id = p_other and read_at is null;
end $$;
grant execute on function public.mark_read(uuid, text, uuid) to anon, authenticated;

create or replace function public.block_player(p_device uuid, p_token text, p_other uuid, p_report boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token);
begin
  if v_me is null then raise exception 'Najpierw zapisz swój pseudonim w rankingu.'; end if;
  if p_other is null or p_other = v_me then return; end if;
  insert into public.player_blocks(owner_id, blocked_id) values (v_me, p_other) on conflict do nothing;
  if p_report then
    insert into public.player_reports(reporter_id, reported_id, message_id, body)
    select v_me, p_other, m.id, m.body from public.player_messages m
    where m.from_id = p_other and m.to_id = v_me order by m.created_at desc limit 5;
  end if;
end $$;
grant execute on function public.block_player(uuid, text, uuid, boolean) to anon, authenticated;
