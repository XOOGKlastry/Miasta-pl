-- Podbój: od 24.10.2026 każdy kolejny dokupiony atak tego dnia jest droższy (500, 600, 700, …),
-- a za monety Podboju można kupić podpowiedzi 50/50 do wszystkich gier (1, 5 albo 10 sztuk, najwyżej 30 dziennie).
insert into public.conq_ustawienia(klucz, wartosc, opis) values
  ('koszt_ataku_przyrost', 100, 'o ile drożeje każdy kolejny dokupiony atak tego dnia'),
  ('przyrost_od', 20261024, 'od którego dnia (RRRRMMDD) działa rosnąca cena ataku'),
  ('koszt_podpowiedzi', 1000, 'cena jednej podpowiedzi 50/50 (pakiet 5: -10%, pakiet 10: -20%)'),
  ('podpowiedzi_max_dzien', 30, 'najwięcej kupionych podpowiedzi dziennie')
on conflict (klucz) do nothing;

create table if not exists public.conq_zakupy(id bigserial primary key, public_id uuid not null, kiedy timestamptz not null default now(),
  co text not null, ile int not null, koszt int not null);
alter table public.conq_zakupy enable row level security;
create index if not exists conq_zakupy_gracz on public.conq_zakupy(public_id, kiedy desc);

-- cena następnego dokupionego ataku dla gracza
create or replace function public._conq_koszt_ataku_gracza(p uuid) returns int
language sql stable security definer set search_path = '' as $$
  select public._conq_ust('koszt_ataku')
    + case when to_char(public._conq_dzien(), 'YYYYMMDD')::int >= public._conq_ust('przyrost_od')
           then public._conq_ust('koszt_ataku_przyrost') * coalesce((select f.atak_kupione from public.conq_portfel f where f.public_id = p and f.atak_dzien = public._conq_dzien()), 0)
           else 0 end
$$;
revoke all on function public._conq_koszt_ataku_gracza(uuid) from public, anon, authenticated;

create or replace function public.conq_kup_atak(p_device uuid, p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token); r record; v_dzis date := public._conq_dzien(); v_koszt int; v_max int := public._conq_ust('ataki_max');
begin
  if v_me is null then raise exception 'Najpierw zapisz swój pseudonim w rankingu.'; end if;
  perform public._conq_dochod(v_me);
  if public._conq_limit(v_me) >= v_max then raise exception 'Masz już % ataków na dziś, więcej się nie da. Wróć jutro!', v_max; end if;
  select * into r from public.conq_portfel where public_id = v_me for update;
  v_koszt := public._conq_koszt_ataku_gracza(v_me);
  if coalesce(r.monety, 0) < v_koszt then raise exception 'Za mało monet: potrzeba %, masz %.', v_koszt, coalesce(r.monety, 0); end if;
  update public.conq_portfel set monety = monety - v_koszt,
    atak_dodatkowe = case when atak_dzien = v_dzis then atak_dodatkowe + 1 else 1 end,
    atak_kupione = case when atak_dzien = v_dzis then atak_kupione + 1 else 1 end,
    atak_dzien = v_dzis where public_id = v_me returning * into r;
  insert into public.conq_zakupy(public_id, co, ile, koszt) values (v_me, 'atak', 1, v_koszt);
  return jsonb_build_object('monety', r.monety, 'limit', public._conq_limit(v_me), 'koszt_ataku', public._conq_koszt_ataku_gracza(v_me), 'kupione', r.atak_kupione, 'zaplacono', v_koszt);
end $$;

-- stan konta dla nagłówka gry (lekko: wypłata dzienna, saldo i ceny w sklepiku)
create or replace function public.conq_saldo(p_device uuid, p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token);
begin
  if v_me is null then return null; end if;
  perform public._conq_dochod(v_me);
  return jsonb_build_object('monety', coalesce((select monety from public.conq_portfel where public_id = v_me), 0),
    'koszt_podpowiedzi', public._conq_ust('koszt_podpowiedzi'),
    'podpowiedzi_dzis', coalesce((select sum(ile) from public.conq_zakupy z where z.public_id = v_me and z.co = 'podpowiedz' and z.kiedy >= public._conq_dzis()), 0),
    'podpowiedzi_max', public._conq_ust('podpowiedzi_max_dzien'),
    'koszt_ataku', public._conq_koszt_ataku_gracza(v_me));
end $$;
revoke all on function public.conq_saldo(uuid, text) from public;
grant execute on function public.conq_saldo(uuid, text) to anon, authenticated;

-- zakup podpowiedzi 50/50: 1 sztuka pełna cena, pakiet 5 taniej o 10%, pakiet 10 o 20%
create or replace function public.conq_kup_podpowiedzi(p_device uuid, p_token text, p_ile int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token); v_cena int; v_dzis int; v_max int := public._conq_ust('podpowiedzi_max_dzien'); v_m int;
begin
  if v_me is null then raise exception 'Najpierw zapisz swój pseudonim w rankingu.'; end if;
  if p_ile not in (1, 5, 10) then raise exception 'Podpowiedzi kupisz po 1, 5 albo 10.'; end if;
  perform public._conq_dochod(v_me);
  perform 1 from public.conq_portfel where public_id = v_me for update;
  v_dzis := coalesce((select sum(ile) from public.conq_zakupy z where z.public_id = v_me and z.co = 'podpowiedz' and z.kiedy >= public._conq_dzis()), 0);
  if v_dzis + p_ile > v_max then raise exception 'Dziś możesz kupić jeszcze % podpowiedzi (najwyżej % dziennie).', greatest(0, v_max - v_dzis), v_max; end if;
  v_cena := round(public._conq_ust('koszt_podpowiedzi') * p_ile * case p_ile when 10 then 0.8 when 5 then 0.9 else 1 end);
  if coalesce((select monety from public.conq_portfel where public_id = v_me), 0) < v_cena then
    raise exception 'Za mało monet: potrzeba %, masz %.', v_cena, coalesce((select monety from public.conq_portfel where public_id = v_me), 0); end if;
  v_m := public._conq_monety(v_me, -v_cena);
  insert into public.conq_zakupy(public_id, co, ile, koszt) values (v_me, 'podpowiedz', p_ile, v_cena);
  return jsonb_build_object('ok', true, 'ile', p_ile, 'zaplacono', v_cena, 'monety', v_m, 'podpowiedzi_dzis', v_dzis + p_ile, 'podpowiedzi_max', v_max);
end $$;
revoke all on function public.conq_kup_podpowiedzi(uuid, text, int) from public;
grant execute on function public.conq_kup_podpowiedzi(uuid, text, int) to anon, authenticated;

-- w stanie gracza cena następnego ataku zależy od liczby dokupionych dziś
do $$ declare d text;
begin
  d := pg_get_functiondef('public.conq_ja(uuid,text)'::regprocedure);
  d := replace(d, '''koszt_ataku'', public._conq_koszt_ataku(),', '''koszt_ataku'', public._conq_koszt_ataku_gracza(v_me), ''koszt_ataku_przyrost'', public._conq_ust(''koszt_ataku_przyrost''), ''kupione'', coalesce((select f.atak_kupione from public.conq_portfel f where f.public_id = v_me and f.atak_dzien = public._conq_dzien()), 0),');
  execute d;
end $$;
