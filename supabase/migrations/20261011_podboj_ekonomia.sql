-- Podbój Polski, część 2: monety tylko w Podboju (skarbiec gracza), dochód z powiatów, kupno dodatkowych ataków,
-- mury, skarb tygodnia, zadania dnia i oblężenia odciętych części terytorium. Sprzedaż powiatów wyłączona.
-- Zasady (pilnuje serwer):
--  * dochód raz na dzień (zaległość do 3 dni): 3 monety za powiat, 6 za twierdzę; na start 20 monet,
--  * dodatkowy atak na dziś: 10 monet, każdy kolejny tego dnia o 5 drożej,
--  * mury: +1 obrony własnego powiatu za 15 monet (najwyżej do 7; twierdzę 8/8 daje tylko gra),
--  * skarb tygodnia: jeden powiat ziemski na tydzień ISO; kto go zdobędzie pierwszy, ma 60 monet i legendarną paczkę kart,
--    każdy następny w tym tygodniu 20 monet i brązową paczkę,
--  * zadania dnia: 3 z puli, 10 monet za każde i 15 za komplet,
--  * oblężenie: część terytorium odcięta od reszty i otoczona przez innych graczy ma 48 h; jeśli się nie połączy,
--    przejmuje ją gracz, który ma z nią najdłuższą granicę (obrona spada do 4). Odsiecz za 25 monet przedłuża o 24 h (najwyżej 2 razy).

alter table public.conq_portfel
  add column if not exists dochod_dzien date,
  add column if not exists atak_dzien date,
  add column if not exists atak_dodatkowe int not null default 0,
  add column if not exists atak_kupione int not null default 0;
alter table public.conq_proby
  add column if not exists wynik text,
  add column if not exists nowe_woj boolean not null default false;

create table if not exists public.conq_skarb(
  tydzien text not null, public_id uuid not null, k text not null, miejsce int not null,
  kiedy timestamptz not null default now(), primary key(tydzien, public_id));
alter table public.conq_skarb enable row level security;
create table if not exists public.conq_zadania(
  dzien date not null, public_id uuid not null, kod text not null,
  kiedy timestamptz not null default now(), primary key(dzien, public_id, kod));
alter table public.conq_zadania enable row level security;
create table if not exists public.conq_oblezenia(
  k text primary key, owner uuid not null, oblegajacy uuid not null,
  start timestamptz not null default now(), koniec timestamptz not null,
  odsiecz int not null default 0, aktywne boolean not null default true);
alter table public.conq_oblezenia enable row level security;

-- sprzedaż wyłączona: oferty znikają z mapy
update public.conq_powiaty set price = null where price is not null;

create or replace function public._conq_dzien() returns date language sql stable set search_path = '' as $$
  select (now() at time zone 'Europe/Warsaw')::date
$$;
revoke all on function public._conq_dzien() from public, anon, authenticated;

-- skarbiec: zmiana stanu monet (ujemna przy zakupie), zwraca nowy stan
create or replace function public._conq_monety(p uuid, d int) returns int language plpgsql security definer set search_path = '' as $$
declare v int;
begin
  insert into public.conq_portfel(public_id, monety, dochod_dzien) values (p, 20 + d, public._conq_dzien())
  on conflict (public_id) do update set monety = public.conq_portfel.monety + d returning monety into v;
  return v;
end $$;
revoke all on function public._conq_monety(uuid, int) from public, anon, authenticated;

-- dochód: raz dziennie za posiadane powiaty, zaległość najwyżej 3 dni; pierwszy raz kapitał startowy 20 monet
create or replace function public._conq_dochod(p uuid) returns int language plpgsql security definer set search_path = '' as $$
declare r record; v_dni int; v_dzien int; v_dzis date := public._conq_dzien();
begin
  select * into r from public.conq_portfel where public_id = p for update;
  if not found then
    insert into public.conq_portfel(public_id, monety, dochod_dzien) values (p, 20, v_dzis) on conflict do nothing;
    return 0;
  end if;
  if r.dochod_dzien is null then update public.conq_portfel set dochod_dzien = v_dzis, monety = monety + 20 where public_id = p; return 20; end if;
  v_dni := least(3, v_dzis - r.dochod_dzien);
  if v_dni <= 0 then return 0; end if;
  select coalesce(sum(case when score >= 8 then 6 else 3 end), 0) into v_dzien from public.conq_powiaty where owner = p;
  update public.conq_portfel set monety = monety + v_dni * v_dzien, dochod_dzien = v_dzis where public_id = p;
  return v_dni * v_dzien;
end $$;
revoke all on function public._conq_dochod(uuid) from public, anon, authenticated;

create or replace function public._conq_limit(p uuid) returns int language sql stable security definer set search_path = '' as $$
  select 10 + coalesce((select atak_dodatkowe from public.conq_portfel where public_id = p and atak_dzien = public._conq_dzien()), 0)
$$;
revoke all on function public._conq_limit(uuid) from public, anon, authenticated;

create or replace function public._conq_ataki(p uuid) returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.conq_proby x where x.gracz = p and x.rodzaj in ('atak','pojedynek') and x.started >= public._conq_dzis()
$$;
revoke all on function public._conq_ataki(uuid) from public, anon, authenticated;

-- skarb tygodnia: powiat ziemski wybrany z numeru tygodnia (taki sam dla wszystkich)
create or replace function public._conq_skarb_k(t text) returns text language sql stable set search_path = '' as $$
  select k from (select distinct k from public.conq_sasiedzi) s where substr(k, 3, 2)::int < 60 order by md5(t || ':skarb:' || k) limit 1
$$;
revoke all on function public._conq_skarb_k(text) from public, anon, authenticated;

-- zadania dnia: 3 z puli, kolejność z daty
create or replace function public._conq_zadania_dnia(d date) returns text[] language sql immutable set search_path = '' as $$
  select array_agg(kod) from (select kod from unnest(array['wolny','odbij','umocnij','trzy','osiem','woj']) kod order by md5(d::text || kod) limit 3) x
$$;
revoke all on function public._conq_zadania_dnia(date) from public, anon, authenticated;

create or replace function public._conq_zadanie_opis(kod text) returns text language sql immutable set search_path = '' as $$
  select case kod when 'wolny' then 'Zdobądź wolny powiat' when 'odbij' then 'Odbij powiat innemu graczowi'
    when 'umocnij' then 'Umocnij swój powiat' when 'trzy' then 'Zagraj 3 razy w Podboju'
    when 'osiem' then 'Odpowiedz bezbłędnie: 8 z 8' when 'woj' then 'Zdobądź powiat w nowym województwie' else kod end
$$;
revoke all on function public._conq_zadanie_opis(text) from public, anon, authenticated;

create or replace function public._conq_zadanie_zrobione(p uuid, kod text) returns boolean language sql stable security definer set search_path = '' as $$
  with dzis as (select * from public.conq_proby x where x.gracz = p and x.done and x.started >= public._conq_dzis())
  select case kod
    when 'wolny' then exists(select 1 from dzis where wynik = 'zdobyty')
    when 'odbij' then exists(select 1 from dzis where wynik = 'przejety')
    when 'umocnij' then exists(select 1 from dzis where wynik = 'umocniony')
    when 'trzy' then (select count(*) from dzis) >= 3
    when 'osiem' then exists(select 1 from dzis where score = 8)
    when 'woj' then exists(select 1 from dzis where wynik in ('zdobyty','przejety') and nowe_woj)
    else false end
$$;
revoke all on function public._conq_zadanie_zrobione(uuid, text) from public, anon, authenticated;

-- wypłata za wykonane zadania (każde raz dziennie) i premia za komplet
create or replace function public._conq_zadania_wyplac(p uuid) returns int language plpgsql security definer set search_path = '' as $$
declare v_dzis date := public._conq_dzien(); kod text; v int := 0; n int;
begin
  foreach kod in array public._conq_zadania_dnia(v_dzis) loop
    if public._conq_zadanie_zrobione(p, kod) then
      insert into public.conq_zadania(dzien, public_id, kod) values (v_dzis, p, kod) on conflict do nothing;
      get diagnostics n = row_count; if n > 0 then v := v + 10; end if;
    end if;
  end loop;
  if (select count(*) from public.conq_zadania z where z.dzien = v_dzis and z.public_id = p and z.kod <> 'komplet') >= 3 then
    insert into public.conq_zadania(dzien, public_id, kod) values (v_dzis, p, 'komplet') on conflict do nothing;
    get diagnostics n = row_count; if n > 0 then v := v + 15; end if;
  end if;
  if v > 0 then perform public._conq_monety(p, v); end if;
  return v;
end $$;
revoke all on function public._conq_zadania_wyplac(uuid) from public, anon, authenticated;

-- ===== część 2: oblężenia, tick, funkcje gry =====
-- odcięte części terytorium: składowe spójne mniejsze od głównej, otoczone wyłącznie przez innych graczy (bez wolnego sąsiada)
create or replace function public._conq_odciete()
returns table(k text, owner uuid, oblegajacy uuid, c text)
language sql stable security definer set search_path = '' as $$
  with recursive moje as (select p.k, p.owner from public.conq_powiaty p),
  kraw as (select s.k a, s.nb b from public.conq_sasiedzi s join moje m1 on m1.k = s.k join moje m2 on m2.k = s.nb and m2.owner = m1.owner where s.k <> s.nb),
  r(k, root) as (select m.k, m.k from moje m union select kr.b, r.root from r join kraw kr on kr.a = r.k),
  komp as (select r.k, min(r.root) c from r group by r.k),
  kw as (select komp.k, komp.c, m.owner from komp join moje m on m.k = komp.k),
  rozm as (select kw.owner, kw.c, count(*) n from kw group by kw.owner, kw.c),
  glowna as (select distinct on (rozm.owner) rozm.owner, rozm.c from rozm order by rozm.owner, rozm.n desc, rozm.c),
  odc as (select kw.* from kw where not exists(select 1 from glowna g where g.owner = kw.owner and g.c = kw.c)),
  granica as (select o.owner, o.c, s.nb, p.owner as sasiad from odc o join public.conq_sasiedzi s on s.k = o.k and s.nb <> s.k
              left join public.conq_powiaty p on p.k = s.nb where p.owner is distinct from o.owner),
  otoczone as (select g.owner, g.c from granica g group by g.owner, g.c having bool_and(g.sasiad is not null)),
  oblega as (select distinct on (g.owner, g.c) g.owner, g.c, g.sasiad from granica g where g.sasiad is not null
             group by g.owner, g.c, g.sasiad order by g.owner, g.c, count(*) desc, g.sasiad)
  select o.k, o.owner, b.sasiad, o.c from odc o join otoczone t on t.owner = o.owner and t.c = o.c join oblega b on b.owner = o.owner and b.c = o.c
$$;
revoke all on function public._conq_odciete() from public, anon, authenticated;

create or replace function public._conq_oblezenia()
returns void language plpgsql security definer set search_path = '' as $$
declare r record; v_wyslane text[] := '{}';
  v_odc jsonb := coalesce((select jsonb_agg(to_jsonb(x)) from public._conq_odciete() x), '[]'::jsonb);
begin
  -- koniec oblężenia: odcięta część przechodzi do oblegającego
  for r in select o.*, p.score from public.conq_oblezenia o join jsonb_to_recordset(v_odc) as t(k text, owner uuid, oblegajacy uuid, c text) on t.k = o.k and t.owner = o.owner
           join public.conq_powiaty p on p.k = o.k and p.owner = o.owner
           where o.aktywne and o.koniec < now() for update of o skip locked loop
    perform public._conq_przejmij(r.k, r.oblegajacy, least(r.score, 4));
    update public.conq_oblezenia set aktywne = false where k = r.k;
    if not (r.owner::text || r.oblegajacy::text) = any(v_wyslane) then
      v_wyslane := v_wyslane || (r.owner::text || r.oblegajacy::text);
      perform public._conq_wiad(r.owner, r.oblegajacy, 'Oblężenie zakończone: odcięte powiaty gracza ' || public._conq_nick(r.owner) || ' są teraz Twoje.', 'result', jsonb_build_object('podboj', jsonb_build_object('k', r.k)));
      perform public._conq_wiad(r.oblegajacy, r.owner, 'Straciłeś odcięte powiaty na rzecz gracza ' || public._conq_nick(r.oblegajacy) || '.', 'result', jsonb_build_object('podboj', jsonb_build_object('k', r.k)));
    end if;
  end loop;
  -- oblężenia, które już nie trwają (część połączona z resztą albo zmienił się właściciel)
  update public.conq_oblezenia o set aktywne = false
   where o.aktywne and not exists(select 1 from jsonb_to_recordset(v_odc) as t(k text, owner uuid, oblegajacy uuid, c text) where t.k = o.k and t.owner = o.owner);
  -- nowe oblężenia: 48 h od odcięcia, powiadomienie raz na odciętą część
  v_wyslane := '{}';
  for r in select t.* from jsonb_to_recordset(v_odc) as t(k text, owner uuid, oblegajacy uuid, c text) join public.conq_powiaty p on p.k = t.k and p.owner = t.owner
           where not exists(select 1 from public.conq_oblezenia o where o.k = t.k and o.aktywne and o.owner = t.owner) loop
    insert into public.conq_oblezenia(k, owner, oblegajacy, start, koniec, odsiecz, aktywne) values (r.k, r.owner, r.oblegajacy, now(), now() + interval '48 hours', 0, true)
    on conflict (k) do update set owner = excluded.owner, oblegajacy = excluded.oblegajacy, start = excluded.start, koniec = excluded.koniec, odsiecz = 0, aktywne = true;
    if not (r.owner::text || r.c) = any(v_wyslane) then
      v_wyslane := v_wyslane || (r.owner::text || r.c);
      perform public._conq_wiad(r.oblegajacy, r.owner, 'Twoje powiaty zostały odcięte i otoczone! Masz 48 godzin, żeby połączyć je z resztą albo wezwać odsiecz na mapie Podboju.', 'challenge', jsonb_build_object('podboj', jsonb_build_object('k', r.k)));
    end if;
  end loop;
end $$;
revoke all on function public._conq_oblezenia() from public, anon, authenticated;

create or replace function public._conq_tick()
returns void language plpgsql security definer set search_path = '' as $$
declare d record;
begin
  update public.conq_pojedynki set status = 'anulowany' where status = 'start' and created < now() - interval '30 minutes';
  for d in select * from public.conq_pojedynki where status = 'czeka' and expires < now() for update skip locked loop
    if exists(select 1 from public.conq_powiaty p where p.k = d.k and p.owner = d.defender) then
      perform public._conq_przejmij(d.k, d.challenger, d.ch_score);
    end if;
    update public.conq_pojedynki set status = 'zdobyte' where id = d.id;
    perform public._conq_wiad(d.defender, d.challenger, 'Wygrywasz pojedynek walkowerem: obrońca nie zagrał w ciągu doby. Powiat jest Twój!', 'result', jsonb_build_object('podboj', jsonb_build_object('k', d.k)));
  end loop;
  perform public._conq_oblezenia();
end $$;
revoke all on function public._conq_tick() from public, anon, authenticated;

-- informacje dla wszystkich: skarb tygodnia i jego zdobywcy, trwające oblężenia
create or replace function public.conq_tydzien()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t text := public._tydzien();
begin
  return jsonb_build_object('tydzien', t, 'skarb', public._conq_skarb_k(t),
    'zdobywcy', (select coalesce(jsonb_agg(jsonb_build_object('nick', public._conq_nick(s.public_id), 'miejsce', s.miejsce) order by s.miejsce), '[]'::jsonb) from public.conq_skarb s where s.tydzien = t),
    'oblezenia', (select coalesce(jsonb_agg(jsonb_build_object('k', o.k, 'owner', o.owner, 'oblegajacy', o.oblegajacy, 'koniec', o.koniec)), '[]'::jsonb) from public.conq_oblezenia o where o.aktywne));
end $$;
grant execute on function public.conq_tydzien() to anon, authenticated;

create or replace function public.conq_ja(p_device uuid, p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token); v_dochod int; v_zad int; v_dzis date; r record; t text := public._tydzien();
begin
  if v_me is null then return null; end if;
  perform public._conq_tick();
  v_dochod := public._conq_dochod(v_me);
  v_zad := public._conq_zadania_wyplac(v_me);
  v_dzis := public._conq_dzien();
  select * into r from public.conq_portfel where public_id = v_me;
  return jsonb_build_object(
    'me', v_me,
    'ataki', public._conq_ataki(v_me),
    'limit', public._conq_limit(v_me),
    'monety', coalesce(r.monety, 0),
    'dochod', v_dochod,
    'dochod_dzienny', (select coalesce(sum(case when score >= 8 then 6 else 3 end), 0) from public.conq_powiaty where owner = v_me),
    'zadania_monety', v_zad,
    'koszt_ataku', 10 + 5 * (case when r.atak_dzien = v_dzis then r.atak_kupione else 0 end),
    'zadania', (select jsonb_agg(jsonb_build_object('kod', kod, 'opis', public._conq_zadanie_opis(kod),
                 'zrobione', exists(select 1 from public.conq_zadania z where z.dzien = v_dzis and z.public_id = v_me and z.kod = x.kod))) from unnest(public._conq_zadania_dnia(v_dzis)) as x(kod)),
    'komplet', exists(select 1 from public.conq_zadania z where z.dzien = v_dzis and z.public_id = v_me and z.kod = 'komplet'),
    'skarb_miejsce', (select s.miejsce from public.conq_skarb s where s.tydzien = t and s.public_id = v_me),
    'obrony', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'k', d.k, 'nick', public._conq_nick(d.challenger), 'expires', d.expires, 'wynik', d.ch_score) order by d.expires), '[]'::jsonb)
               from public.conq_pojedynki d where d.defender = v_me and d.status = 'czeka'),
    'moje_pojedynki', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'k', d.k, 'nick', public._conq_nick(d.defender), 'expires', d.expires, 'wynik', d.ch_score) order by d.expires), '[]'::jsonb)
               from public.conq_pojedynki d where d.challenger = v_me and d.status = 'czeka'),
    'oblezony', (select coalesce(jsonb_agg(jsonb_build_object('k', o.k, 'nick', public._conq_nick(o.oblegajacy), 'koniec', o.koniec, 'odsiecz', o.odsiecz) order by o.koniec), '[]'::jsonb)
               from public.conq_oblezenia o where o.aktywne and o.owner = v_me),
    'oblegam', (select coalesce(jsonb_agg(jsonb_build_object('k', o.k, 'nick', public._conq_nick(o.owner), 'koniec', o.koniec) order by o.koniec), '[]'::jsonb)
               from public.conq_oblezenia o where o.aktywne and o.oblegajacy = v_me));
end $$;
grant execute on function public.conq_ja(uuid, text) to anon, authenticated;

create or replace function public.conq_start(p_device uuid, p_token text, p_k text, p_rodzaj text, p_pojedynek uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token); p record; v_ile int; v_seed text; v_id uuid; d record; v_duel uuid; v_moj boolean; v_lim int;
begin
  if v_me is null then raise exception 'Najpierw zapisz swój pseudonim w rankingu.'; end if;
  perform public._conq_tick();
  if not exists(select 1 from public.conq_sasiedzi s where s.k = p_k) then raise exception 'Nie ma takiego powiatu'; end if;
  select * into p from public.conq_powiaty x where x.k = p_k;
  if p_rodzaj = 'obrona' then
    select * into d from public.conq_pojedynki x where x.id = p_pojedynek;
    if not found or d.defender <> v_me or d.status <> 'czeka' then raise exception 'Ten pojedynek już się zakończył'; end if;
    insert into public.conq_proby(gracz, k, rodzaj, seed, pojedynek) values (v_me, d.k, 'obrona', d.seed, d.id) returning id into v_id;
    return jsonb_build_object('id', v_id, 'seed', d.seed, 'k', d.k, 'rodzaj', 'obrona', 'cel', d.ch_score, 'rywal', public._conq_nick(d.challenger));
  end if;
  v_lim := public._conq_limit(v_me);
  if public._conq_ataki(v_me) >= v_lim then
    raise exception 'Wykorzystałeś dziś % ataków. Kup dodatkowy atak za monety albo wróć jutro!', v_lim; end if;
  if exists(select 1 from public.conq_pojedynki x where x.k = p_k and x.status in ('start','czeka')) then raise exception 'O ten powiat trwa już pojedynek'; end if;
  select count(*) into v_ile from public.conq_powiaty x where x.owner = v_me;
  v_moj := coalesce(p.owner = v_me, false);
  if not v_moj and v_ile > 0 and not exists(
      select 1 from public.conq_sasiedzi s join public.conq_powiaty m on m.k = s.nb and m.owner = v_me where s.k = p_k) then
    raise exception 'Możesz atakować tylko powiaty graniczące z Twoimi'; end if;
  if v_ile = 0 and p.owner is not null then raise exception 'Pierwszy powiat wybierz spośród wolnych'; end if;
  v_seed := encode(extensions.gen_random_bytes(8), 'hex');
  if p_rodzaj = 'pojedynek' then
    if p.owner is null or p.owner = v_me or p.score < 8 then raise exception 'Pojedynek jest tylko o cudzą twierdzę (8 z 8)'; end if;
    insert into public.conq_pojedynki(k, challenger, defender, seed) values (p_k, v_me, p.owner, v_seed) returning id into v_duel;
    insert into public.conq_proby(gracz, k, rodzaj, seed, pojedynek) values (v_me, p_k, 'pojedynek', v_seed, v_duel) returning id into v_id;
    return jsonb_build_object('id', v_id, 'seed', v_seed, 'k', p_k, 'rodzaj', 'pojedynek', 'rywal', public._conq_nick(p.owner));
  end if;
  if p.owner is not null and p.owner <> v_me and p.score >= 8 then raise exception 'To twierdza (8 z 8). Wyzwij właściciela na pojedynek.'; end if;
  insert into public.conq_proby(gracz, k, rodzaj, seed) values (v_me, p_k, 'atak', v_seed) returning id into v_id;
  return jsonb_build_object('id', v_id, 'seed', v_seed, 'k', p_k, 'rodzaj', 'atak',
    'cel', case when p.owner is null then 5 else p.score + 1 end,
    'wlasny', v_moj, 'rywal', case when p.owner is null or p.owner = v_me then null else public._conq_nick(p.owner) end,
    'skarb', p_k = public._conq_skarb_k(public._tydzien()));
end $$;
grant execute on function public.conq_start(uuid, text, text, text, uuid) to anon, authenticated;

-- wynik próby; przy okazji skarb tygodnia i zadania dnia
create or replace function public.conq_wynik(p_device uuid, p_token text, p_id uuid, p_score int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token); a record; p record; d record; v_s int := least(8, greatest(0, coalesce(p_score, 0))); v_wynik text;
  v_nowe boolean := false; v_out jsonb; t text := public._tydzien(); v_miejsce int; v_skarb jsonb; v_zad int;
begin
  if v_me is null then raise exception 'Najpierw zapisz swój pseudonim w rankingu.'; end if;
  select * into a from public.conq_proby x where x.id = p_id for update;
  if not found or a.gracz <> v_me then raise exception 'Nie ma takiej próby'; end if;
  if a.done then return jsonb_build_object('wynik', coalesce(a.wynik, 'juz'), 'score', a.score, 'powtorka', true); end if;
  if a.started < clock_timestamp() - interval '20 minutes' then
    update public.conq_proby set done = true, score = 0, wynik = 'czas' where id = p_id;
    return jsonb_build_object('wynik', 'czas');
  end if;
  v_nowe := not exists(select 1 from public.conq_powiaty m where m.owner = v_me and left(m.k, 2) = left(a.k, 2));
  select * into p from public.conq_powiaty x where x.k = a.k for update;
  if a.rodzaj = 'atak' then
    if p.k is null then
      if v_s >= 5 then perform public._conq_przejmij(a.k, v_me, v_s); v_wynik := 'zdobyty'; else v_wynik := 'za_malo'; end if;
    elsif p.owner = v_me then
      if v_s > p.score then update public.conq_powiaty set score = v_s where k = a.k; v_wynik := 'umocniony'; else v_wynik := 'bez_zmian'; end if;
    elsif p.score < 8 and v_s > p.score then
      perform public._conq_przejmij(a.k, v_me, v_s); v_wynik := 'przejety';
      perform public._conq_wiad(v_me, p.owner, public._conq_nick(v_me) || ' przejął Twój powiat (' || v_s || ' : ' || p.score || '). Odbij go na mapie Podboju!', 'result', jsonb_build_object('podboj', jsonb_build_object('k', a.k)));
    else v_wynik := 'za_malo';
    end if;
    update public.conq_proby set done = true, score = v_s, wynik = v_wynik, nowe_woj = v_nowe and v_wynik in ('zdobyty','przejety') where id = p_id;
    v_out := jsonb_build_object('wynik', v_wynik, 'score', v_s, 'k', a.k);
    -- skarb tygodnia: liczy się zdobycie albo przejęcie powiatu ze skarbem, raz na gracza w tygodniu
    if v_wynik in ('zdobyty','przejety') and a.k = public._conq_skarb_k(t) and not exists(select 1 from public.conq_skarb s where s.tydzien = t and s.public_id = v_me) then
      perform pg_advisory_xact_lock(hashtext('conq_skarb' || t));
      v_miejsce := (select count(*) from public.conq_skarb s where s.tydzien = t) + 1;
      insert into public.conq_skarb(tydzien, public_id, k, miejsce) values (t, v_me, a.k, v_miejsce);
      perform public._conq_monety(v_me, case when v_miejsce = 1 then 60 else 20 end);
      v_skarb := jsonb_build_object('miejsce', v_miejsce, 'monety', case when v_miejsce = 1 then 60 else 20 end, 'paczka', case when v_miejsce = 1 then 'legenda' else 'braz' end, 'tydzien', t);
      v_out := v_out || jsonb_build_object('skarb', v_skarb);
    end if;
  else
    select * into d from public.conq_pojedynki x where x.id = a.pojedynek for update;
    if a.rodzaj = 'pojedynek' then
      if d.status <> 'start' then
        update public.conq_proby set done = true, score = v_s, wynik = 'anulowany' where id = p_id;
        return jsonb_build_object('wynik', 'anulowany');
      end if;
      update public.conq_pojedynki set ch_score = v_s, status = 'czeka', expires = now() + interval '24 hours' where id = d.id;
      perform public._conq_wiad(v_me, d.defender, public._conq_nick(v_me) || ' wyzywa Cię na pojedynek o Twoją twierdzę (' || v_s || ' z 8). Masz 24 godziny na obronę na mapie Podboju.', 'challenge', jsonb_build_object('podboj', jsonb_build_object('k', d.k, 'pojedynek', d.id)));
      update public.conq_proby set done = true, score = v_s, wynik = 'wyzwanie' where id = p_id;
      v_out := jsonb_build_object('wynik', 'wyzwanie', 'score', v_s, 'k', d.k);
    else
      if d.status <> 'czeka' then
        update public.conq_proby set done = true, score = v_s, wynik = 'po_czasie' where id = p_id;
        return jsonb_build_object('wynik', 'po_czasie');
      end if;
      update public.conq_pojedynki set def_score = v_s, status = case when v_s >= d.ch_score then 'obronione' else 'zdobyte' end where id = d.id;
      if v_s >= d.ch_score then
        perform public._conq_wiad(v_me, d.challenger, public._conq_nick(v_me) || ' obronił twierdzę (' || v_s || ' : ' || d.ch_score || ').', 'result', jsonb_build_object('podboj', jsonb_build_object('k', d.k)));
        update public.conq_proby set done = true, score = v_s, wynik = 'obronione' where id = p_id;
        v_out := jsonb_build_object('wynik', 'obronione', 'score', v_s, 'k', d.k, 'rywal_wynik', d.ch_score);
      else
        perform public._conq_przejmij(d.k, d.challenger, d.ch_score);
        perform public._conq_wiad(v_me, d.challenger, 'Wygrywasz pojedynek (' || d.ch_score || ' : ' || v_s || ')! Twierdza jest Twoja.', 'result', jsonb_build_object('podboj', jsonb_build_object('k', d.k)));
        update public.conq_proby set done = true, score = v_s, wynik = 'stracony' where id = p_id;
        v_out := jsonb_build_object('wynik', 'stracony', 'score', v_s, 'k', d.k, 'rywal_wynik', d.ch_score);
      end if;
    end if;
  end if;
  v_zad := public._conq_zadania_wyplac(v_me);
  return v_out || jsonb_build_object('zadania_monety', v_zad, 'monety', coalesce((select monety from public.conq_portfel where public_id = v_me), 0));
end $$;
grant execute on function public.conq_wynik(uuid, text, uuid, int) to anon, authenticated;

-- zakupy w skarbcu
create or replace function public.conq_kup_atak(p_device uuid, p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token); r record; v_dzis date := public._conq_dzien(); v_koszt int;
begin
  if v_me is null then raise exception 'Najpierw zapisz swój pseudonim w rankingu.'; end if;
  perform public._conq_dochod(v_me);
  select * into r from public.conq_portfel where public_id = v_me for update;
  v_koszt := 10 + 5 * (case when r.atak_dzien = v_dzis then r.atak_kupione else 0 end);
  if coalesce(r.monety, 0) < v_koszt then raise exception 'Za mało monet: potrzeba %, masz %.', v_koszt, coalesce(r.monety, 0); end if;
  update public.conq_portfel set monety = monety - v_koszt,
    atak_dodatkowe = case when atak_dzien = v_dzis then atak_dodatkowe + 1 else 1 end,
    atak_kupione = case when atak_dzien = v_dzis then atak_kupione + 1 else 1 end,
    atak_dzien = v_dzis where public_id = v_me returning * into r;
  return jsonb_build_object('monety', r.monety, 'limit', public._conq_limit(v_me), 'koszt_ataku', 10 + 5 * r.atak_kupione);
end $$;
grant execute on function public.conq_kup_atak(uuid, text) to anon, authenticated;

create or replace function public.conq_mury(p_device uuid, p_token text, p_k text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token); p record; v_m int;
begin
  if v_me is null then raise exception 'Najpierw zapisz swój pseudonim w rankingu.'; end if;
  select * into p from public.conq_powiaty x where x.k = p_k for update;
  if not found or p.owner <> v_me then raise exception 'To nie jest Twój powiat'; end if;
  if p.score >= 7 then raise exception 'Mury podnoszą obronę najwyżej do 7. Twierdzę (8 z 8) zdobywasz tylko w grze.'; end if;
  perform public._conq_dochod(v_me);
  if coalesce((select monety from public.conq_portfel where public_id = v_me), 0) < 15 then raise exception 'Mury kosztują 15 monet.'; end if;
  v_m := public._conq_monety(v_me, -15);
  update public.conq_powiaty set score = score + 1 where k = p_k;
  return jsonb_build_object('monety', v_m, 'score', p.score + 1);
end $$;
grant execute on function public.conq_mury(uuid, text, text) to anon, authenticated;

-- odsiecz: +24 h dla wszystkich oblężonych powiatów gracza w tej odciętej części (najwyżej 2 razy)
create or replace function public.conq_odsiecz(p_device uuid, p_token text, p_k text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token); o record; v_m int; v_c text;
begin
  if v_me is null then raise exception 'Najpierw zapisz swój pseudonim w rankingu.'; end if;
  select * into o from public.conq_oblezenia x where x.k = p_k and x.aktywne for update;
  if not found or o.owner <> v_me then raise exception 'Ten powiat nie jest oblężony'; end if;
  if o.odsiecz >= 2 then raise exception 'Odsiecz można wezwać najwyżej dwa razy.'; end if;
  perform public._conq_dochod(v_me);
  if coalesce((select monety from public.conq_portfel where public_id = v_me), 0) < 25 then raise exception 'Odsiecz kosztuje 25 monet.'; end if;
  v_m := public._conq_monety(v_me, -25);
  select c into v_c from public._conq_odciete() x where x.k = p_k;
  update public.conq_oblezenia x set koniec = x.koniec + interval '24 hours', odsiecz = x.odsiecz + 1
   where x.aktywne and x.owner = v_me and x.k in (select y.k from public._conq_odciete() y where y.c = v_c and y.owner = v_me);
  return jsonb_build_object('monety', v_m, 'koniec', (select koniec from public.conq_oblezenia where k = p_k));
end $$;
grant execute on function public.conq_odsiecz(uuid, text, text) to anon, authenticated;

-- sprzedaż i kupno powiatów wyłączone (funkcje zostają, ale odmawiają)
create or replace function public.conq_sprzedaz(p_device uuid, p_token text, p_k text, p_cena int)
returns void language plpgsql security definer set search_path = '' as $$
begin raise exception 'Sprzedaż powiatów została wyłączona. Monety wydasz na ataki, mury i odsiecz.'; end $$;
create or replace function public.conq_kup(p_device uuid, p_token text, p_k text, p_cena int)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin raise exception 'Kupno powiatów zostało wyłączone.'; end $$;
create or replace function public.conq_odbierz(p_device uuid, p_token text)
returns int language plpgsql security definer set search_path = '' as $$
begin return 0; end $$;

-- ranking z dochodem dziennym
create or replace function public.conq_ranking()
returns table(place bigint, nickname text, public_id uuid, powiaty bigint, twierdze bigint, punkty bigint)
language sql stable security definer set search_path = '' as $$
  select rank() over(order by count(*) desc, sum(p.score) desc), public._conq_nick(p.owner), p.owner, count(*), count(*) filter (where p.score >= 8), sum(case when p.score >= 8 then 6 else 3 end)
  from public.conq_powiaty p group by p.owner order by 4 desc, 6 desc limit 50
$$;
