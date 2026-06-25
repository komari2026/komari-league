import csv

class Player:
    def __init__(self, team, pos, no, namea, nameb, off, phy, sta, l_def, men, tec, div):
        def to_int(val):
            try: return int(float(str(val).strip()))
            except: return 0

        self.team = str(team).strip()
        self.pos = str(pos).strip()
        self.no = int(to_int(no)) if to_int(no) != 0 else str(no).strip()
        self.name = f"{str(namea).strip()}{str(nameb).strip()}"
        
        # 6大ステータス
        self.off = to_int(off)
        self.phy = to_int(phy)
        self.sta = to_int(sta)
        self.l_def = to_int(l_def) # エクセル上のDEF
        self.men = to_int(men)
        self.tec = to_int(tec)
        
        self.fatigue = 0  
        self.is_injured = False 

        # 【追加】ディビジョン情報を文字列の "1" または "2" で保持
        self.division = str(div).strip() if div else "2"

    def get_stat(self, stat_name):
        """疲労度に応じて現在のステータスを減衰させる（6項目すべてに対応）"""
        # l_def を外部から 'def' で呼べるようにする
        attr = 'l_def' if stat_name == 'def' else stat_name
        base = getattr(self, attr)
        
        # 疲労による減衰率の計算
        rate = 1.0
        if self.fatigue >= 90:   rate = 0.75
        elif self.fatigue >= 80: rate = 0.80
        elif self.fatigue >= 70: rate = 0.85
        elif self.fatigue >= 60: rate = 0.90
        elif self.fatigue >= 50: rate = 0.95
        
        return base * rate

    def get_selection_score(self):
        """公式ルールに合わせたスタメン選出スコア"""
        if self.is_injured: return -9999
        
        # 疲労を反映した現在のステータスを取得
        o = self.get_stat('off')
        p = self.get_stat('phy')
        s = self.get_stat('sta')
        d = self.get_stat('def')
        m = self.get_stat('men')
        t = self.get_stat('tec')

        # ポジション別ベーススコア（6項目を活用）
        if self.pos == 'FW':
            base_score = (o * 1.2) + (t * 0.8) + (p * 0.5)
        elif self.pos in ['CB', 'GK']:
            base_score = (d * 1.2) + (p * 0.8) + (m * 0.5)
        elif self.pos in ['MF', 'OMF', 'CMF', 'DMF', 'SB']:
            base_score = (t * 1.0) + (s * 0.8) + (m * 0.5)
        else:
            base_score = (o + d + t) / 3

        # 疲労ペナルティ
        if self.fatigue > 40:
            return base_score - ((self.fatigue - 40) * 5)
            
        return base_score

def load_players(file_name):
    players = []
    try:
        with open(file_name, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # キーを小文字に統一
                c = {k.strip().lower(): v for k, v in row.items() if k is not None}
                
                player = Player(
                    c.get('team'), c.get('pos'), c.get('no', '0'),
                    c.get('namea', ''), c.get('nameb', ''),
                    c.get('off', 0), c.get('phy', 0), c.get('sta', 0),
                    c.get('def', 0), c.get('men', 0), c.get('tec', 0),
                    c.get('div', '2')  # 【追加】CSVのヘッダー名が'div'であればこれで取得可能
                )
                players.append(player)
    except Exception as e:
        print(f"読み込みエラー: {e}")
    return players