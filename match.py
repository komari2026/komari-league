import random
from logic import calculate_xg, check_injury_and_fatigue
# あなたが作成した selection.py から関数をインポート
from selection import select_starting_11, print_starters

def play_match(all_players, home_name, away_name):
    # 1. selection.py の確実なロジックで4-4-2のスタメンを選出
    home_lineup = select_starting_11(all_players, home_name)
    away_lineup = select_starting_11(all_players, away_name)
    
    # 2. selection.py の綺麗なフォーマットでスタメンを表示
    print_starters(home_name, home_lineup)
    print_starters(away_name, away_lineup)
    
    # 3. xG算出とスコア決定
    home_xg, away_xg = calculate_xg(home_lineup, away_lineup)
    home_score = max(0, round(home_xg + random.uniform(-0.5, 0.5)))
    away_score = max(0, round(away_xg + random.uniform(-0.5, 0.5)))

    # 4. 試合結果表示
    print(f"\n========================================")
    print(f"【KOMARI LEAGUE】 {home_name} {home_score} - {away_score} {away_name}")
    
    # 得点者選出（OFF値が高い選手が選ばれやすい重み付け）
    def get_scorer(lineup):
        weights = [max(1, p.get_stat('off')) for p in lineup]
        return random.choices(lineup, weights=weights, k=1)[0]

    home_scorers = []
    if home_score > 0:
        home_scorers = [get_scorer(home_lineup).name for _ in range(home_score)]
        print(f"得点者（{home_name}）：{', '.join(home_scorers)}")
        
    away_scorers = []
    if away_score > 0:
        away_scorers = [get_scorer(away_lineup).name for _ in range(away_score)]
        print(f"得点者（{away_name}）：{', '.join(away_scorers)}")
        
    print(f"========================================\n")

    # 5. 試合後の疲労と怪我処理（スタメン選手のみ）
    for p in home_lineup + away_lineup:
        p.fatigue += 10
        _, injury_chance = check_injury_and_fatigue(p)
        if random.random() < injury_chance:
            p.is_injured = True
            print(f"⚠️ 負傷発生: {p.name}（{p.team}）が怪我をしました！")

    # 6. 裏処理：非出場選手の疲労回復(10%分) ＆ 怪我人の確率復帰(20%の確率)
    for p in all_players:
        if p.team in [home_name, away_name] and p not in home_lineup and p not in away_lineup:
            # 怪我をしていない控え選手は疲労回復
            if not p.is_injured:
                p.fatigue = max(0, p.fatigue - 10)
            else:
                # 怪我人は20%の確率で復帰
                if random.random() < 0.20:
                    p.is_injured = False
                    p.fatigue = max(0, p.fatigue - 20) # 復帰時は疲労も少し抜ける
                    print(f" Medical: {p.name}（{p.team}）が怪我から復帰しました！")

    # === 【追加】ホームページ（JSON）用の試合結果データを返却 ===
    return {
        "home": home_name,
        "away": away_name,
        "home_score": home_score,
        "away_score": away_score,
        "home_scorers": home_scorers,
        "away_scorers": away_scorers
    }