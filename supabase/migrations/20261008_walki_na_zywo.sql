-- Walki na żywo (quiz z paskami życia, wyścig na mapie) z zaproszeniem z rankingu.
-- Serwer pilnuje czasu: początek rundy, czas odpowiedzi i obrażenia liczy baza, telefony tylko odpytują stan.
-- Ranking pojedynków liczy wyłącznie te walki (ELO, start 1000). Niczego nie usuwamy: stare funkcje zostają.

create table if not exists public.live_players(
  public_id uuid primary key,
  rating int not null default 1000,
  wins int not null default 0,
  losses int not null default 0,
  draws int not null default 0,
  games int not null default 0,
  last_seen timestamptz
);
alter table public.live_players enable row level security;

create table if not exists public.live_matches(
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('quiz','mapa')),
  seed text not null,
  edition text,
  a uuid not null,
  b uuid not null,
  status text not null default 'invited' check (status in ('invited','live','done','declined','expired','cancelled')),
  created_at timestamptz not null default clock_timestamp(),
  started_at timestamptz,
  round int not null default 0,
  round_start timestamptz,
  hp_a int not null default 100,
  hp_b int not null default 100,
  rounds jsonb not null default '[]'::jsonb,
  winner smallint,
  forfeit smallint,
  delta_a int,
  delta_b int,
  finished_at timestamptz
);
create index if not exists live_matches_b on public.live_matches(b, status);
create index if not exists live_matches_a on public.live_matches(a, status);
alter table public.live_matches enable row level security;

create table if not exists public.live_answers(
  match_id uuid not null,
  round int not null,
  slot smallint not null check (slot in (0,1)),
  pts int not null,
  ms int not null,
  at timestamptz not null default clock_timestamp(),
  primary key(match_id, round, slot)
);
alter table public.live_answers enable row level security;

-- ustawienia trybów: czas na odpowiedź (s) i liczba rund
create or replace function public._live_czas(p_mode text) returns int language sql immutable set search_path = '' as $$ select case when p_mode = 'mapa' then 20 else 15 end $$;
create or replace function public._live_rundy(p_mode text) returns int language sql immutable set search_path = '' as $$ select case when p_mode = 'mapa' then 10 else 12 end $$;
revoke all on function public._live_czas(text) from public, anon, authenticated;
revoke all on function public._live_rundy(text) from public, anon, authenticated;

-- koniec meczu: zwycięzca, ELO (K = 32), bilans graczy
create or replace function public._live_koniec(p_id uuid, p_poddal smallint)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.live_matches%rowtype; ra int; rb int; ea numeric; sa numeric; da int; w smallint;
begin
  select * into m from public.live_matches where id = p_id for update;
  if not found or m.status <> 'live' then return; end if;
  if p_poddal is not null then w := 1 - p_poddal;
  elsif m.hp_a > m.hp_b then w := 0;
  elsif m.hp_b > m.hp_a then w := 1;
  else w := null; end if;
  insert into public.live_players(public_id) values (m.a), (m.b) on conflict do nothing;
  select rating into ra from public.live_players where public_id = m.a;
  select rating into rb from public.live_players where public_id = m.b;
  ea := 1 / (1 + power(10::numeric, (rb - ra) / 400.0));
  sa := case when w = 0 then 1 when w = 1 then 0 else 0.5 end;
  da := round(32 * (sa - ea));
  update public.live_players set rating = greatest(0, rating + da), games = games + 1,
    wins = wins + (w = 0)::int, losses = losses + (w = 1)::int, draws = draws + (w is null)::int where public_id = m.a;
  update public.live_players set rating = greatest(0, rating - da), games = games + 1,
    wins = wins + (w = 1)::int, losses = losses + (w = 0)::int, draws = draws + (w is null)::int where public_id = m.b;
  update public.live_matches set status = 'done', winner = w, forfeit = p_poddal, delta_a = da, delta_b = -da, finished_at = clock_timestamp() where id = p_id;
end $$;
revoke all on function public._live_koniec(uuid, smallint) from public, anon, authenticated;

-- leniwy zegar meczu: rozlicza rundę, gdy obaj odpowiedzieli albo minął czas
create or replace function public._live_tick(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  m public.live_matches%rowtype; t timestamptz := clock_timestamp();
  c_t int; c_max int; n int; pa int; pb int; ma int; mb int; da int := 0; db int := 0;
begin
  select * into m from public.live_matches where id = p_id for update;
  if not found then return; end if;
  if m.status = 'invited' and m.created_at < t - interval '60 seconds' then
    update public.live_matches set status = 'expired' where id = p_id; return;
  end if;
  if m.status <> 'live' then return; end if;
  -- porzucony mecz (nikt nie odpytuje od kilku minut): remis bez zmian w rankingu
  if m.round_start < t - interval '5 minutes' then
    update public.live_matches set status = 'cancelled', finished_at = t where id = p_id; return;
  end if;
  c_t := public._live_czas(m.mode); c_max := public._live_rundy(m.mode);
  if t < m.round_start then return; end if;
  select count(*) into n from public.live_answers where match_id = m.id and round = m.round;
  if n < 2 and t < m.round_start + make_interval(secs => c_t + 1.5) then return; end if;
  select pts, ms into pa, ma from public.live_answers where match_id = m.id and round = m.round and slot = 0;
  select pts, ms into pb, mb from public.live_answers where match_id = m.id and round = m.round and slot = 1;
  pa := coalesce(pa, 0); pb := coalesce(pb, 0); ma := coalesce(ma, c_t * 1000); mb := coalesce(mb, c_t * 1000);
  if m.mode = 'quiz' then
    -- jedna dobra odpowiedź: 20 + premia do 10 za szybkość; obie dobre: szybszy zadaje 10
    if pa >= 500 and pb < 500 then db := 20 + round(10 * greatest(0, 1 - ma / (c_t * 1000.0)));
    elsif pb >= 500 and pa < 500 then da := 20 + round(10 * greatest(0, 1 - mb / (c_t * 1000.0)));
    elsif pa >= 500 and pb >= 500 then
      if ma < mb then db := 10; elsif mb < ma then da := 10; end if;
    end if;
  else
    -- mapa: bliższy strzał wygrywa rundę; im większa przewaga, tym mocniejszy cios
    if pa > pb or (pa = pb and pa > 0 and ma < mb) then db := 8 + round(22 * (pa - pb) / 1000.0) + case when pa >= 900 then 5 else 0 end;
    elsif pb > pa or (pa = pb and pb > 0 and mb < ma) then da := 8 + round(22 * (pb - pa) / 1000.0) + case when pb >= 900 then 5 else 0 end;
    end if;
  end if;
  -- ostatnie trzy rundy bolą półtora raza mocniej
  if m.round >= c_max - 3 then da := round(da * 1.5); db := round(db * 1.5); end if;
  update public.live_matches set hp_a = greatest(0, hp_a - da), hp_b = greatest(0, hp_b - db),
    rounds = rounds || jsonb_build_array(jsonb_build_object('r', m.round, 'pa', pa, 'pb', pb, 'ma', ma, 'mb', mb, 'da', da, 'db', db))
  where id = p_id returning * into m;
  if m.hp_a = 0 or m.hp_b = 0 or m.round + 1 >= c_max then
    perform public._live_koniec(p_id, null);
  else
    update public.live_matches set round = round + 1, round_start = t + interval '4 seconds' where id = p_id;
  end if;
end $$;
revoke all on function public._live_tick(uuid) from public, anon, authenticated;

-- obecność i zaproszenia: telefon odpytuje co ~20 s
create or replace function public.live_ping(p_device uuid, p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token); v_akt uuid; r jsonb;
begin
  if v_me is null then return null; end if;
  insert into public.live_players(public_id, last_seen) values (v_me, clock_timestamp())
    on conflict (public_id) do update set last_seen = excluded.last_seen;
  select id into v_akt from public.live_matches where status = 'live' and (a = v_me or b = v_me) order by started_at desc limit 1;
  if v_akt is not null then perform public._live_tick(v_akt);
    select id into v_akt from public.live_matches where id = v_akt and status = 'live'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'mode', m.mode, 'from', m.a,
      'nick', coalesce((select g.nickname from public._gracze() g where g.public_id = m.a limit 1), 'Gracz'),
      'left', greatest(0, 60 - extract(epoch from clock_timestamp() - m.created_at))::int) order by m.created_at desc), '[]'::jsonb)
    into r from public.live_matches m
    where m.b = v_me and m.status = 'invited' and m.created_at > clock_timestamp() - interval '60 seconds'
      and not exists(select 1 from public.player_blocks x where x.owner_id = v_me and x.blocked_id = m.a);
  return jsonb_build_object('me', v_me, 'invites', r, 'active', v_akt);
end $$;
grant execute on function public.live_ping(uuid, text) to anon, authenticated;

create or replace function public.live_online()
returns table(public_id uuid) language sql stable security definer set search_path = '' as $$
  select p.public_id from public.live_players p where p.last_seen > clock_timestamp() - interval '90 seconds'
$$;
grant execute on function public.live_online() to anon, authenticated;

create or replace function public.live_profile(p_id uuid)
returns table(rating int, wins int, losses int, draws int, games int, online boolean)
language sql stable security definer set search_path = '' as $$
  select coalesce(p.rating, 1000), coalesce(p.wins, 0), coalesce(p.losses, 0), coalesce(p.draws, 0), coalesce(p.games, 0),
    coalesce(p.last_seen > clock_timestamp() - interval '90 seconds', false)
  from (select p_id as id) x left join public.live_players p on p.public_id = x.id
$$;
grant execute on function public.live_profile(uuid) to anon, authenticated;

create or replace function public.live_invite(p_device uuid, p_token text, p_to uuid, p_mode text, p_edition text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token); v_id uuid; v_to record;
begin
  if v_me is null then raise exception 'Najpierw zapisz swój pseudonim w rankingu.'; end if;
  if p_mode not in ('quiz', 'mapa') then raise exception 'Nieznany tryb walki'; end if;
  if p_to is null or p_to = v_me then raise exception 'Nie możesz walczyć sam ze sobą'; end if;
  select * into v_to from public._gracze() g where g.public_id = p_to;
  if not found or not v_to.visible then raise exception 'Tego gracza nie ma w rankingu'; end if;
  if exists(select 1 from public.player_blocks b where (b.owner_id = p_to and b.blocked_id = v_me) or (b.owner_id = v_me and b.blocked_id = p_to)) then raise exception 'Nie możesz wyzwać tego gracza'; end if;
  if not exists(select 1 from public.live_players p where p.public_id = p_to and p.last_seen > clock_timestamp() - interval '90 seconds') then
    raise exception 'Gracz jest teraz offline. Wyślij mu wyzwanie na 24 godziny.'; end if;
  if exists(select 1 from public.live_matches m where m.status = 'live' and (m.a = p_to or m.b = p_to) and m.round_start > clock_timestamp() - interval '2 minutes') then
    raise exception 'Gracz właśnie walczy. Spróbuj za chwilę.'; end if;
  if exists(select 1 from public.live_matches m where m.a = v_me and m.created_at > clock_timestamp() - interval '5 seconds') then raise exception 'Za szybko. Odczekaj chwilę.'; end if;
  update public.live_matches set status = 'cancelled' where a = v_me and status = 'invited';
  insert into public.live_players(public_id, last_seen) values (v_me, clock_timestamp()) on conflict (public_id) do update set last_seen = excluded.last_seen;
  insert into public.live_matches(mode, seed, edition, a, b) values (p_mode, encode(extensions.gen_random_bytes(8), 'hex'), left(p_edition, 40), v_me, p_to)
    returning id into v_id;
  return v_id;
end $$;
grant execute on function public.live_invite(uuid, text, uuid, text, text) to anon, authenticated;

create or replace function public.live_respond(p_device uuid, p_token text, p_id uuid, p_accept boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token); m public.live_matches%rowtype;
begin
  if v_me is null then raise exception 'Najpierw zapisz swój pseudonim w rankingu.'; end if;
  perform public._live_tick(p_id);
  select * into m from public.live_matches where id = p_id for update;
  if not found or m.b <> v_me then raise exception 'To zaproszenie nie jest do Ciebie'; end if;
  if m.status <> 'invited' then return m.status; end if;
  if p_accept then
    update public.live_matches set status = 'live', started_at = clock_timestamp(), round = 0, round_start = clock_timestamp() + interval '5 seconds' where id = p_id;
    return 'live';
  end if;
  update public.live_matches set status = 'declined' where id = p_id;
  return 'declined';
end $$;
grant execute on function public.live_respond(uuid, text, uuid, boolean) to anon, authenticated;

create or replace function public.live_state(p_device uuid, p_token text, p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token); m public.live_matches%rowtype; v_slot int; ra int; rb int;
begin
  if v_me is null then raise exception 'Najpierw zapisz swój pseudonim w rankingu.'; end if;
  perform public._live_tick(p_id);
  select * into m from public.live_matches where id = p_id;
  if not found or (m.a <> v_me and m.b <> v_me) then raise exception 'Nie ma takiej walki'; end if;
  v_slot := case when m.a = v_me then 0 else 1 end;
  update public.live_players set last_seen = clock_timestamp() where public_id = v_me;
  select rating into ra from public.live_players where public_id = m.a;
  select rating into rb from public.live_players where public_id = m.b;
  return jsonb_build_object(
    'id', m.id, 'mode', m.mode, 'seed', m.seed, 'edition', m.edition, 'status', m.status, 'slot', v_slot,
    'a', m.a, 'b', m.b,
    'nick_a', coalesce((select g.nickname from public._gracze() g where g.public_id = m.a limit 1), 'Gracz'),
    'nick_b', coalesce((select g.nickname from public._gracze() g where g.public_id = m.b limit 1), 'Gracz'),
    'rating_a', coalesce(ra, 1000), 'rating_b', coalesce(rb, 1000),
    'round', m.round, 'round_start', m.round_start, 'now', clock_timestamp(), 'created_at', m.created_at,
    'czas', public._live_czas(m.mode), 'max', public._live_rundy(m.mode),
    'hp_a', m.hp_a, 'hp_b', m.hp_b, 'rounds', m.rounds,
    'answered', (select coalesce(jsonb_agg(x.slot), '[]'::jsonb) from public.live_answers x where x.match_id = m.id and x.round = m.round),
    'winner', m.winner, 'forfeit', m.forfeit, 'delta_a', m.delta_a, 'delta_b', m.delta_b);
end $$;
grant execute on function public.live_state(uuid, text, uuid) to anon, authenticated;

create or replace function public.live_answer(p_device uuid, p_token text, p_id uuid, p_round int, p_pts int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token); m public.live_matches%rowtype; v_slot smallint; t timestamptz := clock_timestamp();
begin
  if v_me is null then raise exception 'Najpierw zapisz swój pseudonim w rankingu.'; end if;
  select * into m from public.live_matches where id = p_id;
  if not found or (m.a <> v_me and m.b <> v_me) then raise exception 'Nie ma takiej walki'; end if;
  v_slot := case when m.a = v_me then 0 else 1 end;
  if m.status = 'live' and m.round = p_round and t >= m.round_start
     and t <= m.round_start + make_interval(secs => public._live_czas(m.mode) + 1.5) then
    insert into public.live_answers(match_id, round, slot, pts, ms)
    values (p_id, p_round, v_slot, least(1000, greatest(0, coalesce(p_pts, 0))),
      least(public._live_czas(m.mode) * 1000, (extract(epoch from t - m.round_start) * 1000)::int))
    on conflict do nothing;
  end if;
  return public.live_state(p_device, p_token, p_id);
end $$;
grant execute on function public.live_answer(uuid, text, uuid, int, int) to anon, authenticated;

create or replace function public.live_leave(p_device uuid, p_token text, p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token); m public.live_matches%rowtype;
begin
  if v_me is null then return; end if;
  select * into m from public.live_matches where id = p_id;
  if not found or (m.a <> v_me and m.b <> v_me) then return; end if;
  if m.status = 'invited' then
    update public.live_matches set status = case when m.a = v_me then 'cancelled' else 'declined' end where id = p_id;
  elsif m.status = 'live' then
    perform public._live_koniec(p_id, (case when m.a = v_me then 0 else 1 end)::smallint);
  end if;
end $$;
grant execute on function public.live_leave(uuid, text, uuid) to anon, authenticated;

-- ranking pojedynków: tylko walki na żywo (ELO); pozostałe tryby bez zmian
create or replace function public.leaderboard2(p_mode text)
returns table(place bigint, nickname text, value bigint, public_id uuid)
language sql stable security definer set search_path = '' as $$
  select rank() over(order by v.val desc), v.nickname, v.val, v.public_id
  from (
    select g.nickname, g.public_id,
      case p_mode when 'cards' then g.cards::bigint when 'duels' then lp.rating::bigint else g.points end as val
    from public._gracze() g left join public.live_players lp on lp.public_id = g.public_id
    where g.visible and (p_mode <> 'duels' or coalesce(lp.games, 0) > 0)
  ) v
  order by 3 desc, v.nickname limit 100;
$$;
grant execute on function public.leaderboard2(text) to anon, authenticated;
