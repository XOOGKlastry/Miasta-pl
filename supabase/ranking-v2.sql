-- Ranking rekreacyjny. Wyniki klienta nie są dowodem wygranej.
create table if not exists public.player_scores (
 user_id uuid primary key references auth.users(id) on delete cascade,
 nickname text not null check(char_length(nickname) between 3 and 24),
 visible boolean not null default false,
 points bigint not null default 0 check(points between 0 and 1000000000),
 cards integer not null default 0 check(cards between 0 and 3000),
 updated_at timestamptz not null default now()
);
alter table public.player_scores enable row level security;
create policy "Read visible scores or own score" on public.player_scores for select to anon,authenticated using(visible or (select auth.uid())=user_id);
create policy "Insert own score" on public.player_scores for insert to authenticated with check((select auth.uid())=user_id);
create policy "Update own score" on public.player_scores for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
revoke all on public.player_scores from anon,authenticated;
grant select(nickname,visible,points,cards,updated_at) on public.player_scores to anon;
grant select,insert,update on public.player_scores to authenticated;
create or replace function public.publish_score(p_nickname text,p_visible boolean,p_points bigint,p_cards integer)
returns void language plpgsql security invoker set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 insert into public.player_scores(user_id,nickname,visible,points,cards) values(auth.uid(),trim(p_nickname),p_visible,p_points,p_cards)
 on conflict(user_id) do update set nickname=excluded.nickname,visible=excluded.visible,points=excluded.points,cards=excluded.cards,updated_at=now();
end;$$;
revoke all on function public.publish_score(text,boolean,bigint,integer) from public,anon;
grant execute on function public.publish_score(text,boolean,bigint,integer) to authenticated;
create or replace function public.leaderboard(p_mode text)
returns table(place bigint,nickname text,value bigint)
language sql stable security invoker set search_path = '' as $$
 select rank() over(order by case when p_mode='cards' then s.cards else s.points end desc),s.nickname,
 case when p_mode='cards' then s.cards else s.points end
 from public.player_scores s where s.visible order by 3 desc,s.nickname limit 100;
$$;
revoke all on function public.leaderboard(text) from public;
grant execute on function public.leaderboard(text) to anon,authenticated;
