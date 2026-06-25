// ==========================================================================
// 1. 状態管理 (Global State) & 初期化
// ==========================================================================
window.currentRound = 1;       // 現在表示している節（試合結果用）
window.currentDivision = '1';   // 現在表示しているリーグ（'1' または '2'）
let activeTab = 'matches';   // 現在のメインタブ（'matches', 'ranking', 'charts'）

window.allRoundsData = [];     // 全節の試合結果
window.teamsData = {};         // チームの基本プロフィール（teams.json）
let allPlayersData = [];    // CSVから読み込んだ全選手データ

// 画面が読み込まれたらスタート
// 画面が読み込まれたらスタート
// 画面が読み込まれたらスタート
document.addEventListener('DOMContentLoaded', async () => {
    // 💡 1. データの読み込みを最優先で確実に終わらせる
    try {
        console.log("1/3: チーム基本データの読み込みを開始します...");
        await loadTeamsData(); 
        
        console.log("2/3: 選手データの読み込みを開始します...");
        await loadPlayersCSV();
        
        console.log("3/3: 試合日程・結果の読み込みを開始します...");
        await loadAllRounds();
        
    } catch (error) {
        console.error("❌ データのロード中にエラーが発生しました:", error);
    }
    
    // 💡 2. 【超重要】裏でのHTML書き換えに負けないよう、ここで個別にカチッと直接登録する
    const tabs = [
        { id: 'nav-matches', name: 'matches' },
        { id: 'nav-ranking', name: 'ranking' },
        { id: 'nav-charts', name: 'charts' },
        { id: 'nav-players', name: 'players' }
    ];

    tabs.forEach(tab => {
        const btn = document.getElementById(tab.id);
        if (btn) {
            // 一度既存のリスナーをクリアする代わりとして、直接 onclick に代入して固定化する
            btn.onclick = () => {
                console.log(`🎯 タブがクリックされました: ${tab.name}`);
                activeTab = tab.name;
                if (typeof setActiveNavButton === 'function') setActiveNavButton(tab.id);
                updateView();
            };
        }
    });

    // 💡 3. その他のボタンやモーダルのイベントを設定
    setupEventListeners();
    setupModalEvents(); 

    // グラフのプルダウン初期化
    if (typeof initTeamSelector === 'function') {
        initTeamSelector(window.currentDivision);
    }

    // モーダル類を安全に非表示にする
    const matchModal = document.getElementById('match-modal');
    const teamDetail = document.getElementById('team-detail-section');
    if (matchModal) matchModal.classList.add('d-none');
    if (teamDetail) teamDetail.classList.add('d-none');

    // 💡 4. 最後に画面を描画
    updateView();
});
// ==========================================================================
// 2. イベントリスナーの設定
// ==========================================================================
function setupEventListeners() {
    // タブ切り替えイベントを統合管理
    const tabs = [
        { id: 'nav-matches', name: 'matches' },
        { id: 'nav-ranking', name: 'ranking' },
        { id: 'nav-charts', name: 'charts' },
        { id: 'nav-players', name: 'players' } // 💡 新設された選手名鑑タブに対応
    ];

    // 節切り替え
    document.getElementById('prev-btn').addEventListener('click', () => {
        if (window.currentRound > 1) { 
            window.currentRound--; 
            updateView(); 
        }
    });

    document.getElementById('next-btn').addEventListener('click', () => {
        const maxRounds = window.currentDivision === '1' ? 34 : 38;
        if (window.currentRound < maxRounds) { 
            window.currentRound++; 
            updateView(); 
        }
    });

    // 💡 チーム詳細の×ボタンを確実に動かす
    const closeDetailBtn = document.getElementById('close-detail-btn');
    if (closeDetailBtn) {
        closeDetailBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('team-detail-section').classList.add('d-none');
        });
    }
}

// 💡 試合詳細モーダルのイベント制御（バグを完全除去）
function setupModalEvents() {
    const matchModal = document.getElementById('match-modal');
    const closeModalBtn = document.getElementById('close-modal');

    if (!matchModal) return;

    // 💡 閉じるボタン（×）がクリックされたらモーダルを非表示にする
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 余計なイベントの連鎖を防ぐ
            matchModal.classList.add('d-none');
        });
    }

    // 💡 モーダルの外側の黒い背景をクリックしても閉じられるようにする（親切設計）
    matchModal.addEventListener('click', (e) => {
        if (e.target === matchModal) {
            matchModal.classList.add('d-none');
        }
    });
}

// ナビゲーションのactive制御も4つのボタンに対応させる
function setActiveNavButton(activeId) {
    const navIds = ['nav-matches', 'nav-ranking', 'nav-charts', 'nav-players'];
    navIds.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            if (id === activeId) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    });
}

function switchDivision(division) {
    window.currentDivision = division;
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    if (division === '1') buttons[0].classList.add('active');
    if (division === '2') buttons[1].classList.add('active');
    
    // 💡 1部(34節)から2部へ、またはその逆で最大節数を超えないようにする安全弁
    const maxRounds = division === '1' ? 34 : 38;
    if (window.currentRound > maxRounds) {
        window.currentRound = maxRounds;
    }
    
    updateView();
}

// ==========================================================================
// 3. データ通信 (Data Fetching) & CSV解析
// ==========================================================================
async function loadAllRounds() {
    allRoundsData = [];
    let r = 1; let hasMoreData = true;
    while (hasMoreData) {
        try {
            const response = await fetch(`../data/round_${r}.json`);
            if (!response.ok) { hasMoreData = false; }
            else { allRoundsData.push(await response.json()); r++; }
        } catch (error) { hasMoreData = false; }
    }
    // 💡 最終節ではなく、起動時は必ず「第 1 節」を表示するように固定する！
    window.currentRound = 1;
}

async function loadTeamsData() {
    try {
        const response = await fetch(`./teams.json`);
        if (response.ok) {
            window.teamsData = await response.json();
            return window.teamsData;
        }
    } catch (error) { 
        console.error("teams.jsonの読み込みに失敗しました:", error); 
    }
}

async function loadPlayersCSV() {
    try {
        console.log("🔄 players.csv の読み込みを開始します...");
        
        // 💡 対策1: teams.jsonが未ロードなら、ロード完了を最大3秒まで待機するセーフティを追加
        let attempts = 0;
        while (!window.teamsData && attempts < 30) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        const response = await fetch(`../players.csv`);
        if (!response.ok) {
            console.error(`❌ CSVの読み込みに失敗しました。ステータス: ${response.status}`);
            return;
        }
        
        let text = await response.text();
        
        // 💡 対策2: Excel等から書き出したCSV特有の「BOM（目に見えない制御文字）」を完全に除去
        if (text.charCodeAt(0) === 0xFEFF) {
            text = text.substr(1);
        }

        const rows = text.split(/\r?\n/);
        allPlayersData = [];
        window.autoDivisionMap = {};
        
        for (let i = 1; i < rows.length; i++) {
            const rowText = rows[i].trim();
            if (!rowText) continue;
            
            let cols = rowText.includes('\t') ? rowText.split('\t') : rowText.split(',');
            
            // 💡 対策3: ヘッダー行そのもの（"チーム","ポジション"...という文字列）を誤判定しないようスルー
            if (cols[0] === 'チーム' || cols[0] === 'team') continue;

            const cleanTeam = cols[0]?.trim().replace(/^["']|["']$/g, '') || '';
            const cleanPos  = cols[1]?.trim() || '';
            const cleanNo   = parseInt(cols[2]?.trim()) || 0;
            const cleanNameA = cols[3]?.trim() || '';
            const cleanNameB = cols[4]?.trim() || '';
            
            const cleanOff  = parseInt(cols[5]?.trim()) || 0;
            const cleanPhy  = parseInt(cols[6]?.trim()) || 0;
            const cleanSta  = parseInt(cols[7]?.trim()) || 0;
            const cleanDef  = parseInt(cols[8]?.trim()) || 0;
            const cleanMen  = parseInt(cols[9]?.trim()) || 0;
            const cleanTec  = parseInt(cols[10]?.trim()) || 0;
            const cleanSum  = parseInt(cols[11]?.trim()) || 0;
            
            let cleanDiv  = cols[14]?.trim().replace(/^["']|["']$/g, '') || '';

            if (cleanTeam) {
                // window.teamsData が存在するときだけ厳密にチェック
                if (window.teamsData && Object.keys(window.teamsData).length > 0) {
                    if (!window.teamsData[cleanTeam]) {
                        console.error(`🚨 一致するチームが teams.json にありません: 【${cleanTeam}】`);
                    }
                }
                
                allPlayersData.push({
                    team: cleanTeam, pos: cleanPos, no: cleanNo, namea: cleanNameA, nameb: cleanNameB,
                    stats: { off: cleanOff, phy: cleanPhy, sta: cleanSta, def: cleanDef, men: cleanMen, tec: cleanTec, sum: cleanSum }
                });
                
                if (cleanDiv) {
                    window.autoDivisionMap[cleanTeam] = String(cleanDiv);
                }
            }
        }

        // 💡 救済ロジック
        if (window.teamsData) {
            Object.keys(window.teamsData).forEach(teamName => {
                if (!window.autoDivisionMap[teamName]) {
                    // ルシエル星丘・ルセリオ峰岡など、データ移行の過渡期にあるチームの救済
                    if (teamName.includes('星丘') || teamName.includes('ルシエル')) {
                        window.autoDivisionMap[teamName] = '1';
                    } else {
                        window.autoDivisionMap[teamName] = '1'; 
                    }
                    console.warn(`⚠️ CSVからディビジョンが判定できなかったため救済しました: ${teamName}`);
                }
            });
        }
        console.log(`✅ プレイヤーデータの解析が完了しました: ${allPlayersData.length}人分`);
    } catch (error) {
        console.error("❌ players.csvの解析中にエラーが発生しました:", error);
    }
}

// ==========================================================================
// 4. 画面表示の総合コントロール & ヘルパー
// ==========================================================================
function updateView() {
    console.log(`🎬 updateViewを実行します。現在のタブ: ${activeTab}`);

    // 💡 HTML側の実際のID名（content-タブ名）と完全に一致させました！
    const matchesSection = document.getElementById('content-matches');
    const rankingSection = document.getElementById('content-ranking');
    const chartsSection = document.getElementById('content-charts');
    const playersSection = document.getElementById('content-players');

    // 1. まずすべてのセクションを一旦非表示にする
    if (matchesSection) matchesSection.classList.add('d-none');
    if (rankingSection) rankingSection.classList.add('d-none');
    if (chartsSection) chartsSection.classList.add('d-none');
    if (playersSection) playersSection.classList.add('d-none');

    // 2. 現在アクティブなタブだけを表示して、中の描画関数を動かす
    if (activeTab === 'matches') {
        if (matchesSection) matchesSection.classList.remove('d-none');
        if (typeof renderMatches === 'function') renderMatches();
    } 
    else if (activeTab === 'ranking') {
        if (rankingSection) rankingSection.classList.remove('d-none');
        if (typeof renderRanking === 'function') renderRanking();
    } 
    else if (activeTab === 'charts') {
        if (chartsSection) chartsSection.classList.remove('d-none');
        if (typeof renderCharts === 'function') renderCharts();
    } 
    else if (activeTab === 'players') {
        if (playersSection) playersSection.classList.remove('d-none');
        if (typeof renderPlayers === 'function') renderPlayers();
    }
}

function getLogoPath(teamName) {
    if (!teamName) return 'images/logos/default.png';
    return `images/logos/${teamName.trim()}.jpg`; 
}

function showTeamDetail(teamName) {
    const section = document.getElementById('team-detail-section');
    if (!section) return;

    document.getElementById('detail-team-name').textContent = teamName;
    document.getElementById('detail-logo').src = getLogoPath(teamName);
    document.getElementById('detail-logo').style.display = 'block';

    const info = window.teamsData[teamName];
    if (info) {
        document.getElementById('detail-hometown').textContent = info.hometown || '-';
        document.getElementById('detail-stadium').textContent = info.stadium || '-';
        document.getElementById('detail-desc').textContent = info.description || '公式説明文が未設定です。';
    } else {
        document.getElementById('detail-hometown').textContent = '未設定';
        document.getElementById('detail-stadium').textContent = '未設定';
        document.getElementById('detail-desc').textContent = `『${teamName}』のプロフィールは teams.json 未登録です。`;
    }

    const teamPlayers = allPlayersData.filter(p => p.team === teamName);
    const posOrder = { 'gk': 1, 'df': 2, 'mf': 3, 'fw': 4 };
    teamPlayers.sort((x, y) => {
        const posX = posOrder[x.pos?.toLowerCase()] || 99;
        const posY = posOrder[y.pos?.toLowerCase()] || 99;
        if (posX !== posY) return posX - posY;
        return x.no - y.no;
    });

    const tbody = document.getElementById('detail-players-body');
    if (tbody) {
        tbody.innerHTML = '';
        if (teamPlayers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="sub-text">CSVファイルにこのチームの選手が見つかりませんでした。</td></tr>';
        } else {
            teamPlayers.forEach(p => {
                const tr = document.createElement('tr');
                const posLower = p.pos ? p.pos.toLowerCase() : '';
                let posClass = '';
                if (posLower.includes('gk')) posClass = 'pos-gk';
                else if (posLower.includes('df')) posClass = 'pos-df';
                else if (posLower.includes('mf')) posClass = 'pos-mf';
                else if (posLower.includes('fw')) posClass = 'pos-fw';

                let sumClass = 'stat-sum-normal';
                if (p.stats.sum >= 2000) sumClass = 'stat-sum-red';
                else if (p.stats.sum >= 1500) sumClass = 'stat-sum-orange';
                else if (p.stats.sum >= 1000) sumClass = 'stat-sum-yellow';

                tr.innerHTML = `
                    <td><strong>${p.no}</strong></td>
                    <td><span class="${posClass}">${p.pos}</span></td>
                    <td>
                        <div class="player-name-cell">
                            <span class="p-name-a">${p.namea}</span>
                            <span class="p-name-b">${p.nameb}</span>
                        </div>
                    </td>
                    <td class="stat-cell text-center"><span class="stat-val">${p.stats.off}</span></td>
                    <td class="stat-cell text-center"><span class="stat-val">${p.stats.def}</span></td>
                    <td class="stat-cell text-center"><span class="stat-val">${p.stats.tec}</span></td>
                    <td class="stat-cell text-center"><span class="stat-val">${p.stats.phy}</span></td>
                    <td class="stat-cell text-center"><span class="stat-val">${p.stats.sta}</span></td>
                    <td class="stat-cell text-center"><span class="stat-val">${p.stats.men}</span></td>
                    <td class="stat-cell text-center"><strong class="${sumClass}">${p.stats.sum}</strong></td>
                `;
                tbody.appendChild(tr);
            });
        }
    }
    section.classList.remove('d-none');
    section.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

// ==========================================================================
// 5. 試合日程・結果 画面の描画（★1部34節・2部38節の未来対応版）
// ==========================================================================
function renderMatches() {
    const matchList = document.getElementById('match-list');
    matchList.innerHTML = '';
    
    // 最大節数のテキスト表示切り替え
    const maxRounds = window.currentDivision === '1' ? 34 : 38;
    document.getElementById('round-title').textContent = `第 ${window.currentRound} 節 / 全 ${maxRounds} 節`;

    // 💡【未来の日程対応】まだJSONデータが存在しない節の場合の表示
    if (allRoundsData.length === 0 || !allRoundsData[window.currentRound - 1]) {
        matchList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #a0aec0; background: #1a202c; border-radius: 8px; width: 100%; border: 1px dashed #4a5568;">
                <p style="font-size: 1.1rem; font-weight: bold; margin-bottom: 8px;">📅 第 ${window.currentRound} 節（未消化）</p>
                <p style="font-size: 0.9rem; color: #718096;">この節の試合シミュレーションはまだ実行されていません。</p>
            </div>
        `;
        return;
    }

    const roundData = allRoundsData[window.currentRound - 1];
    const matches = window.currentDivision === '1' ? roundData.j1_matches : roundData.j2_matches;
    const divClass = window.currentDivision === '1' ? 'div-1' : 'div-2';

    if (!matches || matches.length === 0) {
        matchList.innerHTML = `<p class="loading">試合データが見つかりません。</p>`;
        return;
    }

    matches.forEach((match, index) => {
        const card = document.createElement('div');
        card.className = `match-card ${divClass}`;

        // スコアが存在するか安全チェック
        const hasScore = match.home_score !== undefined && match.home_score !== null;
        const scoreText = hasScore ? `${match.home_score} - ${match.away_score}` : 'vs';

        const homeScorersText = (hasScore && match.home_scorers.length > 0) ? `⚽ ${match.home_scorers.join(', ')}` : '';
        const awayScorersText = (hasScore && match.away_scorers.length > 0) ? `${match.away_scorers.join(', ')} ⚽` : '';

        // 💡 試合データを特定するための連想配列を一時的に持たせる
        const matchString = encodeURIComponent(JSON.stringify(match));

        // 💡 中央のスコアボックス付近をクリックすると試合詳細モーダルが開くよう変更
        card.innerHTML = `
            <div class="match-row">
                <div class="team home" style="cursor: pointer;" onclick="showTeamDetail('${match.home}')">
                    <span class="team-name">${match.home}</span>
                    <img src="${getLogoPath(match.home)}" alt="" class="club-logo" onerror="this.style.display='none'">
                </div>
                <div class="score-box" style="cursor: pointer;" onclick="openMatchDetail('${matchString}')" title="試合詳細を表示">${scoreText}</div>
                <div class="team away" style="cursor: pointer;" onclick="showTeamDetail('${match.away}')">
                    <img src="${getLogoPath(match.away)}" alt="" class="club-logo" onerror="this.style.display='none'">
                    <span class="team-name">${match.away}</span>
                </div>
            </div>
            ${hasScore ? `
            <div class="scorers" style="cursor: pointer;" onclick="openMatchDetail('${matchString}')" title="試合詳細を表示">
                <div class="home-scorers">${homeScorersText}</div>
                <div class="away-scorers">${awayScorersText}</div>
            </div>
            ` : ''}
        `;
        matchList.appendChild(card);
    });
}

// ==========================================================================
// 6. 順位表 画面の描画
// ==========================================================================
function renderRanking() {
    const tbody = document.getElementById('ranking-body');
    tbody.innerHTML = '';

    if (allRoundsData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="loading">データがありません。</td></tr>';
        return;
    }

    const stats = {};

    allRoundsData.forEach(roundData => {
        const matches = window.currentDivision === '1' ? roundData.j1_matches : roundData.j2_matches;
        if (!matches) return;
        
        matches.forEach(match => {
            // 💡 スコアが null（未消化試合）の場合は、順位表の計算から完全に除外する
            if (match.home_score === null || match.away_score === null) return;

            if (!stats[match.home]) stats[match.home] = { name: match.home, played: 0, points: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0 };
            if (!stats[match.away]) stats[match.away] = { name: match.away, played: 0, points: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0 };

            const h = stats[match.home]; const a = stats[match.away];
            h.played++; a.played++;
            h.gf += match.home_score; h.ga += match.away_score;
            a.gf += match.away_score; a.ga += match.home_score;

            if (match.home_score > match.away_score) { h.points += 3; h.won++; a.lost++; }
            else if (match.home_score < match.away_score) { a.points += 3; a.won++; h.lost++; }
            else { h.points += 1; h.drawn++; a.points += 1; a.drawn++; }
        });
    });

    const rankingArray = Object.values(stats).map(team => { team.gd = team.gf - team.ga; return team; });

    rankingArray.sort((x, y) => {
        if (y.points !== x.points) return y.points - x.points;
        if (y.gd !== x.gd) return y.gd - x.gd;
        return y.gf - x.gf;
    });

    rankingArray.forEach((team, index) => {
        const rank = index + 1;
        let rowClass = `div-${window.currentDivision}-rank-${rank}`;
        if (window.currentDivision === '1' && rank >= 16) { rowClass += ' rank-relegation'; }

        const tr = document.createElement('tr');
        tr.className = rowClass;
        tr.style.cursor = 'pointer';
        tr.onclick = () => showTeamDetail(team.name);

        tr.innerHTML = `
            <td><strong>${rank}</strong></td>
            <td>
                <div class="ranking-team-cell">
                    <img src="${getLogoPath(team.name)}" alt="" class="club-logo" onerror="this.style.display='none'">
                    <span>${team.name}</span>
                </div>
            </td>
            <td>${team.played}</td>
            <td><strong>${team.points}</strong></td>
            <td>${team.won}</td>
            <td>${team.drawn}</td>
            <td>${team.lost}</td>
            <td>${team.gf}</td>
            <td>${team.ga}</td>
            <td>${team.gd > 0 ? '+' + team.gd : team.gd}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================================================
// 7. 試合詳細モーダルの制御ロジック
// ==========================================================================
function openMatchDetail(encodedMatchData) {
    const matchData = JSON.parse(decodeURIComponent(encodedMatchData));
    if (!matchData || matchData.home_score === null) return;

    // タイトルの設定
    document.getElementById('modal-round-title').textContent = `第 ${window.currentRound} 節 試合詳細`;

    // チーム名・スコアのセット
    document.getElementById('modal-home-name').textContent = matchData.home;
    document.getElementById('modal-away-name').textContent = matchData.away;
    document.getElementById('modal-home-score').textContent = matchData.home_score;
    document.getElementById('modal-away-score').textContent = matchData.away_score;

    // ロゴ画像のセット
    document.getElementById('modal-home-logo').src = getLogoPath(matchData.home);
    document.getElementById('modal-away-logo').src = getLogoPath(matchData.away);

    // 得点者リストのクリアと生成
    const homeScorersDiv = document.getElementById('modal-home-scorers');
    const awayScorersDiv = document.getElementById('modal-away-scorers');
    
    homeScorersDiv.innerHTML = '';
    awayScorersDiv.innerHTML = '';

    if (matchData.home_scorers && matchData.home_scorers.length > 0) {
        matchData.home_scorers.forEach(scorer => {
            homeScorersDiv.innerHTML += `<div class="scorer-item">⚽ ${scorer}</div>`;
        });
    }
    
    if (matchData.away_scorers && matchData.away_scorers.length > 0) {
        matchData.away_scorers.forEach(scorer => {
            awayScorersDiv.innerHTML += `<div class="scorer-item">${scorer} ⚽</div>`;
        });
    }

    // モーダルを表示
    document.getElementById('match-modal').classList.remove('d-none');
}