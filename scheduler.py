import random

def generate_schedule(teams, division_name="J"):
    """
    指定されたチームリストから、ホーム＆アウェイ形式（2回戦総当たり）のスケジュールを自動生成する
    teams: チーム名のリスト (1部なら18チーム、2部なら20チーム)
    戻り値: { 節番号: [(home, away), (home, away), ...] }
    """
    # 念のため偶数チェック（奇数ならBYEを足す安全弁）
    list_teams = list(teams)
    if len(list_teams) % 2 != 0:
        list_teams.append("BYE")

    num_teams = len(list_teams)
    num_days_per_round = num_teams - 1  # 1周分の節数（18チームなら17節、20チームなら19節）
    half_size = num_teams // 2

    # 毎回違う対戦順にするためにシャッフル
    random.shuffle(list_teams)

    first_round_schedule = {}

    # === 1編目：1回戦総当たりの生成（ラウンドロビン方式） ===
    for day in range(num_days_per_round):
        fixtures = []
        for i in range(half_size):
            home = list_teams[i]
            away = list_teams[num_teams - 1 - i]
            
            # ダミー枠「BYE」との対戦はスケジュールに含めない
            if home == "BYE" or away == "BYE":
                continue

            # ホーム・アウェイの偏りを減らすため、節ごとに交互に入れ替える
            if day % 2 == 0:
                fixtures.append((home, away))
            else:
                fixtures.append((away, home))
        
        first_round_schedule[day + 1] = fixtures

        # 一番端の要素を固定し、残りの要素を時計回りにずらす
        list_teams = [list_teams[0]] + [list_teams[-1]] + list_teams[1:-1]

    # === 2編目：ホーム＆アウェイ（2周目）の自動作成と結合 ===
    final_schedule = {}
    
    # 1周目をそのままコピー
    for round_num, matches in first_round_schedule.items():
        final_schedule[round_num] = matches

    # 2周目は、1周目のホームとアウェイを完全に入れ替えて後半戦にする
    for round_num, matches in first_round_schedule.items():
        second_round_num = round_num + num_days_per_round  # 18チームなら +17節、20チームなら +19節
        reversed_matches = [(away, home) for home, away in matches]
        final_schedule[second_round_num] = reversed_matches

    actual_total_rounds = len(final_schedule)
    print(f"🗓️  [スケジュール生成] {division_name}: {len(teams)}チームのH&A日程を作成しました (全 {actual_total_rounds} 節)")
    
    return final_schedule