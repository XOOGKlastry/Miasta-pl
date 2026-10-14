-- Zbieranie błędów z telefonów, zgłoszenia błędów w pytaniach i lekka analityka bez ciasteczek.
--  * app_bledy: błędy JavaScript zgrupowane po dniu i treści (bez identyfikatora gracza, przeglądarka tylko z nazwy).
--  * app_zgloszenia: „zgłoś błąd w pytaniu” (pytanie, poprawna odpowiedź, uwagi, kontekst); gracz tylko gdy dołączył do rankingu.
--  * app_ruch: same liczniki (dzień, zdarzenie, kohorta = dzień pierwszej wizyty); żadnych identyfikatorów urządzeń.
--  * Odczyt tylko z panelu admina kluczem (w bazie jest wyłącznie skrót sha256 klucza, tabela app_admin).
create table if not exists public.app_admin(hash text primary key, kiedy timestamptz not null default now());
alter table public.app_admin enable row level security;

create table if not exists public.app_bledy(
  id bigserial primary key, dzien date not null default (now() at time zone 'Europe/Warsaw')::date, skrot text not null,
  strona text, wiadomosc text, zrodlo text, stos text, wersja text, przegladarka text,
  ile int not null default 1, pierwszy timestamptz not null default now(), ostatni timestamptz not null default now(),
  unique (dzien, skrot));
alter table public.app_bledy enable row level security;

create table if not exists public.app_zgloszenia(
  id bigserial primary key, kiedy timestamptz not null default now(), gra text, typ text, pytanie text, poprawna text,
  powod text, uwagi text, kontekst jsonb, strona text, public_id uuid, status text not null default 'nowe');
alter table public.app_zgloszenia enable row level security;
create index if not exists app_zgloszenia_status on public.app_zgloszenia(status, kiedy desc);

create table if not exists public.app_ruch(
  dzien date not null, zdarzenie text not null, kohorta date not null default '1970-01-01', ile int not null default 0,
  primary key (dzien, zdarzenie, kohorta));
alter table public.app_ruch enable row level security;

create or replace function public._dzis_pl() returns date language sql stable set search_path = '' as $$
  select (now() at time zone 'Europe/Warsaw')::date
$$;

-- błąd z telefonu: najwyżej 2000 różnych błędów dziennie, teksty przycięte
create or replace function public.zglos_blad_js(p_strona text, p_wiadomosc text, p_zrodlo text, p_stos text, p_wersja text, p_przegladarka text)
returns void language plpgsql security definer set search_path = '' as $$
declare d date := public._dzis_pl(); s text;
begin
  if coalesce(p_wiadomosc, '') = '' then return; end if;
  s := md5(coalesce(left(p_strona, 80), '') || '|' || left(p_wiadomosc, 300) || '|' || coalesce(left(p_zrodlo, 200), ''));
  update public.app_bledy set ile = ile + 1, ostatni = now() where dzien = d and skrot = s;
  if found then return; end if;
  if (select count(*) from public.app_bledy where dzien = d) >= 2000 then return; end if;
  insert into public.app_bledy(dzien, skrot, strona, wiadomosc, zrodlo, stos, wersja, przegladarka)
  values (d, s, left(p_strona, 80), left(p_wiadomosc, 300), left(p_zrodlo, 200), left(p_stos, 1500), left(p_wersja, 40), left(p_przegladarka, 40))
  on conflict (dzien, skrot) do update set ile = public.app_bledy.ile + 1, ostatni = now();
end $$;
revoke all on function public.zglos_blad_js(text, text, text, text, text, text) from public;
grant execute on function public.zglos_blad_js(text, text, text, text, text, text) to anon, authenticated;

-- zgłoszenie błędu w pytaniu: gracz z rankingu najwyżej 30 dziennie, wszyscy razem najwyżej 500 dziennie
create or replace function public.zglos_pytanie(p_device uuid, p_token text, p_gra text, p_typ text, p_pytanie text, p_poprawna text,
  p_powod text, p_uwagi text, p_kontekst jsonb, p_strona text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token);
begin
  if (select count(*) from public.app_zgloszenia where kiedy > now() - interval '1 day') >= 500 then
    raise exception 'Dziś przyszło już bardzo dużo zgłoszeń. Spróbuj jutro.'; end if;
  if v_me is not null and (select count(*) from public.app_zgloszenia where public_id = v_me and kiedy > now() - interval '1 day') >= 30 then
    raise exception 'Dziś wysłałeś już dużo zgłoszeń. Dziękujemy!'; end if;
  if coalesce(p_powod, '') = '' and coalesce(p_uwagi, '') = '' then raise exception 'Napisz, co jest nie tak.'; end if;
  insert into public.app_zgloszenia(gra, typ, pytanie, poprawna, powod, uwagi, kontekst, strona, public_id)
  values (left(p_gra, 30), left(p_typ, 10), left(p_pytanie, 400), left(p_poprawna, 400), left(p_powod, 60), left(p_uwagi, 600),
    case when p_kontekst is null or length(p_kontekst::text) > 4000 then null else p_kontekst end, left(p_strona, 80), v_me);
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.zglos_pytanie(uuid, text, text, text, text, text, text, text, jsonb, text) from public;
grant execute on function public.zglos_pytanie(uuid, text, text, text, text, text, text, text, jsonb, text) to anon, authenticated;

-- liczniki ruchu: paczka zdarzeń [{z:'wizyta', k:'2026-10-14'}, {z:'start:wyzwanie'}], najwyżej 30 w jednym wywołaniu
create or replace function public.licz_ruch(p_zdarzenia jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare d date := public._dzis_pl(); e jsonb; z text; k date;
begin
  if jsonb_typeof(p_zdarzenia) <> 'array' then return; end if;
  for e in select x from jsonb_array_elements(p_zdarzenia) with ordinality t(x, i) where i <= 30 loop
    z := e->>'z';
    if z is null or z !~ '^[a-z0-9:_.-]{1,48}$' then continue; end if;
    k := case when (e->>'k') ~ '^\d{4}-\d{2}-\d{2}$' then (e->>'k')::date else null end;
    if k is null or k > d or k < date '2026-01-01' then k := date '1970-01-01'; end if;
    insert into public.app_ruch(dzien, zdarzenie, kohorta, ile) values (d, z, k, 1)
    on conflict (dzien, zdarzenie, kohorta) do update set ile = public.app_ruch.ile + 1;
  end loop;
end $$;
revoke all on function public.licz_ruch(jsonb) from public;
grant execute on function public.licz_ruch(jsonb) to anon, authenticated;

-- panel admina
create or replace function public._admin_ok(p_klucz text) returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(char_length(p_klucz) >= 20 and exists(select 1 from public.app_admin a where a.hash = encode(extensions.digest(p_klucz, 'sha256'), 'hex')), false)
$$;
revoke all on function public._admin_ok(text) from public, anon, authenticated;

create or replace function public.admin_zmien_klucz(p_klucz text, p_nowy text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not public._admin_ok(p_klucz) then raise exception 'Zły klucz admina'; end if;
  if char_length(coalesce(p_nowy, '')) < 20 then raise exception 'Nowy klucz musi mieć co najmniej 20 znaków'; end if;
  update public.app_admin set hash = encode(extensions.digest(p_nowy, 'sha256'), 'hex'), kiedy = now()
   where hash = encode(extensions.digest(p_klucz, 'sha256'), 'hex');
  return true;
end $$;
revoke all on function public.admin_zmien_klucz(text, text) from public;
grant execute on function public.admin_zmien_klucz(text, text) to anon, authenticated;

create or replace function public.admin_raport(p_klucz text, p_dni int default 30) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare d0 date := public._dzis_pl() - least(greatest(coalesce(p_dni, 30), 1), 120);
begin
  if not public._admin_ok(p_klucz) then raise exception 'Zły klucz admina'; end if;
  return jsonb_build_object(
    'dzis', public._dzis_pl(),
    'bledy', (select coalesce(jsonb_agg(to_jsonb(b) - 'skrot' order by b.ostatni desc), '[]'::jsonb) from (
       select max(id) id, max(dzien) dzien, strona, wiadomosc, zrodlo, max(stos) stos, max(wersja) wersja, string_agg(distinct przegladarka, ', ') przegladarka,
              sum(ile)::int ile, min(pierwszy) pierwszy, max(ostatni) ostatni, '' skrot
       from public.app_bledy where dzien >= d0 group by strona, wiadomosc, zrodlo order by max(ostatni) desc limit 200) b),
    'zgloszenia', (select coalesce(jsonb_agg(jsonb_build_object('id', z.id, 'kiedy', z.kiedy, 'gra', z.gra, 'typ', z.typ, 'pytanie', z.pytanie, 'poprawna', z.poprawna,
         'powod', z.powod, 'uwagi', z.uwagi, 'kontekst', z.kontekst, 'strona', z.strona, 'status', z.status,
         'nick', case when z.public_id is null then null else public._conq_nick(z.public_id) end) order by z.kiedy desc), '[]'::jsonb)
       from (select * from public.app_zgloszenia where status = 'nowe' or kiedy > now() - interval '14 days' order by kiedy desc limit 300) z),
    'ruch', (select coalesce(jsonb_agg(jsonb_build_object('d', r.dzien, 'z', r.zdarzenie, 'k', case when r.kohorta = date '1970-01-01' then null else r.kohorta end, 'n', r.ile)), '[]'::jsonb)
       from public.app_ruch r where r.dzien >= d0));
end $$;
revoke all on function public.admin_raport(text, int) from public;
grant execute on function public.admin_raport(text, int) to anon, authenticated;

create or replace function public.admin_zgloszenie(p_klucz text, p_id bigint, p_status text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not public._admin_ok(p_klucz) then raise exception 'Zły klucz admina'; end if;
  if p_status not in ('nowe', 'poprawione', 'odrzucone') then raise exception 'Nieznany status'; end if;
  update public.app_zgloszenia set status = p_status where id = p_id;
  return found;
end $$;
revoke all on function public.admin_zgloszenie(text, bigint, text) from public;
grant execute on function public.admin_zgloszenie(text, bigint, text) to anon, authenticated;
