/**
 * 選手名鑑（独立タブ）管理モジュール
 */
document.addEventListener('DOMContentLoaded', () => {
    const navPlayers = document.getElementById('nav-players');
    const directorySelector = document.getElementById('directory-team-selector');

    if (!navPlayers || !directorySelector) return;

    // 1. メインナビゲーションに「選手名鑑」タブのクリックイベントを追加
    navPlayers.addEventListener('click', () => {
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('d-none'));
        document.getElementById('content-players').classList.remove('d-none');

        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        navPlayers.classList.add('active');

        // タブを開いた瞬間にリストを初期化
        initDirectoryTeamSelector(window.currentDivision || '1');
    });

    // 2. クラブ選択プルダウンが変わった時に選手一覧を更新
    directorySelector.addEventListener('change', (e) => {
        const selectedTeam = e.target.value;
        if (selectedTeam) {
            renderPlayerDirectory(selectedTeam);
        }
    });
});

/**
 * 選択されているディビジョンに応じて選手名鑑のクラブ一覧プルダウンを更新する
 */
function initDirectoryTeamSelector(division) {
    const directorySelector = document.getElementById('directory-team-selector');
    if (!directorySelector || !window.teamsData) return;

    directorySelector.innerHTML = '';
    const targetDivStr = String(division);
    const divMap = window.autoDivisionMap || {};

    const divTeams = Object.keys(window.teamsData).filter(name => {
        return String(divMap[name]) === targetDivStr;
    });

    if (divTeams.length === 0) {
        // 万が一データがなければ1秒待つが、ログ連打を防ぐため1回きりにする
        return;
    }

    divTeams.sort();

    divTeams.forEach(teamName => {
        const option = document.createElement('option');
        option.value = teamName;
        option.textContent = teamName;
        directorySelector.appendChild(option);
    });

    // 最初のチームを自動選択して選手一覧を描画
    if (divTeams[0]) {
        directorySelector.value = divTeams[0];
        renderPlayerDirectory(divTeams[0]);
    }
}

/*
 * 指定されたチームの選手一覧をテーブルに描画する（デザイン洗練版）
 */
function renderPlayerDirectory(teamName) {
    const tbody = document.getElementById('directory-players-body');
    if (!tbody) return;

    const sourceData = window.allPlayersData || (typeof allPlayersData !== 'undefined' ? allPlayersData : null);

    if (!sourceData || sourceData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="sub-text" style="text-align: center; padding: 20px;">選手データを読み込み中です。一度クラブを切り替えてみてください。</td></tr>`;
        return;
    }

    tbody.innerHTML = '';

    const teamPlayers = sourceData.filter(p => p.team === teamName);

    if (teamPlayers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="sub-text" style="text-align: center; padding: 20px;">【${teamName}】の選手データが見つかりません。</td></tr>`;
        return;
    }

    // ポジション順（GK -> DF -> MF -> FW）にソート
    const posOrder = { 'GK': 1, 'DF': 2, 'MF': 3, 'FW': 4 };
    teamPlayers.sort((a, b) => {
        const orderA = posOrder[a.pos] || 99;
        const orderB = posOrder[b.pos] || 99;
        if (orderA !== orderB) return orderA - orderB;
        return a.no - b.no;
    });

    teamPlayers.forEach(p => {
        const tr = document.createElement('tr');
        
        // スタイルの初期化とホバー演出
        tr.style.transition = "background-color 0.15s ease";
        tr.style.borderBottom = "1px solid #1a202c";
        tr.addEventListener('mouseenter', () => tr.style.backgroundColor = '#1a202c');
        tr.addEventListener('mouseleave', () => tr.style.backgroundColor = 'transparent');
        
        // ポジションごとのバッジ演出（背景うっすら、文字くっきり）
        let posStyles = "";
        if (p.pos === 'FW') posStyles = "background: rgba(255, 71, 87, 0.15); color: #ff4757; padding: 3px 8px; border-radius: 4px;";
        else if (p.pos === 'MF') posStyles = "background: rgba(46, 213, 115, 0.15); color: #2ed573; padding: 3px 8px; border-radius: 4px;";
        else if (p.pos === 'DF') posStyles = "background: rgba(30, 144, 255, 0.15); color: #1e90ff; padding: 3px 8px; border-radius: 4px;";
        else if (p.pos === 'GK') posStyles = "background: rgba(255, 165, 2, 0.15); color: #ffa502; padding: 3px 8px; border-radius: 4px;";

        // 総合値による文字色の出し分け
        const sumVal = p.stats.sum;
        let sumColor = '#cbd5e0';
        if (sumVal >= 2000) sumColor = '#e74c3c';
        else if (sumVal >= 1500) sumColor = '#e67e22';
        else if (sumVal >= 1000) sumColor = '#f1c40f';

        const kanjiName = p.namea.trim();
        // 💡 もしひらがな（nameb）が空っぽなら、透明な文字（&nbsp;）を入れて高さを強制キープ
        const kanaName  = p.nameb && p.nameb.trim() ? p.nameb.trim() : '&nbsp;';

        // 各数値セルにfont-familyの等幅指定（font-variant-numeric）を追加して美しく整列
        tr.innerHTML = `
            <td class="th-no" style="font-family: monospace; color: #e2e8f0; vertical-align: middle;">${p.no}</td>
            <td class="th-pos" style="vertical-align: middle; text-align: center;"><span style="${posStyles} font-size: 0.85rem; font-weight: bold;">${p.pos}</span></td>
            <td class="th-pname" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; vertical-align: middle; padding: 8px 10px; text-align: left;">
                <div style="font-size: 1rem; font-weight: bold; color: #fff; line-height: 1.2;">${kanjiName}</div>
                <div style="font-size: 0.75rem; color: #718096; line-height: 1.2; margin-top: 3px; font-weight: normal;">${kanaName}</div>
            </td>
            <td class="th-stat" style="font-family: monospace; font-size: 0.95rem; text-align: right; vertical-align: middle;">${p.stats.off}</td>
            <td class="th-stat" style="font-family: monospace; font-size: 0.95rem; text-align: right; vertical-align: middle;">${p.stats.def}</td>
            <td class="th-stat" style="font-family: monospace; font-size: 0.95rem; text-align: right; vertical-align: middle;">${p.stats.tec}</td>
            <td class="th-stat" style="font-family: monospace; font-size: 0.95rem; text-align: right; vertical-align: middle;">${p.stats.phy}</td>
            <td class="th-stat" style="font-family: monospace; font-size: 0.95rem; text-align: right; vertical-align: middle;">${p.stats.sta}</td>
            <td class="th-stat" style="font-family: monospace; font-size: 0.95rem; text-align: right; vertical-align: middle;">${p.stats.men}</td>
            <td class="th-stat-sum" style="font-family: monospace; text-align: right; vertical-align: middle; color: ${sumColor} !important; font-size: 1.15rem;"><strong>${sumVal}</strong></td>
        `;
        tbody.appendChild(tr);
    });
}
// ディビジョン切り替え時の画面キープ
if (window.switchDivision) {
    const originalSwitchDivisionForDirectory = window.switchDivision;
    window.switchDivision = function(div) {
        const matchesSection = document.getElementById('content-matches');
        const rankingSection = document.getElementById('content-ranking');
        const chartSection = document.getElementById('content-charts');
        const playerSection = document.getElementById('content-players');

        if (typeof originalSwitchDivisionForDirectory === 'function') {
            originalSwitchDivisionForDirectory(div);
        }

        if (playerSection && !playerSection.classList.contains('d-none')) {
            if (matchesSection) matchesSection.classList.add('d-none');
            if (rankingSection) rankingSection.classList.add('d-none');
            if (chartSection) chartSection.classList.add('d-none');
            playerSection.classList.remove('d-none');
            
            initDirectoryTeamSelector(div);

            const directorySelector = document.getElementById('directory-team-selector');
            if (directorySelector && directorySelector.value) {
                renderPlayerDirectory(directorySelector.value);
            }
        } 
        else if (chartSection && !chartSection.classList.contains('d-none')) {
            if (matchesSection) matchesSection.classList.add('d-none');
            if (rankingSection) rankingSection.classList.add('d-none');
            if (playerSection) playerSection.add('d-none');
            chartSection.classList.remove('d-none');
            
            if (typeof initTeamSelector === 'function') {
                initTeamSelector(div);
            }
        }
    };
}