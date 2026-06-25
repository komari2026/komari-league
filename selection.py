def select_starting_11(all_players, team_name):
    """4-4-2のポジション枠で11人を選ぶ"""
    team_members = [p for p in all_players if p.team == team_name and not p.is_injured]
    starters = []
    
    # 1. GK (1人)
    gks = [p for p in team_members if p.pos == 'GK']
    gks.sort(key=lambda p: p.get_selection_score(), reverse=True)
    if gks:
        starters.append(gks[0])
        team_members.remove(gks[0])

    # 2. DF (4人)
    dfs = [p for p in team_members if p.pos in ['DF', 'CB', 'SB']]
    dfs.sort(key=lambda p: p.get_selection_score(), reverse=True)
    for i in range(min(4, len(dfs))):
        starters.append(dfs[i])
        team_members.remove(dfs[i])

    # 3. MF (4人)
    mfs = [p for p in team_members if p.pos in ['MF', 'OMF', 'CMF', 'DMF']]
    mfs.sort(key=lambda p: p.get_selection_score(), reverse=True)
    for i in range(min(4, len(mfs))):
        starters.append(mfs[i])
        team_members.remove(mfs[i])

    # 4. FW (2人)
    fws = [p for p in team_members if p.pos == 'FW']
    fws.sort(key=lambda p: p.get_selection_score(), reverse=True)
    for i in range(min(2, len(fws))):
        starters.append(fws[i])
        team_members.remove(fws[i])

    # 穴埋め
    if len(starters) < 11:
        team_members.sort(key=lambda p: p.get_selection_score(), reverse=True)
        needed = 11 - len(starters)
        starters.extend(team_members[:needed])

    return starters

def print_starters(team_name, starters):
    """スタメンを綺麗に画面に表示する"""
    print(f"\n🏃 【{team_name} スタメン11人 (4-4-2)】")
    print("-" * 50)
    print(f"{'No.':<5}{'ポジション':<8}{'名前':<15}{'攻撃':<5}{'守備':<5}{'テク':<5}(疲労)")
    print("-" * 50)
    for p in starters:
        off = int(p.get_stat('off'))
        l_def = int(p.get_stat('l_def'))
        tec = int(p.get_stat('tec'))
        print(f"[{p.no:<2}]  {p.pos:<8}  {p.name:<15}  {off:<6}{l_def:<6}{tec:<6}({p.fatigue}%)")
    print("-" * 50)