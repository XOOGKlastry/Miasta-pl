-- Weekend słabszy: 13 monet za powiat na godzinę (przy ok. 50 powiatach ok. 1000/h, czyli 2 ataki po 500).
-- Zamiast limitu 10 dokupionych ataków: razem najwyżej 50 ataków dziennie (ataki_max).
update public.conq_ustawienia set wartosc = 13, opis = 'monety co godzinę za powiat w weekend (przy ok. 50 powiatach ok. 1000 na godzinę = 2 ataki)' where klucz = 'godzinowe_weekend';
insert into public.conq_ustawienia(klucz, wartosc, opis) values ('ataki_max', 50, 'najwięcej ataków dziennie razem z dokupionymi') on conflict (klucz) do update set wartosc = excluded.wartosc, opis = excluded.opis;
update public.conq_ustawienia set wartosc = 999, opis = 'nieużywane: limit to ataki_max' where klucz = 'kupione_max';

create or replace function public._conq_limit(p uuid) returns int
language sql stable security definer set search_path = '' as $$
  select least(public._conq_ust('ataki_max'),
    public._conq_ust('szanse') + coalesce((select atak_dodatkowe from public.conq_portfel where public_id = p and atak_dzien = public._conq_dzien()), 0)
    + case when public._conq_stolica_bezpieczna(p) then 1 else 0 end
    + public._conq_ust('stolica_woj_szanse') * (select count(*)::int from public.conq_powiaty x where x.owner = p and x.k = any(public._conq_stolice_woj())))
$$;
revoke all on function public._conq_limit(uuid) from public, anon, authenticated;

create or replace function public.conq_kup_atak(p_device uuid, p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public._ja(p_device, p_token); r record; v_dzis date := public._conq_dzien(); v_koszt int := public._conq_koszt_ataku(); v_max int := public._conq_ust('ataki_max');
begin
  if v_me is null then raise exception 'Najpierw zapisz swój pseudonim w rankingu.'; end if;
  perform public._conq_dochod(v_me);
  if public._conq_limit(v_me) >= v_max then raise exception 'Masz już % ataków na dziś, więcej się nie da. Wróć jutro!', v_max; end if;
  select * into r from public.conq_portfel where public_id = v_me for update;
  if coalesce(r.monety, 0) < v_koszt then raise exception 'Za mało monet: potrzeba %, masz %.', v_koszt, coalesce(r.monety, 0); end if;
  update public.conq_portfel set monety = monety - v_koszt,
    atak_dodatkowe = case when atak_dzien = v_dzis then atak_dodatkowe + 1 else 1 end,
    atak_kupione = case when atak_dzien = v_dzis then atak_kupione + 1 else 1 end,
    atak_dzien = v_dzis where public_id = v_me returning * into r;
  return jsonb_build_object('monety', r.monety, 'limit', public._conq_limit(v_me), 'koszt_ataku', v_koszt, 'kupione', r.atak_kupione);
end $$;
