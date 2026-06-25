import json
import os


def save_round_data(round_number, j1_results, j2_results):
    """1節分の試合結果を JSON ファイルとして保存する"""
    # 保存用のディレクトリ（data/）がなければ作成
    os.makedirs("data", exist_ok=True)

    # 保存するデータ構造
    round_data = {
        "round": round_number,
        "j1_matches": j1_results,
        "j2_matches": j2_results,
    }

    # ファイル名（例: data/round_1.json）
    file_path = f"data/round_{round_number}.json"

    # JSON ファイルとして保存
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(round_data, f, ensure_ascii=False, indent=4)

    print(f"📁 [システム] 第 {round_number} 節のデータを保存しました -> {file_path}")

def initialize_all_fixtures(j1_fixtures_by_round, j2_fixtures_by_round):
    """
    【新機能】シーズン開幕前に、全節分の対戦カード（スコア・得点者は空欄）のJSONを先行生成する
    j1_fixtures_by_round: { 1: [("ホーム", "アウェイ"), ...], 2: ... }
    j2_fixtures_by_round: { 1: [("ホーム", "アウェイ"), ...], 2: ... }
    """
    os.makedirs("data", exist_ok=True)
    print("📅 [システム] 全38節分の空の日程表JSONを生成中...")
    
    # 2部が最大38節あるため、1〜38節までループ
    for r in range(1, 39):
        file_path = f"data/round_{r}.json"
        
        # 1部（34節まで）のその節の対戦カードを取得して空枠を作る
        j1_matches = []
        if r <= 34 and r in j1_fixtures_by_round:
            for home, away in j1_fixtures_by_round[r]:
                j1_matches.append({
                    "home": home,
                    "away": away,
                    "home_score": None,      # JavaScript側で未消化判定させるため None (null) にする
                    "away_score": None,
                    "home_scorers": [],
                    "away_scorers": []
                })
        
        # 2部（38節まで）のその節の対戦カードを取得して空枠を作る
        j2_matches = []
        if r in j2_fixtures_by_round:
            for home, away in j2_fixtures_by_round[r]:
                j2_matches.append({
                    "home": home,
                    "away": away,
                    "home_score": None,
                    "away_score": None,
                    "home_scorers": [],
                    "away_scorers": []
                })
        
        # データ構造を組み立てる
        round_data = {
            "round": r,
            "j1_matches": j1_matches,
            "j2_matches": j2_matches
        }
        
        # JSON ファイルとして先行保存
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(round_data, f, ensure_ascii=False, indent=4)
            
    print("✅ [システム] 全節分の空の日程表JSONの生成が完了しました！")