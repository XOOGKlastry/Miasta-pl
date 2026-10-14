-- Podbój: kilka skarbów tygodnia (stolice województw + losowy powiat), większe nagrody,
-- premia za powiaty przy granicy Polski, nowy start dla nowych graczy i tych, którzy stracili wszystko.
--  * Skarby: ręczny wybór w conq_skarby_wybor(tydzien, k); bez wyboru 4 stolice województw i 1 losowy powiat.
--    Nagrody za każdy skarb osobno: 1. zdobywca 100 monet i legendarna paczka, 2.–3. 50 i złota, kolejni 25 i srebrna.
--  * Przy granicy Polski (lądowej i morskiej, 68 powiatów, conq_granica): +2 monety dziennie za powiat.
--  * Nowy start (gracz bez powiatów): może zacząć od dowolnego wolnego powiatu albo zwykłego cudzego
--    (nie twierdzy, nie stolicy, bez tarczy), dostaje 48 h ochrony (ochrona kończy się, gdy sam zaatakuje gracza)
--    i 40 monet na odbudowę, jeśli już kiedyś grał (raz na 7 dni).
create table if not exists public.conq_skarby_wybor(tydzien text not null, k text not null, primary key (tydzien, k));
alter table public.conq_skarby_wybor enable row level security;
create table if not exists public.conq_skarby(tydzien text not null, k text not null, public_id uuid not null, miejsce int not null,
  kiedy timestamptz not null default now(), primary key (tydzien, k, public_id));
alter table public.conq_skarby enable row level security;
insert into public.conq_skarby(tydzien, k, public_id, miejsce) select tydzien, k, public_id, miejsce from public.conq_skarb on conflict do nothing;
create table if not exists public.conq_granica(k text primary key);
alter table public.conq_granica enable row level security;
insert into public.conq_granica(k) values ('0206'),('0207'),('0208'),('0210'),('0212'),('0221'),('0224'),('0225'),('0261'),('0601'),('0603'),('0604'),('0618'),('0619'),('0801'),('0802'),('0805'),('0811'),('1205'),('1210'),('1211'),('1215'),('1217'),('1602'),('1607'),('1610'),('1801'),('1804'),('1805'),('1807'),('1809'),('1813'),('1817'),('1821'),('2001'),('2002'),('2005'),('2009'),('2010'),('2011'),('2012'),('2208'),('2210'),('2211'),('2212'),('2215'),('2261'),('2262'),('2264'),('2403'),('2411'),('2415'),('2417'),('2467'),('2801'),('2802'),('2808'),('2818'),('2819'),('3205'),('3206'),('3207'),('3208'),('3209'),('3210'),('3211'),('3213'),('3263') on conflict do nothing;
alter table public.conq_portfel add column if not exists ochrona_do timestamptz, add column if not exists odbudowa_od timestamptz;

create or replace function public._conq_stolice_woj() returns text[] language sql immutable set search_path = '' as $$
  select array['0264','0461','0463','0663','0861','0862','1061','1261','1465','1661','1863','2061','2261','2469','2661','2862','3064','3262']
$$;
revoke all on function public._conq_stolice_woj() from public, anon, authenticated;

create or replace function public._conq_skarby(t text) returns text[] language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select array_agg(w.k order by w.k) from public.conq_skarby_wybor w where w.tydzien = t),
    (select array_agg(k) from (
      (select k from unnest(public._conq_stolice_woj()) k order by md5(t || ':stolica:' || k) limit 4)
      union all
      (select k from (select distinct s.k from public.conq_sasiedzi s where substr(s.k, 3, 2)::int < 60) x order by md5(t || ':skarb:' || k) limit 1)
    ) y))
$$;
revoke all on function public._conq_skarby(text) from public, anon, authenticated;
-- zgodność ze starszą wersją gry: pierwszy skarb
create or replace function public._conq_skarb_k(t text) returns text language sql stable security definer set search_path = '' as $$
  select (public._conq_skarby(t))[1]
$$;
revoke all on function public._conq_skarb_k(text) from public, anon, authenticated;

create or replace function public._conq_dochod_dzienny(p uuid) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce(sum((case when x.score >= 8 then 6 else 3 end)
      * (case when x.k = (select pf.stolica from public.conq_portfel pf where pf.public_id = p)
              then case when public._conq_stolica_bezpieczna(p) then 3 else 2 end else 1 end)
      * (case when w.woj is not null then 2 else 1 end)
      + (case when exists(select 1 from public.conq_granica g where g.k = x.k) then 2 else 0 end)), 0)::int
  from public.conq_powiaty x left join (select ww.woj from public._conq_wojewodowie() ww where ww.owner = p) w on w.woj = left(x.k, 2)
  where x.owner = p
$$;
revoke all on function public._conq_dochod_dzienny(uuid) from public, anon, authenticated;

-- ochrona nowego gracza aktywna?
create or replace function public._conq_ochrona(p uuid) returns timestamptz language sql stable security definer set search_path = '' as $$
  select ochrona_do from public.conq_portfel where public_id = p and ochrona_do > now()
$$;
revoke all on function public._conq_ochrona(uuid) from public, anon, authenticated;

-- start ataku: nowy start bez powiatów, ochrona nowego gracza, kilka skarbów
create or replace function public.conq_start(p_device uuid, p_token text, p_k text, p_rodzaj text, p_pojedynek uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token); p record; v_ile int; v_seed text; v_id uuid; d record; v_duel uuid; v_moj boolean; v_lim int; v_och timestamptz;
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
  if p.owner is not null and p.owner <> v_me and p.tarcza_do > now() then
    raise exception 'Ten powiat chroni tarcza do %. Zaatakuj inny.', to_char(p.tarcza_do at time zone 'Europe/Warsaw', 'DD.MM HH24:MI'); end if;
  if p.owner is not null and p.owner <> v_me then
    v_och := public._conq_ochrona(p.owner);
    if v_och is not null then
      raise exception 'Ten gracz dopiero zaczyna i ma ochronę do %. Zaatakuj kogoś innego.', to_char(v_och at time zone 'Europe/Warsaw', 'DD.MM HH24:MI'); end if;
  end if;
  select count(*) into v_ile from public.conq_powiaty x where x.owner = v_me;
  v_moj := coalesce(p.owner = v_me, false);
  if not v_moj and v_ile > 0 and not exists(
      select 1 from public.conq_sasiedzi s join public.conq_powiaty m on m.k = s.nb and m.owner = v_me where s.k = p_k) then
    raise exception 'Możesz atakować tylko powiaty graniczące z Twoimi'; end if;
  if v_ile = 0 and p.owner is not null then
    if p_rodzaj = 'pojedynek' or p.score >= 8 then raise exception 'Na nowy start wybierz wolny powiat albo zwykły cudzy (nie twierdzę)'; end if;
    if exists(select 1 from public.conq_portfel x where x.public_id = p.owner and x.stolica = p_k) then
      raise exception 'Na nowy start nie możesz zaczynać od cudzej stolicy'; end if;
  end if;
  -- kto atakuje innego gracza, traci ochronę nowego gracza
  if p.owner is not null and p.owner <> v_me then
    update public.conq_portfel set ochrona_do = null where public_id = v_me and ochrona_do is not null;
  end if;
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
    'cel', public._conq_cel(p_k, v_me), 'stolica', coalesce((select x.stolica = p_k from public.conq_portfel x where x.public_id = p.owner), false),
    'wlasny', v_moj, 'rywal', case when p.owner is null or p.owner = v_me then null else public._conq_nick(p.owner) end,
    'skarb', p_k = any(public._conq_skarby(public._tydzien())), 'nowy_start', v_ile = 0);
end $$;
revoke all on function public.conq_start(uuid, text, text, text, uuid) from public;
grant execute on function public.conq_start(uuid, text, text, text, uuid) to anon, authenticated;

create or replace function public.conq_wynik(p_device uuid, p_token text, p_id uuid, p_score integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token); a record; p record; d record; v_s int := least(8, greatest(0, coalesce(p_score, 0))); v_wynik text;
  v_nowe boolean := false; v_out jsonb; t text := public._tydzien(); v_miejsce int; v_skarb jsonb; v_zad int; v_m0 int; v_lup int := 0;
  v_ile0 int; v_bylo boolean; v_odb int := 0; v_nagr int; v_paczka text;
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
      v_lup := coalesce((select monety from public.conq_portfel where public_id = v_me), 0) - v_m0;
      perform public._conq_wiad(v_me, p.owner, public._conq_nick(v_me) || ' przejął Twój powiat (' || v_s || ' : ' || p.score || '). Odbij go na mapie Podboju!', 'result', jsonb_build_object('podboj', jsonb_build_object('k', a.k)));
    else v_wynik := 'za_malo';
    end if;
    update public.conq_proby set done = true, score = v_s, wynik = v_wynik, nowe_woj = v_nowe and v_wynik in ('zdobyty','przejety') where id = p_id;
    v_out := jsonb_build_object('wynik', v_wynik, 'score', v_s, 'k', a.k, 'lup', v_lup);
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
      v_nagr := case when v_miejsce = 1 then 100 when v_miejsce <= 3 then 50 else 25 end;
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
    'dochod_dzienny', public._conq_dochod_dzienny(v_me),
    'powiaty', (select count(*) from public.conq_powiaty where owner = v_me),
    'przygraniczne', (select count(*) from public.conq_powiaty p join public.conq_granica g on g.k = p.k where p.owner = v_me),
    'stolica', (select x.stolica from public.conq_portfel x join public.conq_powiaty p on p.k = x.stolica and p.owner = x.public_id where x.public_id = v_me),
    'koszt_stolicy', 50,
    'stolica_bezpieczna', public._conq_stolica_bezpieczna(v_me),
    'koszt_tarczy', 30,
    'tarcze', (select count(*) from public.conq_powiaty p where p.owner = v_me and p.tarcza_do > now()),
    'ochrona_do', public._conq_ochrona(v_me),
    'grał', exists(select 1 from public.conq_proby x where x.gracz = v_me and x.wynik in ('zdobyty','przejety')),
    'odbudowa', r.odbudowa_od is null or r.odbudowa_od < now() - interval '7 days',
    'wojewoda', (select coalesce(jsonb_agg(w.woj order by w.woj), '[]'::jsonb) from public._conq_wojewodowie() w where w.owner = v_me),
    'zadania_monety', v_zad,
    'koszt_ataku', public._conq_koszt_ataku(),
    'zadania', (select jsonb_agg(jsonb_build_object('kod', kod, 'opis', public._conq_zadanie_opis(kod),
                 'zrobione', exists(select 1 from public.conq_zadania z where z.dzien = v_dzis and z.public_id = v_me and z.kod = x.kod))) from unnest(public._conq_zadania_dnia(v_dzis)) as x(kod)),
    'komplet', exists(select 1 from public.conq_zadania z where z.dzien = v_dzis and z.public_id = v_me and z.kod = 'komplet'),
    'skarb_miejsce', (select min(s.miejsce) from public.conq_skarby s where s.tydzien = t and s.public_id = v_me),
    'skarby_moje', (select coalesce(jsonb_agg(jsonb_build_object('k', s.k, 'miejsce', s.miejsce) order by s.kiedy), '[]'::jsonb) from public.conq_skarby s where s.tydzien = t and s.public_id = v_me),
    'obrony', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'k', d.k, 'nick', public._conq_nick(d.challenger), 'expires', d.expires, 'wynik', d.ch_score) order by d.expires), '[]'::jsonb)
               from public.conq_pojedynki d where d.defender = v_me and d.status = 'czeka'),
    'moje_pojedynki', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'k', d.k, 'nick', public._conq_nick(d.defender), 'expires', d.expires, 'wynik', d.ch_score) order by d.expires), '[]'::jsonb)
               from public.conq_pojedynki d where d.challenger = v_me and d.status = 'czeka'),
    'oblezony', (select coalesce(jsonb_agg(jsonb_build_object('k', o.k, 'nick', public._conq_nick(o.oblegajacy), 'koniec', o.koniec, 'odsiecz', o.odsiecz) order by o.koniec), '[]'::jsonb)
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
    'oblezenia', (select coalesce(jsonb_agg(jsonb_build_object('k', o.k, 'owner', o.owner, 'oblegajacy', o.oblegajacy, 'koniec', o.koniec)), '[]'::jsonb) from public.conq_oblezenia o where o.aktywne));
end $$;
revoke all on function public.conq_tydzien() from public;
grant execute on function public.conq_tydzien() to anon, authenticated;
