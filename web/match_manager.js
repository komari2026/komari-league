/**
 * 試合日程・結果 管理モジュール
 */

/**
 * 現在のディビジョンに応じた最大節数を取得する
 */
function getMaxRounds() {
    return window.currentDivision === '1' ? 34 : 38;
}

/**
 * 試合詳細モーダル（ポップアップ）を表示する処理
 */
function showMatchModal(match) {
    const modal = document.getElementById('match-modal');
    if (!modal) return;

    // 各要素にデータを流し込む
    document.getElementById('modal-round-title').textContent = `第 ${window.currentRound} 節 試合詳細`;
    document.getElementById('modal-home-name').textContent = match.home;
    document.getElementById('modal-away-name').textContent = match.away;
    
    // ロゴの反映
    document.getElementById('modal-home-logo').src = typeof getLogoPath === 'function' ? getLogoPath(match.home) : '';
    document.getElementById('modal-away-logo').src = typeof getLogoPath === 'function' ? getLogoPath(match.away) : '';

    // スコアの反映
    const isPlayed = match.home_score !== undefined && match.home_score !== null;
    document.getElementById('modal-home-score').textContent = isPlayed ? match.home_score : '-';
    document.getElementById('modal-away-score').textContent = isPlayed ? match.away_score : '-';

    // 得点者リストの反映
    const homeScorersContainer = document.getElementById('modal-home-scorers');
    const awayScorersContainer = document.getElementById('modal-away-scorers');
    
    homeScorersContainer.innerHTML = '';
    awayScorersContainer.innerHTML = '';

    if (isPlayed && match.home_scorers) {
        match.home_scorers.forEach(scorer => {
            const div = document.createElement('div');
            div.className = 'scorer-item';
            div.textContent = `⚽ ${scorer}`;
            homeScorersContainer.appendChild(div);
        });
    }
    if (isPlayed && match.away_scorers) {
        match.away_scorers.forEach(scorer => {
            const div = document.createElement('div');
            div.className = 'scorer-item';
            div.textContent = `${scorer} ⚽`;
            awayScorersContainer.appendChild(div);
        });
    }

    // モーダルを表示（d-noneクラスを除去）
    modal.classList.remove('d-none');
}

/**
 * 試合日程・結果の描画メイン処理
 */
function renderMatches() {
    const matchList = document.getElementById('match-list');
    if (!matchList) return;
    
    matchList.innerHTML = '';
    
    // 💡【39節バグ防止】現在のディビジョンの最大節を超えないようにセーフティをかける
    const maxRounds = getMaxRounds();
    if (window.currentRound > maxRounds) {
        window.currentRound = maxRounds;
    }
    
    // ヘッダーの節タイトルを更新
    document.getElementById('round-title').textContent = `第 ${window.currentRound} 節 / 全 ${maxRounds} 節`;

    // 💡【未来の節の処理】
    if (!window.allRoundsData || window.allRoundsData.length === 0 || !window.allRoundsData[window.currentRound - 1]) {
        matchList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #a0aec0; background: var(--card-bg); border-radius: 8px;">
                <p style="font-size: 1.1rem; font-weight: bold; margin-bottom: 8px;">📅 第 ${window.currentRound} 節（試合日程）</p>
                <p style="font-size: 0.9rem; color: #718096;">この節の試合はまだ開催されていません。シミュレーションの実行をおお待ちください。</p>
            </div>
        `;
        return;
    }

    // 既存のデータがある節の結果描画ロジック
    const roundData = window.allRoundsData[window.currentRound - 1];
    
    // JSONのキー形式に応じて安全に取得
    const matches = window.currentDivision === '1' ? (roundData.j1_matches || roundData.matches) : (roundData.j2_matches || roundData.matches);
    const divClass = window.currentDivision === '1' ? 'div-1' : 'div-2';

    if (!matches || matches.length === 0) {
        matchList.innerHTML = `<p class="loading">このディビジョンの試合データが見つかりません。</p>`;
        return;
    }

    matches.forEach(match => {
        const card = document.createElement('div');
        card.className = `match-card ${divClass}`;

        card.addEventListener('click', (e) => {
            if (e.target.closest('.team')) return;
            showMatchModal(match);
        });

        const isPlayed = match.home_score !== undefined && match.home_score !== null;
        const scoreText = isPlayed ? `${match.home_score} - ${match.away_score}` : 'vs';

        // 🔴 ここにあった homeScorersText / awayScorersText の定義行は不要なので削除！

        const logoHome = typeof getLogoPath === 'function' ? getLogoPath(match.home) : '';
        const logoAway = typeof getLogoPath === 'function' ? getLogoPath(match.away) : '';

        // 💡 HTML生成部分から ${isPlayed ? `...` : ''} のブロックを削除
        card.innerHTML = `
            <div class="match-row">
                <div class="team home" style="cursor: pointer;" onclick="showTeamDetail('${match.home}')">
                    <span class="team-name">${match.home}</span>
                    <img src="${logoHome}" alt="" class="club-logo" onerror="this.style.display='none'">
                </div>
                <div class="score-box" style="${!isPlayed ? 'color: #718096; font-weight: normal;' : ''}">${scoreText}</div>
                <div class="team away" style="cursor: pointer;" onclick="showTeamDetail('${match.away}')">
                    <img src="${logoAway}" alt="" class="club-logo" onerror="this.style.display='none'">
                    <span class="team-name">${match.away}</span>
                </div>
            </div>
        `;
        matchList.appendChild(card);
    });
}

// 💡 モーダルを閉じる処理のイベントリスナーをここで確実にバインド
document.addEventListener('DOMContentLoaded', () => {
    const closeModalBtn = document.getElementById('close-modal');
    const matchModal = document.getElementById('match-modal');
    
    if (closeModalBtn && matchModal) {
        closeModalBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // イベントのバブリングを防止
            matchModal.classList.add('d-none');
        });
    }
});

// グローバルスコープへ公開
window.renderMatches = renderMatches;
window.getMaxRounds = getMaxRounds;
window.showMatchModal = showMatchModal;