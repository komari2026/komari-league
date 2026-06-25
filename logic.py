import random

def calculate_xg(home_players, away_players):
    """
    公式ルールに基づいた得点期待値（xG）を算出（疲労デバフ反映版）
    """
    def get_debuffed_stat(player, stat_name):
        # 選手の本来のステータスを取得
        base_stat = player.get_stat(stat_name)
        # その選手の疲労度に応じたデバフ率を取得
        debuff, _ = check_injury_and_fatigue(player)
        # デバフ分を減算した値を返す（例: debuffが0.10なら能力は90%に）
        return base_stat * (1.0 - debuff)

    # チームステータス合計（デバフ適用後）
    h_off = sum(get_debuffed_stat(p, 'off') for p in home_players)
    h_phy = sum(get_debuffed_stat(p, 'phy') for p in home_players)
    h_sta = sum(get_debuffed_stat(p, 'sta') for p in home_players)
    h_def = sum(get_debuffed_stat(p, 'def') for p in home_players)
    h_men = sum(get_debuffed_stat(p, 'men') for p in home_players)
    h_tec = sum(get_debuffed_stat(p, 'tec') for p in home_players)

    a_off = sum(get_debuffed_stat(p, 'off') for p in away_players)
    a_phy = sum(get_debuffed_stat(p, 'phy') for p in away_players)
    a_sta = sum(get_debuffed_stat(p, 'sta') for p in away_players)
    a_def = sum(get_debuffed_stat(p, 'def') for p in away_players)
    a_men = sum(get_debuffed_stat(p, 'men') for p in away_players)
    a_tec = sum(get_debuffed_stat(p, 'tec') for p in away_players)

    # 公式計算式（ウェイト付けはそのままキープ）
    home_xg = (h_off * 1.2 + h_phy * 0.6 + h_sta * 0.3 + h_tec * 1.0) / \
              (a_def * 1.1 + a_men * 0.6 + a_phy * 0.4 + a_sta * 0.2)
    
    away_xg = (a_off * 1.2 + a_phy * 0.6 + a_sta * 0.3 + a_tec * 1.0) / \
              (h_def * 1.1 + h_men * 0.7 + h_phy * 0.4 + h_sta * 0.2)
              
    return home_xg, away_xg

def check_injury_and_fatigue(player):
    """
    疲労度に応じた能力ダウンと怪我判定
    """
    fatigue = player.fatigue
    debuff = 0
    injury_chance = 0
    
    if fatigue >= 90:   debuff, injury_chance = 0.25, 0.50
    elif fatigue >= 80: debuff, injury_chance = 0.20, 0.40
    elif fatigue >= 70: debuff, injury_chance = 0.15, 0.30
    elif fatigue >= 60: debuff, injury_chance = 0.10, 0.20
    elif fatigue >= 50: debuff, injury_chance = 0.05, 0.10
    
    return debuff, injury_chance