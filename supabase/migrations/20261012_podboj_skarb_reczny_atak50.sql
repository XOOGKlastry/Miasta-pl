-- Podbój: skarb tygodnia można ustawić ręcznie (tabela conq_skarb_wybor, np. W42 = powiat jaworski),
-- dodatkowy atak kosztuje stałe 50 monet.
create table if not exists public.conq_skarb_wybor(tydzien text primary key, k text not null);
alter table public.conq_skarb_wybor enable row level security;
insert into public.conq_skarb_wybor(tydzien, k) values ('2026-W42', '0205')
  on conflict (tydzien) do update set k = excluded.k;

create or replace function public._conq_skarb_k(t text) returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select w.k from public.conq_skarb_wybor w where w.tydzien = t),
    (select k from (select distinct k from public.conq_sasiedzi) s where substr(k, 3, 2)::int < 60 order by md5(t || ':skarb:' || k) limit 1))
$$;
revoke all on function public._conq_skarb_k(text) from public, anon, authenticated;

create or replace function public._conq_koszt_ataku() returns int language sql immutable set search_path = '' as $$ select 50 $$;
revoke all on function public._conq_koszt_ataku() from public, anon, authenticated;

create or replace function public.conq_kup_atak(p_device uuid, p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token); r record; v_dzis date := public._conq_dzien(); v_koszt int := public._conq_koszt_ataku();
begin
  if v_me is null then raise exception 'Najpierw zapisz swój pseudonim w rankingu.'; end if;
  perform public._conq_dochod(v_me);
  select * into r from public.conq_portfel where public_id = v_me for update;
  if coalesce(r.monety, 0) < v_koszt then raise exception 'Za mało monet: potrzeba %, masz %.', v_koszt, coalesce(r.monety, 0); end if;
  update public.conq_portfel set monety = monety - v_koszt,
    atak_dodatkowe = case when atak_dzien = v_dzis then atak_dodatkowe + 1 else 1 end,
    atak_kupione = case when atak_dzien = v_dzis then atak_kupione + 1 else 1 end,
    atak_dzien = v_dzis where public_id = v_me returning * into r;
  return jsonb_build_object('monety', r.monety, 'limit', public._conq_limit(v_me), 'koszt_ataku', v_koszt);
end $$;
grant execute on function public.conq_kup_atak(uuid, text) to anon, authenticated;

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
