-- Skarby tygodnia tylko w wolnych powiatach. Wybór zapada przy pierwszym zapytaniu w tygodniu i zostaje zapisany
-- w conq_skarby_wybor, więc nie przeskakuje, gdy ktoś zajmie powiat. Bez wyboru ręcznego: 4 wolne stolice
-- województw (gdy wolnych jest mniej, uzupełniają je wolne powiaty ziemskie) i 1 wolny powiat ziemski.
create or replace function public._conq_skarby(t text) returns text[]
language plpgsql volatile security definer set search_path = '' as $$
declare v text[];
begin
  select array_agg(w.k order by w.k) into v from public.conq_skarby_wybor w where w.tydzien = t;
  if v is not null then return v; end if;
  perform pg_advisory_xact_lock(hashtext('conq_skarby_wybor' || t));
  select array_agg(w.k order by w.k) into v from public.conq_skarby_wybor w where w.tydzien = t;
  if v is not null then return v; end if;
  with wolne as (
    select distinct s.k from public.conq_sasiedzi s
    where not exists(select 1 from public.conq_powiaty p where p.k = s.k and p.owner is not null)),
  stolice as (
    select k from wolne where k = any(public._conq_stolice_woj()) order by md5(t || ':stolica:' || k) limit 4),
  ziemskie as (
    select k from wolne where substr(k, 3, 2)::int < 60 and k <> all(public._conq_stolice_woj())
    order by md5(t || ':skarb:' || k) limit 5 - (select count(*) from stolice))
  insert into public.conq_skarby_wybor(tydzien, k)
  select t, k from stolice union all select t, k from ziemskie
  on conflict do nothing;
  select array_agg(w.k order by w.k) into v from public.conq_skarby_wybor w where w.tydzien = t;
  return coalesce(v, '{}');
end $$;
revoke all on function public._conq_skarby(text) from public, anon, authenticated;

create or replace function public._conq_skarb_k(t text) returns text
language plpgsql volatile security definer set search_path = '' as $$
begin
  return (public._conq_skarby(t))[1];
end $$;
revoke all on function public._conq_skarb_k(text) from public, anon, authenticated;
