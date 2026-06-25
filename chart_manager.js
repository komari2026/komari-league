/**
 * 順位推移グラフ＆タブ管理モジュール (CSVディビジョン連動版)
 */
let rankingChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    const navCharts = document.getElementById('nav-charts');
    const teamSelector = document.getElementById('chart-team-selector');

    if (!navCharts || !teamSelector) return;

    // 1. メインナビゲーションに「順位推移」タブのクリックイベントを追加
    navCharts.addEventListener('click', () => {
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('d-none'));
        document.getElementById('content-charts').classList.remove('d-none');

        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        navCharts.classList.add('active');

        initTeamSelector(window.currentDivision || '1');
    });

    // 2. プルダウンメニューが変わった時にグラフを再描画
    teamSelector.addEventListener('change', (e) => {
        const selectedTeam = e.target.value;
        if (selectedTeam) {
            drawTeamRankingChart(selectedTeam, window.currentRound || 1);
        }
    });
});

/**
 * 選択されているディビジョン（1部/2部）に応じてプルダウンメニューの中身を更新する
 */
function initTeamSelector(division) {
    const teamSelector = document.getElementById('chart-team-selector');
    if (!teamSelector || !window.teamsData) return;

    // 現在の選択を一旦クリア
    teamSelector.innerHTML = '';

    const targetDivStr = String(division);
    const divMap = window.autoDivisionMap || {};

    // 💡 players.csv から抽出したディビジョンを基準にフィルタリング
    const divTeams = Object.keys(window.teamsData).filter(name => {
        const detectedDiv = divMap[name];
        return String(detectedDiv) === targetDivStr;
    });
    
    if (divTeams.length === 0) {
        console.warn(`グラフ用プルダウン: ディビジョン [${division}] に該当するチームがCSVデータから見つかりません。`);
        return;
    }

    // 五十音順にソート
    divTeams.sort();

    divTeams.forEach(teamName => {
        const option = document.createElement('option');
        option.value = teamName;
        option.textContent = teamName;
        teamSelector.appendChild(option);
    });

    // 最初のチームを自動選択してグラフを描画
    teamSelector.value = divTeams[0];
    drawTeamRankingChart(divTeams[0], window.currentRound || 1);
}

// app.jsのディビジョン切り替え関数と同期させるためのフック
if (window.switchDivision) {
    const originalSwitchDivision = window.switchDivision;
    window.switchDivision = function(div) {
        if (typeof originalSwitchDivision === 'function') {
            originalSwitchDivision(div);
        }
        const chartSection = document.getElementById('content-charts');
        if (chartSection && !chartSection.classList.contains('d-none')) {
            initTeamSelector(div);
        }
    };
}

/**
 * 順位推移グラフを描画するコアロジック
 */
async function drawTeamRankingChart(targetTeamName, maxRound) {
    const ctx = document.getElementById('rankingChart');
    if (!ctx) return;

    if (rankingChartInstance) {
        rankingChartInstance.destroy();
    }

    const divMap = window.autoDivisionMap || {};
    const targetDivision = divMap[targetTeamName] || '1';

    const roundLabels = [];
    const rankHistory = [];
    const leagueStats = {};

    for (const name in window.teamsData) {
        leagueStats[name] = { points: 0, gd: 0, gs: 0 };
    }

    // 第1節から最新節まで計算
    // 第1節から最新節まで計算
    for (let r = 1; r <= maxRound; r++) {
        try {
            const response = await fetch(`./data/round_${r}.json`);
            if (!response.ok) break; 
            
            const roundData = await response.json();

            const matches = targetDivision === '1' ? roundData.j1_matches : roundData.j2_matches;
            if (!matches) continue;

            // 💡【ここを追加！】
            // その節の最初の試合が未消化（home_scoreが null）の場合、
            // それ以降の節はまだシミュレーションしていない未来の節なので、ここで計算をストップしてループを抜ける
            if (matches.length > 0 && matches[0].home_score === null) {
                break;
            }

            // この節は試合が行われているので、ラベルを追加
            roundLabels.push(`第${r}節`);

            matches.forEach(match => {
                const home = match.home;
                const away = match.away;
                const hScore = match.home_score;
                const aScore = match.away_score;

                if (hScore === null || aScore === null) return;

                if (!leagueStats[home]) leagueStats[home] = { points: 0, gd: 0, gs: 0 };
                if (!leagueStats[away]) leagueStats[away] = { points: 0, gd: 0, gs: 0 };

                leagueStats[home].gs += hScore;
                leagueStats[away].gs += aScore;
                leagueStats[home].gd += (hScore - aScore);
                leagueStats[away].gd += (aScore - hScore);

                if (hScore > aScore) {
                    leagueStats[home].points += 3;
                } else if (hScore < aScore) {
                    leagueStats[away].points += 3;
                } else {
                    leagueStats[home].points += 1;
                    leagueStats[away].points += 1;
                }
            });

            // 同じディビジョンのチームだけを抽出してソート
            const divTeams = Object.keys(leagueStats).filter(name => divMap[name] === targetDivision);
            
            divTeams.sort((a, b) => {
                if (leagueStats[b].points !== leagueStats[a].points) return leagueStats[b].points - leagueStats[a].points;
                if (leagueStats[b].gd !== leagueStats[a].gd) return leagueStats[b].gd - leagueStats[a].gd;
                return leagueStats[b].gs - leagueStats[a].gs;
            });

            const currentRank = divTeams.indexOf(targetTeamName) + 1;
            rankHistory.push(currentRank);

        } catch (e) {
            console.error(e);
            break;
        }
    }

    if (rankHistory.length === 0) return;

    const totalDivTeams = Object.keys(window.teamsData).filter(name => divMap[name] === targetDivision).length;

    rankingChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: roundLabels,
            datasets: [{
                label: `${targetTeamName} 順位推移`,
                data: rankHistory,
                borderColor: targetDivision === '1' ? '#ff4757' : '#1e90ff',
                backgroundColor: targetDivision === '1' ? 'rgba(255, 71, 87, 0.05)' : 'rgba(30, 144, 255, 0.05)',
                borderWidth: 3,
                pointBackgroundColor: '#ffffff',
                pointRadius: 4,
                tension: 0.15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) { return `順位: ${context.parsed.y} 位`; }
                    }
                }
            },
            scales: {
                y: {
                    reverse: true,
                    min: 1,
                    max: totalDivTeams || 20,
                    ticks: {
                        stepSize: 1,
                        color: '#a0aec0',
                    },
                    grid: { color: '#2d3748' }
                },
                x: {
                    ticks: { color: '#a0aec0' },
                    grid: { color: '#2d3748' }
                }
            }
        }
        
    });
    // リロード時に現在の1部・2部のチーム一覧をコンソールに強制出力するデバッグコード
    setTimeout(() => {
        const divMap = window.autoDivisionMap || {};
        const j1Teams = [];
        const j2Teams = [];

        Object.keys(window.teamsData || {}).forEach(name => {
            if (divMap[name] === '1') j1Teams.push(name);
            else if (divMap[name] === '2') j2Teams.push(name);
        });

        console.log("=== 🟥 現在プログラムが「1部」と判定しているチーム（計 " + j1Teams.length + "） ===");
        console.log(j1Teams.join(", "));
        console.log("=== 🟦 現在プログラムが「2部」と判定しているチーム（計 " + j2Teams.length + "） ===");
        console.log(j2Teams.join(", "));
    }, 1000);
}
