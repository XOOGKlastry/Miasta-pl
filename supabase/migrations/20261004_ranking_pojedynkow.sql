-- Zastosowane w projekcie dhzjqxhoiaroauimoepq 4.10.2026 (ranking pojedynków z Karty w ciemno).
alter table public.player_scores
  add column if not exists duel_points bigint not null default 0,
  add column if not exists duel_wins integer not null default 0;
-- publish_score(p_nickname, p_visible, p_points, p_cards, p_duel_points default null, p_duel_wins default null)
-- leaderboard(p_mode): 'points' | 'cards' | 'duels'
