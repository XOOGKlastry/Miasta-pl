-- Podbój: bezpieczna stolica i tarcza zamiast murów.
--  * Bezpieczna stolica: gdy wszystkie powiaty graniczące ze stolicą są Twoje, stolica daje potrójny dochód
--    (zamiast podwójnego) i +1 darmowy atak każdego dnia.
--  * Tarcza (30 monet): Twój powiat przez 24 h nie może być atakowany ani wyzwany na pojedynek; najwyżej 2 tarcze naraz,
--    na ten sam powiat raz na 3 dni. Oblężenia tarcza nie zatrzymuje. Mury wyłączone.
alter table public.conq_powiaty add column if not exists tarcza_do timestamptz, add column if not exists tarcza_od timestamptz;

create or replace function public._conq_stolica_bezpieczna(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select not exists(select 1 from public.conq_sasiedzi s left join public.conq_powiaty q on q.k = s.nb
                                    where s.k = pf.stolica and s.nb <> s.k and q.owner is distinct from p)
                   from public.conq_portfel pf join public.conq_powiaty m on m.k = pf.stolica and m.owner = pf.public_id
                   where pf.public_id = p), false)
$$;
revoke all on function public._conq_stolica_bezpieczna(uuid) from public, anon, authenticated;

create or replace function public._conq_dochod_dzienny(p uuid) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce(sum((case when x.score >= 8 then 6 else 3 end)
      * (case when x.k = (select pf.stolica from public.conq_portfel pf where pf.public_id = p)
              then case when public._conq_stolica_bezpieczna(p) then 3 else 2 end else 1 end)
      * (case when w.woj is not null then 2 else 1 end)), 0)::int
  from public.conq_powiaty x left join (select ww.woj from public._conq_wojewodowie() ww where ww.owner = p) w on w.woj = left(x.k, 2)
  where x.owner = p
$$;
revoke all on function public._conq_dochod_dzienny(uuid) from public, anon, authenticated;

create or replace function public._conq_limit(p uuid) returns int language sql stable security definer set search_path = '' as $$
  select 10 + coalesce((select atak_dodatkowe from public.conq_portfel where public_id = p and atak_dzien = public._conq_dzien()), 0)
            + case when public._conq_stolica_bezpieczna(p) then 1 else 0 end
$$;
revoke all on function public._conq_limit(uuid) from public, anon, authenticated;

create or replace function public.conq_tarcza(p_device uuid, p_token text, p_k text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token); p record; v_m int;
begin
  if v_me is null then raise exception 'Najpierw zapisz swój pseudonim w rankingu.'; end if;
  select * into p from public.conq_powiaty x where x.k = p_k for update;
  if not found or p.owner <> v_me then raise exception 'To nie jest Twój powiat'; end if;
  if p.tarcza_do > now() then raise exception 'Ten powiat ma już tarczę.'; end if;
  if p.tarcza_od > now() - interval '3 days' then raise exception 'Na ten powiat tarczę postawisz znowu %.', to_char((p.tarcza_od + interval '3 days') at time zone 'Europe/Warsaw', 'DD.MM HH24:MI'); end if;
  if (select count(*) from public.conq_powiaty x where x.owner = v_me and x.tarcza_do > now()) >= 2 then raise exception 'Możesz mieć najwyżej 2 tarcze naraz.'; end if;
  if exists(select 1 from public.conq_pojedynki x where x.k = p_k and x.status in ('start','czeka')) then raise exception 'O ten powiat trwa pojedynek.'; end if;
  perform public._conq_dochod(v_me);
  if coalesce((select monety from public.conq_portfel where public_id = v_me), 0) < 30 then raise exception 'Tarcza kosztuje 30 monet.'; end if;
  v_m := public._conq_monety(v_me, -30);
  update public.conq_powiaty set tarcza_do = now() + interval '24 hours', tarcza_od = now() where k = p_k;
  return jsonb_build_object('monety', v_m, 'do', now() + interval '24 hours');
end $$;
grant execute on function public.conq_tarcza(uuid, text, text) to anon, authenticated;

create or replace function public.conq_mury(p_device uuid, p_token text, p_k text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin raise exception 'Mury zastąpiła tarcza: stuknij swój powiat i wybierz „Tarcza 24 h”.'; end $$;
grant execute on function public.conq_mury(uuid, text, text) to anon, authenticated;

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
  if p.owner is not null and p.owner <> v_me and p.tarcza_do > now() then
    raise exception 'Ten powiat chroni tarcza do %. Zaatakuj inny.', to_char(p.tarcza_do at time zone 'Europe/Warsaw', 'DD.MM HH24:MI'); end if;
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

create or replace function public.conq_tydzien()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t text := public._tydzien();
begin
  return jsonb_build_object('tydzien', t, 'skarb', public._conq_skarb_k(t),
    'zdobywcy', (select coalesce(jsonb_agg(jsonb_build_object('nick', public._conq_nick(s.public_id), 'miejsce', s.miejsce) order by s.miejsce), '[]'::jsonb) from public.conq_skarb s where s.tydzien = t),
    'wojewodowie', (select coalesce(jsonb_agg(jsonb_build_object('woj', w.woj, 'owner', w.owner, 'nick', public._conq_nick(w.owner)) order by w.woj), '[]'::jsonb) from public._conq_wojewodowie() w),
    'stolice', (select coalesce(jsonb_agg(jsonb_build_object('k', x.stolica, 'owner', x.public_id, 'bezpieczna', public._conq_stolica_bezpieczna(x.public_id))), '[]'::jsonb) from public.conq_portfel x join public.conq_powiaty p on p.k = x.stolica and p.owner = x.public_id),
    'tarcze', (select coalesce(jsonb_agg(jsonb_build_object('k', p.k, 'do', p.tarcza_do)), '[]'::jsonb) from public.conq_powiaty p where p.tarcza_do > now()),
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
    'stolica_bezpieczna', public._conq_stolica_bezpieczna(v_me),
    'koszt_tarczy', 30,
    'tarcze', (select count(*) from public.conq_powiaty p where p.owner = v_me and p.tarcza_do > now()),
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
