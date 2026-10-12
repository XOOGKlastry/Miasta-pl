-- Podbój: Wojewoda i stolica.
--  * Wojewoda: kto ma wszystkie powiaty województwa, dostaje tytuł i podwójny dochód z tego województwa.
--  * Stolica: od 10 powiatów gracz wybiera stolicę (pierwszy wybór darmowy, przeniesienie 50 monet).
--    Stolica daje podwójny dochód i +1 do obrony (przejęcie wymaga o 1 więcej niż zwykle, najwyżej 8).
--    Kto zdobędzie cudzą stolicę, łupi 20% monet właściciela; właściciel wybiera nową, gdy znów ma 10 powiatów.
alter table public.conq_portfel add column if not exists stolica text, add column if not exists stolica_od timestamptz;

create or replace function public._conq_wojewodowie() returns table(woj text, owner uuid)
language sql stable security definer set search_path = '' as $$
  with wsz as (select left(s.k, 2) woj, count(distinct s.k) n from public.conq_sasiedzi s group by 1),
       moje as (select left(p.k, 2) woj, p.owner, count(*) n from public.conq_powiaty p where p.owner is not null group by 1, 2)
  select m.woj, m.owner from moje m join wsz w on w.woj = m.woj and w.n = m.n
$$;
revoke all on function public._conq_wojewodowie() from public, anon, authenticated;

-- dochód dzienny: 3 za powiat, 6 za twierdzę; stolica ×2, powiaty w województwie, którego gracz jest wojewodą, ×2
create or replace function public._conq_dochod_dzienny(p uuid) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce(sum((case when x.score >= 8 then 6 else 3 end)
      * (case when x.k = (select pf.stolica from public.conq_portfel pf where pf.public_id = p) then 2 else 1 end)
      * (case when w.woj is not null then 2 else 1 end)), 0)::int
  from public.conq_powiaty x left join (select ww.woj from public._conq_wojewodowie() ww where ww.owner = p) w on w.woj = left(x.k, 2)
  where x.owner = p
$$;
revoke all on function public._conq_dochod_dzienny(uuid) from public, anon, authenticated;

-- ile dobrych odpowiedzi trzeba w ataku na powiat
create or replace function public._conq_cel(p_k text, p_me uuid) returns int
language sql stable security definer set search_path = '' as $$
  select case when p.owner is null then 5 when p.owner = p_me then p.score + 1
    else least(8, p.score + 1 + case when exists(select 1 from public.conq_portfel pf where pf.public_id = p.owner and pf.stolica = p.k) then 1 else 0 end) end
  from (select k, owner, score from public.conq_powiaty where k = p_k union all select p_k, null::uuid, 0 where not exists(select 1 from public.conq_powiaty where k = p_k)) p
$$;
revoke all on function public._conq_cel(text, uuid) from public, anon, authenticated;

-- utrata stolicy: zdobywca łupi 20% monet, właściciel traci stolicę
create or replace function public._conq_lup(p_k text, p_stary uuid, p_nowy uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare v int;
begin
  select floor(coalesce(monety, 0) * 0.2)::int into v from public.conq_portfel where public_id = p_stary and stolica = p_k for update;
  if not found then return 0; end if;
  update public.conq_portfel set monety = monety - v, stolica = null where public_id = p_stary;
  if v > 0 then perform public._conq_monety(p_nowy, v); end if;
  perform public._conq_wiad(p_nowy, p_stary, public._conq_nick(p_nowy) || ' zdobył Twoją stolicę i złupił ' || v || ' monet! Nową stolicę wybierzesz, gdy znów będziesz mieć 10 powiatów.', 'result', jsonb_build_object('podboj', jsonb_build_object('k', p_k)));
  return v;
end $$;
revoke all on function public._conq_lup(text, uuid, uuid) from public, anon, authenticated;

-- każde przejęcie (atak, pojedynek, walkower, oblężenie) sprawdza, czy padła stolica
create or replace function public._conq_przejmij(p_k text, p_kto uuid, p_score int)
returns void language plpgsql security definer set search_path = '' as $$
declare v_stary uuid;
begin
  select owner into v_stary from public.conq_powiaty where k = p_k;
  if v_stary is not null and v_stary <> p_kto then perform public._conq_lup(p_k, v_stary, p_kto); end if;
  insert into public.conq_powiaty(k, owner, score, since, price) values (p_k, p_kto, p_score, now(), null)
  on conflict (k) do update set owner = excluded.owner, score = excluded.score, since = now(), price = null;
end $$;
revoke all on function public._conq_przejmij(text, uuid, int) from public, anon, authenticated;

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
  v_dzien := public._conq_dochod_dzienny(p);
  update public.conq_portfel set monety = monety + v_dni * v_dzien, dochod_dzien = v_dzis where public_id = p;
  return v_dni * v_dzien;
end $$;
revoke all on function public._conq_dochod(uuid) from public, anon, authenticated;

create or replace function public.conq_stolica(p_device uuid, p_token text, p_k text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token); r record; v_ile int; v_koszt int := 0;
begin
  if v_me is null then raise exception 'Najpierw zapisz swój pseudonim w rankingu.'; end if;
  if not exists(select 1 from public.conq_powiaty x where x.k = p_k and x.owner = v_me) then raise exception 'To nie jest Twój powiat'; end if;
  select count(*) into v_ile from public.conq_powiaty x where x.owner = v_me;
  if v_ile < 10 then raise exception 'Stolicę wybierasz, gdy masz co najmniej 10 powiatów (masz %).', v_ile; end if;
  perform public._conq_dochod(v_me);
  select * into r from public.conq_portfel where public_id = v_me for update;
  if r.stolica = p_k then return jsonb_build_object('stolica', p_k, 'monety', r.monety); end if;
  if r.stolica is not null and exists(select 1 from public.conq_powiaty x where x.k = r.stolica and x.owner = v_me) then v_koszt := 50; end if;
  if coalesce(r.monety, 0) < v_koszt then raise exception 'Przeniesienie stolicy kosztuje 50 monet.'; end if;
  update public.conq_portfel set monety = monety - v_koszt, stolica = p_k, stolica_od = now() where public_id = v_me returning * into r;
  return jsonb_build_object('stolica', p_k, 'monety', r.monety, 'koszt', v_koszt);
end $$;
grant execute on function public.conq_stolica(uuid, text, text) to anon, authenticated;

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
    'cel', public._conq_cel(p_k, v_me), 'stolica', coalesce((select x.stolica = p_k from public.conq_portfel x where x.public_id = p.owner), false),
    'wlasny', v_moj, 'rywal', case when p.owner is null or p.owner = v_me then null else public._conq_nick(p.owner) end,
    'skarb', p_k = public._conq_skarb_k(public._tydzien()));
end $$;
grant execute on function public.conq_start(uuid, text, text, text, uuid) to anon, authenticated;

create or replace function public.conq_wynik(p_device uuid, p_token text, p_id uuid, p_score int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token); a record; p record; d record; v_s int := least(8, greatest(0, coalesce(p_score, 0))); v_wynik text;
  v_nowe boolean := false; v_out jsonb; t text := public._tydzien(); v_miejsce int; v_skarb jsonb; v_zad int; v_cel int; v_m0 int; v_lup int := 0;
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
    elsif p.score < 8 and v_s >= public._conq_cel(a.k, v_me) then
      v_m0 := coalesce((select monety from public.conq_portfel where public_id = v_me), 0);
      perform public._conq_przejmij(a.k, v_me, v_s); v_wynik := 'przejety';
      v_lup := coalesce((select monety from public.conq_portfel where public_id = v_me), 0) - v_m0;
      perform public._conq_wiad(v_me, p.owner, public._conq_nick(v_me) || ' przejął Twój powiat (' || v_s || ' : ' || p.score || '). Odbij go na mapie Podboju!', 'result', jsonb_build_object('podboj', jsonb_build_object('k', a.k)));
    else v_wynik := 'za_malo';
    end if;
    update public.conq_proby set done = true, score = v_s, wynik = v_wynik, nowe_woj = v_nowe and v_wynik in ('zdobyty','przejety') where id = p_id;
    v_out := jsonb_build_object('wynik', v_wynik, 'score', v_s, 'k', a.k, 'lup', v_lup);
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

create or replace function public.conq_tydzien()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t text := public._tydzien();
begin
  return jsonb_build_object('tydzien', t, 'skarb', public._conq_skarb_k(t),
    'zdobywcy', (select coalesce(jsonb_agg(jsonb_build_object('nick', public._conq_nick(s.public_id), 'miejsce', s.miejsce) order by s.miejsce), '[]'::jsonb) from public.conq_skarb s where s.tydzien = t),
    'wojewodowie', (select coalesce(jsonb_agg(jsonb_build_object('woj', w.woj, 'owner', w.owner, 'nick', public._conq_nick(w.owner)) order by w.woj), '[]'::jsonb) from public._conq_wojewodowie() w),
    'stolice', (select coalesce(jsonb_agg(jsonb_build_object('k', x.stolica, 'owner', x.public_id)), '[]'::jsonb) from public.conq_portfel x join public.conq_powiaty p on p.k = x.stolica and p.owner = x.public_id),
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
    'dochod_dzienny', public._conq_dochod_dzienny(v_me),
    'powiaty', (select count(*) from public.conq_powiaty where owner = v_me),
    'stolica', (select x.stolica from public.conq_portfel x join public.conq_powiaty p on p.k = x.stolica and p.owner = x.public_id where x.public_id = v_me),
    'koszt_stolicy', 50,
    'wojewoda', (select coalesce(jsonb_agg(w.woj order by w.woj), '[]'::jsonb) from public._conq_wojewodowie() w where w.owner = v_me),
    'zadania_monety', v_zad,
    'koszt_ataku', public._conq_koszt_ataku(),
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
