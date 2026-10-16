-- Podbój, nowa ekonomia (16.10.2026):
--  * każdy gracz codziennie 200 monet, co godzinę 5 monet za każdy powiat (cron co pełną godzinę);
--    w weekend (od piątku 23:45 do niedzieli 23:45, „sobota–niedziela”) 1000 dziennie i 50 za powiat na godzinę;
--    dotychczasowe premie zostają jako mnożniki stawki godzinowej (twierdza ×2, stolica gracza ×2 albo ×3,
--    wojewoda ×2, powiat przy granicy +1 stawka);
--  * stolice województw: +1 szansa (atak) dziennie i 100 monet dziennie (weekend 500) za każdą posiadaną,
--    za pierwsze dojście do każdej 300 monet (dotychczasowi właściciele dostają je od razu);
--  * zadania dnia po 50 monet, komplet +100;
--  * skarby tygodnia tylko w wolnych miastach na prawach powiatu (bez stolic województw), nagrody 500 / 250 / 100;
--  * oblężenia nie da się już wykupić odsieczą: przerywa je tylko dojście do odciętych powiatów;
--  * ceny dopasowane do większych zarobków: dodatkowy atak 500, tarcza 300, przeniesienie stolicy 500.
-- Wszystkie liczby są w tabeli conq_ustawienia (klucz, wartosc), zmiana bez nowej migracji:
--   update public.conq_ustawienia set wartosc = 300 where klucz = 'koszt_ataku';

create table if not exists public.conq_ustawienia(klucz text primary key, wartosc numeric not null, opis text);
alter table public.conq_ustawienia enable row level security;
insert into public.conq_ustawienia(klucz, wartosc, opis) values
  ('dzienne', 200, 'monety codziennie dla każdego gracza'),
  ('dzienne_weekend', 1000, 'monety codziennie w sobotę i niedzielę'),
  ('godzinowe', 5, 'monety co godzinę za powiat'),
  ('godzinowe_weekend', 50, 'monety co godzinę za powiat w weekend'),
  ('stolica_woj_dzienne', 100, 'monety dziennie za każdą stolicę województwa'),
  ('stolica_woj_dzienne_weekend', 500, 'to samo w weekend'),
  ('stolica_woj_szanse', 1, 'dodatkowe ataki dziennie za każdą stolicę województwa'),
  ('stolica_woj_odkrycie', 300, 'jednorazowo za pierwsze zdobycie stolicy województwa'),
  ('zadanie', 50, 'za każde zadanie dnia'),
  ('zadania_komplet', 100, 'za komplet zadań dnia'),
  ('skarb_1', 500, 'skarb tygodnia: pierwszy zdobywca'),
  ('skarb_2', 250, 'skarb tygodnia: drugi i trzeci'),
  ('skarb_dalej', 100, 'skarb tygodnia: kolejni'),
  ('koszt_ataku', 500, 'dodatkowy atak'),
  ('koszt_tarczy', 300, 'tarcza na 24 h'),
  ('koszt_stolicy', 500, 'przeniesienie stolicy gracza'),
  ('szanse', 10, 'ataki dziennie')
on conflict (klucz) do nothing;

create or replace function public._conq_ust(p text) returns int language sql stable security definer set search_path = '' as $$
  select coalesce((select wartosc from public.conq_ustawienia where klucz = p), 0)::int
$$;
revoke all on function public._conq_ust(text) from public, anon, authenticated;

-- weekend: od piątku 23:45 do niedzieli 23:45 czasu polskiego
create or replace function public._conq_weekend(t timestamptz default now()) returns boolean language sql stable set search_path = '' as $$
  select case extract(isodow from w)
    when 5 then w::time >= time '23:45'
    when 6 then true
    when 7 then w::time < time '23:45'
    else false end
  from (select t at time zone 'Europe/Warsaw' w) x
$$;
-- bieżący albo najbliższy weekend (do pokazania w grze)
create or replace function public._conq_weekend_okno() returns jsonb language sql stable set search_path = '' as $$
  with d as (select now() at time zone 'Europe/Warsaw' w),
  p as (select w, date_trunc('week', w) + interval '4 days 23 hours 45 minutes' pt from d),
  o as (select case when public._conq_weekend() or w < pt then pt else pt + interval '7 days' end od from p)
  select jsonb_build_object('teraz', public._conq_weekend(), 'od', od at time zone 'Europe/Warsaw', 'do', (od + interval '48 hours') at time zone 'Europe/Warsaw') from o
$$;

alter table public.conq_portfel add column if not exists godzina_od timestamptz,
  add column if not exists zarobek int not null default 0;

create table if not exists public.conq_stolice_zdobyte(public_id uuid not null, k text not null, kiedy timestamptz not null default now(), primary key (public_id, k));
alter table public.conq_stolice_zdobyte enable row level security;

-- stawka godzinowa gracza (z mnożnikami za twierdze, stolicę, województwa i granicę)
create or replace function public._conq_dochod_godzinowy(p uuid, weekend boolean) returns int
language sql stable security definer set search_path = '' as $$
  with st as (select public._conq_ust(case when weekend then 'godzinowe_weekend' else 'godzinowe' end) s)
  select coalesce(sum((select s from st)
      * (case when x.score >= 8 then 2 else 1 end)
      * (case when x.k = (select pf.stolica from public.conq_portfel pf where pf.public_id = p)
              then case when public._conq_stolica_bezpieczna(p) then 3 else 2 end else 1 end)
      * (case when w.woj is not null then 2 else 1 end)
      + (case when exists(select 1 from public.conq_granica g where g.k = x.k) then (select s from st) else 0 end)), 0)::int
  from public.conq_powiaty x left join (select ww.woj from public._conq_wojewodowie() ww where ww.owner = p) w on w.woj = left(x.k, 2)
  where x.owner = p
$$;
revoke all on function public._conq_dochod_godzinowy(uuid, boolean) from public, anon, authenticated;

-- codzienna wypłata: stała kwota i premia za posiadane stolice województw
create or replace function public._conq_dzienne(p uuid, weekend boolean) returns int
language sql stable security definer set search_path = '' as $$
  select public._conq_ust(case when weekend then 'dzienne_weekend' else 'dzienne' end)
    + public._conq_ust(case when weekend then 'stolica_woj_dzienne_weekend' else 'stolica_woj_dzienne' end)
      * (select count(*)::int from public.conq_powiaty x where x.owner = p and x.k = any(public._conq_stolice_woj()))
$$;
revoke all on function public._conq_dzienne(uuid, boolean) from public, anon, authenticated;

-- dawna nazwa, teraz szacunek na dobę (do wyświetlania)
create or replace function public._conq_dochod_dzienny(p uuid) returns int
language sql stable security definer set search_path = '' as $$
  select public._conq_dzienne(p, public._conq_weekend()) + 24 * public._conq_dochod_godzinowy(p, public._conq_weekend())
$$;
revoke all on function public._conq_dochod_dzienny(uuid) from public, anon, authenticated;

-- wypłata dzienna dla jednego gracza (raz na dzień); zwraca wypłaconą kwotę
create or replace function public._conq_dochod(p uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare r record; v_dzis date := public._conq_dzien(); v int;
begin
  select * into r from public.conq_portfel where public_id = p for update;
  if found and r.dochod_dzien >= v_dzis then return 0; end if;
  v := public._conq_dzienne(p, public._conq_weekend());
  insert into public.conq_portfel(public_id, monety, dochod_dzien, godzina_od, zarobek) values (p, v, v_dzis, date_trunc('hour', now()), v)
  on conflict (public_id) do update set monety = public.conq_portfel.monety + v, dochod_dzien = v_dzis,
    zarobek = public.conq_portfel.zarobek + v, godzina_od = coalesce(public.conq_portfel.godzina_od, date_trunc('hour', now()));
  return v;
end $$;
revoke all on function public._conq_dochod(uuid) from public, anon, authenticated;

-- co pełną godzinę (pg_cron): stawka za powiaty dla wszystkich, a po północy wypłata dzienna
create or replace function public._conq_godzina() returns int
language plpgsql security definer set search_path = '' as $$
declare r record; v int; n int := 0; v_h timestamptz := date_trunc('hour', now()); v_wk boolean := public._conq_weekend();
begin
  perform pg_advisory_xact_lock(hashtext('conq_godzina'));
  for r in select f.public_id from public.conq_portfel f where f.dochod_dzien is null or f.dochod_dzien < public._conq_dzien() loop
    perform public._conq_dochod(r.public_id);
  end loop;
  for r in select f.public_id from public.conq_portfel f
           where (f.godzina_od is null or f.godzina_od < v_h) and exists(select 1 from public.conq_powiaty x where x.owner = f.public_id) loop
    v := public._conq_dochod_godzinowy(r.public_id, v_wk);
    update public.conq_portfel set monety = monety + v, zarobek = zarobek + v, godzina_od = v_h where public_id = r.public_id;
    n := n + 1;
  end loop;
  update public.conq_portfel set godzina_od = v_h where godzina_od is null or godzina_od < v_h;
  perform public._conq_tick();
  return n;
end $$;
revoke all on function public._conq_godzina() from public, anon, authenticated;

-- szanse: 10 + kupione + bezpieczna stolica + po jednej za każdą stolicę województwa
create or replace function public._conq_limit(p uuid) returns int
language sql stable security definer set search_path = '' as $$
  select public._conq_ust('szanse') + coalesce((select atak_dodatkowe from public.conq_portfel where public_id = p and atak_dzien = public._conq_dzien()), 0)
    + case when public._conq_stolica_bezpieczna(p) then 1 else 0 end
    + public._conq_ust('stolica_woj_szanse') * (select count(*)::int from public.conq_powiaty x where x.owner = p and x.k = any(public._conq_stolice_woj()))
$$;
revoke all on function public._conq_limit(uuid) from public, anon, authenticated;

create or replace function public._conq_koszt_ataku() returns int language sql stable security definer set search_path = '' as $$
  select public._conq_ust('koszt_ataku')
$$;

-- przejęcie powiatu: łup ze stolicy gracza i premia za pierwsze dojście do stolicy województwa
create or replace function public._conq_przejmij(p_k text, p_kto uuid, p_score integer) returns void
language plpgsql security definer set search_path = '' as $$
declare v_stary uuid; n int;
begin
  select owner into v_stary from public.conq_powiaty where k = p_k;
  if v_stary is not null and v_stary <> p_kto then perform public._conq_lup(p_k, v_stary, p_kto); end if;
  insert into public.conq_powiaty(k, owner, score, since, price) values (p_k, p_kto, p_score, now(), null)
  on conflict (k) do update set owner = excluded.owner, score = excluded.score, since = now(), price = null;
  if p_k = any(public._conq_stolice_woj()) then
    insert into public.conq_stolice_zdobyte(public_id, k) values (p_kto, p_k) on conflict do nothing;
    get diagnostics n = row_count;
    if n > 0 then perform public._conq_monety(p_kto, public._conq_ust('stolica_woj_odkrycie')); end if;
  end if;
end $$;
revoke all on function public._conq_przejmij(text, uuid, integer) from public, anon, authenticated;

-- zadania dnia: 50 za każde, 100 za komplet
create or replace function public._conq_zadania_wyplac(p uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare v_dzis date := public._conq_dzien(); kod text; v int := 0; n int;
begin
  foreach kod in array public._conq_zadania_dnia(v_dzis) loop
    if public._conq_zadanie_zrobione(p, kod) then
      insert into public.conq_zadania(dzien, public_id, kod) values (v_dzis, p, kod) on conflict do nothing;
      get diagnostics n = row_count; if n > 0 then v := v + public._conq_ust('zadanie'); end if;
    end if;
  end loop;
  if (select count(*) from public.conq_zadania z where z.dzien = v_dzis and z.public_id = p and z.kod <> 'komplet') >= 3 then
    insert into public.conq_zadania(dzien, public_id, kod) values (v_dzis, p, 'komplet') on conflict do nothing;
    get diagnostics n = row_count; if n > 0 then v := v + public._conq_ust('zadania_komplet'); end if;
  end if;
  if v > 0 then perform public._conq_monety(p, v); end if;
  return v;
end $$;
revoke all on function public._conq_zadania_wyplac(uuid) from public, anon, authenticated;

-- skarby: tylko wolne miasta na prawach powiatu, bez stolic województw (te mają własne premie)
create or replace function public._conq_skarby(t text) returns text[]
language plpgsql volatile security definer set search_path = '' as $$
declare v text[];
begin
  select array_agg(w.k order by w.k) into v from public.conq_skarby_wybor w where w.tydzien = t;
  if v is not null then return v; end if;
  perform pg_advisory_xact_lock(hashtext('conq_skarby_wybor' || t));
  select array_agg(w.k order by w.k) into v from public.conq_skarby_wybor w where w.tydzien = t;
  if v is not null then return v; end if;
  insert into public.conq_skarby_wybor(tydzien, k)
  select t, k from (select distinct s.k from public.conq_sasiedzi s
    where substr(s.k, 3, 2)::int >= 60 and s.k <> all(public._conq_stolice_woj())
      and not exists(select 1 from public.conq_powiaty p where p.k = s.k and p.owner is not null)) x
  order by md5(t || ':grodzki:' || k) limit 5
  on conflict do nothing;
  select array_agg(w.k order by w.k) into v from public.conq_skarby_wybor w where w.tydzien = t;
  return coalesce(v, '{}');
end $$;
revoke all on function public._conq_skarby(text) from public, anon, authenticated;

-- ceny z ustawień
create or replace function public.conq_tarcza(p_device uuid, p_token text, p_k text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token); p record; v_m int; v_koszt int := public._conq_ust('koszt_tarczy');
begin
  if v_me is null then raise exception 'Najpierw zapisz swój pseudonim w rankingu.'; end if;
  select * into p from public.conq_powiaty x where x.k = p_k for update;
  if not found or p.owner <> v_me then raise exception 'To nie jest Twój powiat'; end if;
  if p.tarcza_do > now() then raise exception 'Ten powiat ma już tarczę.'; end if;
  if p.tarcza_od > now() - interval '3 days' then raise exception 'Na ten powiat tarczę postawisz znowu %.', to_char((p.tarcza_od + interval '3 days') at time zone 'Europe/Warsaw', 'DD.MM HH24:MI'); end if;
  if (select count(*) from public.conq_powiaty x where x.owner = v_me and x.tarcza_do > now()) >= 2 then raise exception 'Możesz mieć najwyżej 2 tarcze naraz.'; end if;
  if exists(select 1 from public.conq_pojedynki x where x.k = p_k and x.status in ('start','czeka')) then raise exception 'O ten powiat trwa pojedynek.'; end if;
  perform public._conq_dochod(v_me);
  if coalesce((select monety from public.conq_portfel where public_id = v_me), 0) < v_koszt then raise exception 'Tarcza kosztuje % monet.', v_koszt; end if;
  v_m := public._conq_monety(v_me, -v_koszt);
  update public.conq_powiaty set tarcza_do = now() + interval '24 hours', tarcza_od = now() where k = p_k;
  return jsonb_build_object('monety', v_m, 'do', now() + interval '24 hours');
end $$;

create or replace function public.conq_stolica(p_device uuid, p_token text, p_k text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token); r record; v_ile int; v_koszt int := 0;
begin
  if v_me is null then raise exception 'Najpierw zapisz swój pseudonim w rankingu.'; end if;
  if not exists(select 1 from public.conq_powiaty x where x.k = p_k and x.owner = v_me) then raise exception 'To nie jest Twój powiat'; end if;
  select count(*) into v_ile from public.conq_powiaty x where x.owner = v_me;
  if v_ile < 10 then raise exception 'Stolicę wybierasz, gdy masz co najmniej 10 powiatów (masz %).', v_ile; end if;
  perform public._conq_dochod(v_me);
  select * into r from public.conq_portfel where public_id = v_me for update;
  if r.stolica = p_k then return jsonb_build_object('stolica', p_k, 'monety', r.monety); end if;
  if r.stolica is not null and exists(select 1 from public.conq_powiaty x where x.k = r.stolica and x.owner = v_me) then v_koszt := public._conq_ust('koszt_stolicy'); end if;
  if coalesce(r.monety, 0) < v_koszt then raise exception 'Przeniesienie stolicy kosztuje % monet.', v_koszt; end if;
  update public.conq_portfel set monety = monety - v_koszt, stolica = p_k, stolica_od = now() where public_id = v_me returning * into r;
  return jsonb_build_object('stolica', p_k, 'monety', r.monety, 'koszt', v_koszt);
end $$;

-- oblężenia nie da się wykupić: przerywa je tylko dojście do odciętych powiatów
create or replace function public.conq_odsiecz(p_device uuid, p_token text, p_k text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'Odsieczy już nie ma: oblężenie przerwiesz tylko, gdy dojdziesz do odciętych powiatów (zdobędziesz powiat, który połączy je z resztą).';
end $$;

create or replace function public._conq_oblezenia() returns void
language plpgsql security definer set search_path = '' as $$
declare r record; v_wyslane text[] := '{}';
  v_odc jsonb := coalesce((select jsonb_agg(to_jsonb(x)) from public._conq_odciete() x), '[]'::jsonb);
begin
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
  update public.conq_oblezenia o set aktywne = false
   where o.aktywne and not exists(select 1 from jsonb_to_recordset(v_odc) as t(k text, owner uuid, oblegajacy uuid, c text) where t.k = o.k and t.owner = o.owner);
  v_wyslane := '{}';
  for r in select t.* from jsonb_to_recordset(v_odc) as t(k text, owner uuid, oblegajacy uuid, c text) join public.conq_powiaty p on p.k = t.k and p.owner = t.owner
           where not exists(select 1 from public.conq_oblezenia o where o.k = t.k and o.aktywne and o.owner = t.owner) loop
    insert into public.conq_oblezenia(k, owner, oblegajacy, start, koniec, odsiecz, aktywne) values (r.k, r.owner, r.oblegajacy, now(), now() + interval '48 hours', 0, true)
    on conflict (k) do update set owner = excluded.owner, oblegajacy = excluded.oblegajacy, start = excluded.start, koniec = excluded.koniec, odsiecz = 0, aktywne = true;
    if not (r.owner::text || r.c) = any(v_wyslane) then
      v_wyslane := v_wyslane || (r.owner::text || r.c);
      perform public._conq_wiad(r.oblegajacy, r.owner, 'Twoje powiaty zostały odcięte i otoczone! Masz 48 godzin, żeby do nich dojść i połączyć je z resztą na mapie Podboju.', 'challenge', jsonb_build_object('podboj', jsonb_build_object('k', r.k)));
    end if;
  end loop;
end $$;

-- wynik ataku, stan gracza i tygodnia z nowymi nagrodami
create or replace function public.conq_wynik(p_device uuid, p_token text, p_id uuid, p_score integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token); a record; p record; d record; v_s int := least(8, greatest(0, coalesce(p_score, 0))); v_wynik text;
  v_nowe boolean := false; v_out jsonb; t text := public._tydzien(); v_miejsce int; v_skarb jsonb; v_zad int; v_m0 int; v_lup int := 0;
  v_ile0 int; v_bylo boolean; v_odb int := 0; v_nagr int; v_paczka text; v_stol int := 0;
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
  select count(*) into v_ile0 from public.conq_powiaty m where m.owner = v_me;
  select * into p from public.conq_powiaty x where x.k = a.k for update;
  if a.rodzaj = 'atak' then
    if p.k is null then
      if v_s >= 5 then perform public._conq_przejmij(a.k, v_me, v_s); v_wynik := 'zdobyty'; else v_wynik := 'za_malo'; end if;
    elsif p.owner = v_me then
      if v_s > p.score then update public.conq_powiaty set score = v_s where k = a.k; v_wynik := 'umocniony'; else v_wynik := 'bez_zmian'; end if;
    elsif p.score < 8 and v_s >= public._conq_cel(a.k, v_me) then
      v_m0 := coalesce((select monety from public.conq_portfel where public_id = v_me), 0);
      perform public._conq_przejmij(a.k, v_me, v_s); v_wynik := 'przejety';
      if exists(select 1 from public.conq_stolice_zdobyte z where z.public_id = v_me and z.k = a.k and z.kiedy = now()) then v_stol := public._conq_ust('stolica_woj_odkrycie'); end if;
      v_lup := coalesce((select monety from public.conq_portfel where public_id = v_me), 0) - v_m0 - v_stol;
      perform public._conq_wiad(v_me, p.owner, public._conq_nick(v_me) || ' przejął Twój powiat (' || v_s || ' : ' || p.score || '). Odbij go na mapie Podboju!', 'result', jsonb_build_object('podboj', jsonb_build_object('k', a.k)));
    else v_wynik := 'za_malo';
    end if;
    update public.conq_proby set done = true, score = v_s, wynik = v_wynik, nowe_woj = v_nowe and v_wynik in ('zdobyty','przejety') where id = p_id;
    if v_wynik = 'zdobyty' and exists(select 1 from public.conq_stolice_zdobyte z where z.public_id = v_me and z.k = a.k and z.kiedy = now()) then v_stol := public._conq_ust('stolica_woj_odkrycie'); end if;
    v_out := jsonb_build_object('wynik', v_wynik, 'score', v_s, 'k', a.k, 'lup', v_lup);
    if v_stol > 0 then v_out := v_out || jsonb_build_object('stolica_woj', jsonb_build_object('monety', v_stol, 'szanse', public._conq_ust('stolica_woj_szanse'), 'dzienne', public._conq_ust('stolica_woj_dzienne'))); end if;
    -- nowy start: pierwszy powiat (pierwszy w ogóle albo po utracie wszystkich)
    if v_wynik in ('zdobyty','przejety') and v_ile0 = 0 then
      v_bylo := exists(select 1 from public.conq_proby x where x.gracz = v_me and x.id <> p_id and x.wynik in ('zdobyty','przejety'));
      if v_bylo and coalesce((select odbudowa_od from public.conq_portfel where public_id = v_me), '-infinity') < now() - interval '7 days' then
        v_odb := 40; perform public._conq_monety(v_me, v_odb);
      end if;
      insert into public.conq_portfel(public_id, ochrona_do, odbudowa_od) values (v_me, now() + interval '48 hours', case when v_odb > 0 then now() end)
        on conflict (public_id) do update set ochrona_do = now() + interval '48 hours',
          odbudowa_od = case when v_odb > 0 then now() else public.conq_portfel.odbudowa_od end;
      v_out := v_out || jsonb_build_object('nowy_start', jsonb_build_object('ochrona_do', now() + interval '48 hours', 'monety', v_odb, 'powrot', v_bylo));
    end if;
    -- skarby tygodnia: każdy osobno, nagroda zależy od miejsca
    if v_wynik in ('zdobyty','przejety') and a.k = any(public._conq_skarby(t))
       and not exists(select 1 from public.conq_skarby s where s.tydzien = t and s.k = a.k and s.public_id = v_me) then
      perform pg_advisory_xact_lock(hashtext('conq_skarb' || t || a.k));
      v_miejsce := (select count(*) from public.conq_skarby s where s.tydzien = t and s.k = a.k) + 1;
      insert into public.conq_skarby(tydzien, k, public_id, miejsce) values (t, a.k, v_me, v_miejsce);
      v_nagr := public._conq_ust(case when v_miejsce = 1 then 'skarb_1' when v_miejsce <= 3 then 'skarb_2' else 'skarb_dalej' end);
      v_paczka := case when v_miejsce = 1 then 'legenda' when v_miejsce <= 3 then 'zloto' else 'srebro' end;
      perform public._conq_monety(v_me, v_nagr);
      v_skarb := jsonb_build_object('miejsce', v_miejsce, 'monety', v_nagr, 'paczka', v_paczka, 'tydzien', t, 'k', a.k);
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
revoke all on function public.conq_wynik(uuid, text, uuid, integer) from public;
grant execute on function public.conq_wynik(uuid, text, uuid, integer) to anon, authenticated;


create or replace function public.conq_ja(p_device uuid, p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token); v_dochod int; v_zad int; v_dzis date; r record; t text := public._tydzien(); v_wk boolean := public._conq_weekend();
begin
  if v_me is null then return null; end if;
  perform public._conq_tick();
  v_dochod := public._conq_dochod(v_me);
  v_zad := public._conq_zadania_wyplac(v_me);
  v_dzis := public._conq_dzien();
  -- zarobek od ostatniej wizyty (godzinówka, dzienne) pokazujemy raz i zerujemy
  select * into r from public.conq_portfel where public_id = v_me for update;
  update public.conq_portfel set zarobek = 0 where public_id = v_me and zarobek <> 0;
  return jsonb_build_object(
    'me', v_me,
    'ataki', public._conq_ataki(v_me),
    'limit', public._conq_limit(v_me),
    'monety', coalesce(r.monety, 0),
    'dochod', v_dochod,
    'zarobek', coalesce(r.zarobek, 0),
    'dochod_dzienny', public._conq_dochod_dzienny(v_me),
    'dochod_godzinowy', public._conq_dochod_godzinowy(v_me, v_wk),
    'dzienne', public._conq_dzienne(v_me, v_wk),
    'weekend', public._conq_weekend_okno(),
    'powiaty', (select count(*) from public.conq_powiaty where owner = v_me),
    'przygraniczne', (select count(*) from public.conq_powiaty p join public.conq_granica g on g.k = p.k where p.owner = v_me),
    'stolice_woj', (select coalesce(jsonb_agg(p.k order by p.k), '[]'::jsonb) from public.conq_powiaty p where p.owner = v_me and p.k = any(public._conq_stolice_woj())),
    'stolice_woj_zdobyte', (select coalesce(jsonb_agg(z.k order by z.k), '[]'::jsonb) from public.conq_stolice_zdobyte z where z.public_id = v_me),
    'stolica', (select x.stolica from public.conq_portfel x join public.conq_powiaty p on p.k = x.stolica and p.owner = x.public_id where x.public_id = v_me),
    'koszt_stolicy', public._conq_ust('koszt_stolicy'),
    'stolica_bezpieczna', public._conq_stolica_bezpieczna(v_me),
    'koszt_tarczy', public._conq_ust('koszt_tarczy'),
    'tarcze', (select count(*) from public.conq_powiaty p where p.owner = v_me and p.tarcza_do > now()),
    'ochrona_do', public._conq_ochrona(v_me),
    'grał', exists(select 1 from public.conq_proby x where x.gracz = v_me and x.wynik in ('zdobyty','przejety')),
    'odbudowa', r.odbudowa_od is null or r.odbudowa_od < now() - interval '7 days',
    'wojewoda', (select coalesce(jsonb_agg(w.woj order by w.woj), '[]'::jsonb) from public._conq_wojewodowie() w where w.owner = v_me),
    'zadania_monety', v_zad,
    'koszt_ataku', public._conq_koszt_ataku(),
    'ustawienia', (select jsonb_object_agg(klucz, wartosc) from public.conq_ustawienia),
    'zadania', (select jsonb_agg(jsonb_build_object('kod', kod, 'opis', public._conq_zadanie_opis(kod),
                 'zrobione', exists(select 1 from public.conq_zadania z where z.dzien = v_dzis and z.public_id = v_me and z.kod = x.kod))) from unnest(public._conq_zadania_dnia(v_dzis)) as x(kod)),
    'komplet', exists(select 1 from public.conq_zadania z where z.dzien = v_dzis and z.public_id = v_me and z.kod = 'komplet'),
    'skarb_miejsce', (select min(s.miejsce) from public.conq_skarby s where s.tydzien = t and s.public_id = v_me),
    'skarby_moje', (select coalesce(jsonb_agg(jsonb_build_object('k', s.k, 'miejsce', s.miejsce) order by s.kiedy), '[]'::jsonb) from public.conq_skarby s where s.tydzien = t and s.public_id = v_me),
    'obrony', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'k', d.k, 'nick', public._conq_nick(d.challenger), 'expires', d.expires, 'wynik', d.ch_score) order by d.expires), '[]'::jsonb)
               from public.conq_pojedynki d where d.defender = v_me and d.status = 'czeka'),
    'moje_pojedynki', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'k', d.k, 'nick', public._conq_nick(d.defender), 'expires', d.expires, 'wynik', d.ch_score) order by d.expires), '[]'::jsonb)
               from public.conq_pojedynki d where d.challenger = v_me and d.status = 'czeka'),
    'oblezony', (select coalesce(jsonb_agg(jsonb_build_object('k', o.k, 'nick', public._conq_nick(o.oblegajacy), 'koniec', o.koniec) order by o.koniec), '[]'::jsonb)
               from public.conq_oblezenia o where o.aktywne and o.owner = v_me),
    'oblegam', (select coalesce(jsonb_agg(jsonb_build_object('k', o.k, 'nick', public._conq_nick(o.owner), 'koniec', o.koniec) order by o.koniec), '[]'::jsonb)
               from public.conq_oblezenia o where o.aktywne and o.oblegajacy = v_me));
end $$;
revoke all on function public.conq_ja(uuid, text) from public;
grant execute on function public.conq_ja(uuid, text) to anon, authenticated;

create or replace function public.conq_tydzien()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t text := public._tydzien(); v_sk text[] := public._conq_skarby(public._tydzien());
begin
  return jsonb_build_object('tydzien', t, 'skarb', v_sk[1],
    'skarby', (select coalesce(jsonb_agg(jsonb_build_object('k', x.k, 'stolica_woj', x.k = any(public._conq_stolice_woj()),
        'zdobywcy', (select coalesce(jsonb_agg(jsonb_build_object('nick', public._conq_nick(s.public_id), 'miejsce', s.miejsce) order by s.miejsce), '[]'::jsonb)
                     from public.conq_skarby s where s.tydzien = t and s.k = x.k)) order by x.i), '[]'::jsonb)
      from unnest(v_sk) with ordinality as x(k, i)),
    'zdobywcy', (select coalesce(jsonb_agg(jsonb_build_object('nick', public._conq_nick(s.public_id), 'miejsce', s.miejsce) order by s.miejsce), '[]'::jsonb) from public.conq_skarby s where s.tydzien = t and s.k = v_sk[1]),
    'wojewodowie', (select coalesce(jsonb_agg(jsonb_build_object('woj', w.woj, 'owner', w.owner, 'nick', public._conq_nick(w.owner)) order by w.woj), '[]'::jsonb) from public._conq_wojewodowie() w),
    'stolice', (select coalesce(jsonb_agg(jsonb_build_object('k', x.stolica, 'owner', x.public_id, 'bezpieczna', public._conq_stolica_bezpieczna(x.public_id))), '[]'::jsonb) from public.conq_portfel x join public.conq_powiaty p on p.k = x.stolica and p.owner = x.public_id),
    'tarcze', (select coalesce(jsonb_agg(jsonb_build_object('k', p.k, 'do', p.tarcza_do)), '[]'::jsonb) from public.conq_powiaty p where p.tarcza_do > now()),
    'ochrony', (select coalesce(jsonb_agg(jsonb_build_object('owner', x.public_id, 'do', x.ochrona_do)), '[]'::jsonb) from public.conq_portfel x where x.ochrona_do > now()),
    'granica', (select coalesce(jsonb_agg(g.k order by g.k), '[]'::jsonb) from public.conq_granica g),
    'stolice_woj', to_jsonb(public._conq_stolice_woj()),
    'weekend', public._conq_weekend_okno(),
    'skarb_nagrody', jsonb_build_array(public._conq_ust('skarb_1'), public._conq_ust('skarb_2'), public._conq_ust('skarb_dalej')),
    'oblezenia', (select coalesce(jsonb_agg(jsonb_build_object('k', o.k, 'owner', o.owner, 'oblegajacy', o.oblegajacy, 'koniec', o.koniec)), '[]'::jsonb) from public.conq_oblezenia o where o.aktywne));
end $$;
revoke all on function public.conq_tydzien() from public;
grant execute on function public.conq_tydzien() to anon, authenticated;

-- wypłaty co pełną godzinę
create extension if not exists pg_cron;
select cron.schedule('podboj-godzina', '0 * * * *', 'select public._conq_godzina()');

-- najwyżej 10 dokupionych ataków dziennie, żeby przy dużych zarobkach dzienne szanse dalej coś znaczyły
insert into public.conq_ustawienia(klucz, wartosc, opis) values ('kupione_max', 10, 'najwięcej dokupionych ataków dziennie') on conflict (klucz) do nothing;
create or replace function public.conq_kup_atak(p_device uuid, p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token); r record; v_dzis date := public._conq_dzien(); v_koszt int := public._conq_koszt_ataku();
begin
  if v_me is null then raise exception 'Najpierw zapisz swój pseudonim w rankingu.'; end if;
  perform public._conq_dochod(v_me);
  select * into r from public.conq_portfel where public_id = v_me for update;
  if r.atak_dzien = v_dzis and r.atak_kupione >= public._conq_ust('kupione_max') then
    raise exception 'Dziś dokupiłeś już % ataków, więcej się nie da. Wróć jutro!', r.atak_kupione; end if;
  if coalesce(r.monety, 0) < v_koszt then raise exception 'Za mało monet: potrzeba %, masz %.', v_koszt, coalesce(r.monety, 0); end if;
  update public.conq_portfel set monety = monety - v_koszt,
    atak_dodatkowe = case when atak_dzien = v_dzis then atak_dodatkowe + 1 else 1 end,
    atak_kupione = case when atak_dzien = v_dzis then atak_kupione + 1 else 1 end,
    atak_dzien = v_dzis where public_id = v_me returning * into r;
  return jsonb_build_object('monety', r.monety, 'limit', public._conq_limit(v_me), 'koszt_ataku', v_koszt, 'kupione', r.atak_kupione);
end $$;
