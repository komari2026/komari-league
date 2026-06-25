import os
import sys

# --- ログ自動保存用の設定 ---
class Logger(object):
    def __init__(self):
        self.terminal = sys.stdout
        self.log = open("league_history.txt", "a", encoding="utf-8")

    def write(self, message):
        self.terminal.write(message)
        self.log.write(message)

    def flush(self):
        pass

sys.stdout = Logger()

# 各モジュールからインポート
from player import load_players
from match import play_match
from scheduler import generate_schedule
# 💡【修正】新しく追加した事前生成関数も一緒にインポートする
from data_manager import save_round_data, initialize_all_fixtures

if __name__ == "__main__":
    # 1. 全選手データを読み込む
    all_players = load_players('players.csv')
    
    if all_players:
        # 2. 所属選手データからチームリストを自動生成
        j1_teams = sorted(list(set(p.team for p in all_players if p.team and p.division == "1")))
        j2_teams = sorted(list(set(p.team for p in all_players if p.team and p.division == "2")))
        
        print("💡 === KOMARI LEAGUE チーム仕分け完了 ===")
        print(f"【1部】 {len(j1_teams)} チーム: {', '.join(j1_teams[:3])}...")
        print(f"【2部】 {len(j2_teams)} チーム: {', '.join(j2_teams[:3])}...")
        
        # 3. スケジュール生成
        # ※scheduler.pyのgenerate_scheduleをH&A対応版に書き換えているため、自動的に34節/38節分作られます
        j1_schedule = generate_schedule(j1_teams, "1部リーグ")
        j2_schedule = generate_schedule(j2_teams, "2部リーグ")
        
        total_rounds = max(len(j1_schedule), len(j2_schedule))
        
        # =====================================================================
        # 🌟【ここを追加！】試合のシミュレーションを始める前に、空の日程表JSONを全生成
        # =====================================================================
        initialize_all_fixtures(j1_schedule, j2_schedule)
        # =====================================================================
        
        print(f"\n🏆 === KOMARI LEAGUE (1部・2部同時進行) 全 {total_rounds} 節 開始 ===")
        
        # 各節を順番に実行
        for r in range(1, total_rounds + 1):
            print(f"\n=========================================")
            print(f" 🏁   第 {r} 節 開幕 ")
            print(f"=========================================")
            
            # この節の試合結果を溜めるリスト
            j1_round_results = []
            j2_round_results = []
            
            # --- 1部リーグの試合消化 ---
            if r in j1_schedule:
                print(f"\n--- 🟥 【1部リーグ】第 {r} 節 ---")
                for home, away in j1_schedule[r]:
                    if home == "BYE" or away == "BYE":
                        continue
                    print(f"📢 [1部] {home} vs {away}")
                    # 試合結果をデータとして受け取る
                    match_data = play_match(all_players, home, away)
                    j1_round_results.append(match_data)
                    
            # --- 2部リーグの試合消化 ---
            if r in j2_schedule:
                print(f"\n--- 🟦 【2部リーグ】第 {r} 節 ---")
                for home, away in j2_schedule[r]:
                    if home == "BYE" or away == "BYE":
                        continue
                    print(f"📢 [2部] {home} vs {away}")
                    # 試合結果をデータとして受け取る
                    match_data = play_match(all_players, home, away)
                    j2_round_results.append(match_data)
            
            # --- この節の全データを JSON に自動保存（ここで既存の空枠が結果付きに上書きされます） ---
            save_round_data(r, j1_round_results, j2_round_results)
                
            input(f"\n▶️ 第 {r} 節 終了。Enterキーを押すと次の節に進みます...")
            
        print("\n💡 === KOMARI LEAGUE 全日程終了 ===")