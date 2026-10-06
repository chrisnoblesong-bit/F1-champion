const JOLPICA = "https://api.jolpi.ca/ergast/f1";
const $ = (selector) => document.querySelector(selector);

const TEAM_COLORS = {
  "McLaren":"ff8000","Ferrari":"e8002d","Red Bull":"3671c6","Red Bull Racing":"3671c6",
  "Mercedes":"27f4d2","Aston Martin":"229971","Alpine":"ff87bc","Williams":"64c4ff",
  "Racing Bulls":"6692ff","RB":"6692ff","Haas":"b6babd","Haas F1 Team":"b6babd",
  "Kick Sauber":"52e252","Sauber":"52e252","Audi":"bb0000","Cadillac":"d6d6d6"
};

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[c]);
}

function formatDate(value) {
  if (!value) return "날짜 미정";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}/${match[2]}/${match[3]}` : esc(value);
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`API 요청 실패 (${response.status})`);
  return response.json();
}

function colorForTeam(teamName, fallback = "FFFFFF") {
  const key = Object.keys(TEAM_COLORS).find(name =>
    String(teamName || "").toLowerCase().includes(name.toLowerCase())
  );
  return key ? TEAM_COLORS[key] : fallback;
}

async function loadSchedule() {
  const data = await getJson(`${JOLPICA}/current.json?limit=100`);
  const races = data.MRData?.RaceTable?.Races || [];
  $("#rounds-value").textContent = races.length || "—";
  $("#schedule-body").innerHTML = races.length ? races.map(race => `
    <tr>
      <td>${esc(race.round)}</td>
      <td><strong>${esc(race.raceName)}</strong><span class="standing-sub">${esc(race.Circuit?.Location?.locality || "")}, ${esc(race.Circuit?.Location?.country || "")}</span></td>
      <td>${formatDate(race.date)}</td>
      <td>${esc(race.Circuit?.circuitName || "—")}</td>
    </tr>
  `).join("") : `<tr><td colspan="4">일정 데이터가 없습니다.</td></tr>`;
}

async function loadDrivers() {
  const data = await getJson(`${JOLPICA}/current/driverStandings.json`);
  const standings = data.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [];
  $("#drivers-value").textContent = standings.length || "—";
  $("#drivers-list").innerHTML = standings.length ? standings.map(item => {
    const driver = item.Driver || {};
    const team = item.Constructors?.[0]?.name || "";
    const color = colorForTeam(team);
    const name = `${driver.givenName || ""} ${driver.familyName || ""}`.trim();
    return `<div class="standing-row">
      <span class="rank">${esc(item.position)}</span>
      <span class="standing-name" style="color:#${color}">${esc(name)}
        <span class="standing-sub">${esc(team)} · ${esc(driver.code || driver.nationality || "")}</span>
      </span>
      <span class="standing-points">${esc(item.points)} <span class="standing-sub">PTS</span></span>
    </div>`;
  }).join("") : `<p class="loading-cell">드라이버 순위가 없습니다.</p>`;
}

async function loadTeams() {
  const data = await getJson(`${JOLPICA}/current/constructorStandings.json`);
  const standings = data.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || [];
  $("#teams-value").textContent = standings.length || "—";
  $("#teams-list").innerHTML = standings.length ? standings.map(item => {
    const team = item.Constructor || {};
    const color = colorForTeam(team.name);
    return `<div class="standing-row">
      <span class="rank">${esc(item.position)}</span>
      <span class="standing-name" style="color:#${color}">${esc(team.name)}
        <span class="standing-sub">${esc(team.nationality || "")}</span>
      </span>
      <span class="standing-points">${esc(item.points)} <span class="standing-sub">PTS</span></span>
    </div>`;
  }).join("") : `<p class="loading-cell">팀 순위가 없습니다.</p>`;
}

async function loadLatestResults() {
  const container = $("#latest-results");
  container.innerHTML = `<p class="loading-cell">최신 세션 결과를 불러오는 중…</p>`;
  try {
    const data = await getJson("/api/latest-results");
    if (!data.ok) throw new Error(data.message || "결과 데이터 오류");
    if (!data.race) {
      container.innerHTML = `<p class="loading-cell">완료된 레이스 데이터를 아직 찾지 못했습니다.</p>`;
      return;
    }

    const sessions = data.sessions || [];
    const officialUrl = "https://www.formula1.com/en/results/2026/races";
    container.innerHTML = `
      <div class="latest-weekend-header">
        <div><p class="eyebrow">LATEST COMPLETED RACE WEEKEND</p>
          <h3>${esc(data.race.meeting_name || "최근 레이스")}</h3></div>
        <div class="latest-weekend-info">${formatDate(data.race.date_start)}</div>
      </div>
      ${sessions.length ? `<div class="latest-sessions">${sessions.map(session => `
        <article class="latest-session-card">
          <div class="session-card-head">
            <h3>${esc(session.session_name)}</h3>
            <span>${formatDate(session.date_start)}</span>
          </div>
          ${session.results?.length ? session.results.slice(0, 10).map(row => `
            <div class="latest-result-row">
              <span class="latest-result-position">${esc(row.position ?? "—")}</span>
              <span class="latest-result-driver" style="color:#${esc(row.team_colour || "FFFFFF")}">
                ${esc(row.full_name)}
                <span class="standing-sub">${esc(row.team_name)}</span>
              </span>
              <span class="latest-result-meta">${row.points != null ? `${esc(row.points)} PTS` : esc(row.duration || row.gap_to_leader || "")}</span>
            </div>
          `).join("") : `<p class="loading-cell">이 세션의 결과가 아직 제공되지 않았습니다.</p>`}
        </article>`).join("")}</div>` : `<p class="loading-cell">세션 결과를 찾지 못했습니다.</p>`}
      <p class="latest-results-source">데이터: OpenF1 · <a href="${officialUrl}" target="_blank" rel="noopener noreferrer">F1.com 공식 결과 페이지 ↗</a></p>
    `;
  } catch (error) {
    console.error("최신 결과 API 오류:", error);
    container.innerHTML = `<p class="loading-cell error-text">최신 세션 결과를 불러오지 못했습니다. 서버 API와 외부 데이터 연결을 확인해 주세요.<br><a href="https://www.formula1.com/en/results/2026/races" target="_blank" rel="noopener noreferrer">F1.com 공식 결과 확인 ↗</a></p>`;
  }
}

async function runTask(task, label) {
  try {
    await task();
    return true;
  } catch (error) {
    console.error(`${label} 오류:`, error);
    return false;
  }
}

async function loadDashboard() {
  $("#connection-status").textContent = "연결 확인 중…";
  const results = await Promise.all([
    runTask(loadSchedule, "일정"),
    runTask(loadDrivers, "드라이버 순위"),
    runTask(loadTeams, "팀 순위"),
    runTask(loadLatestResults, "최신 결과")
  ]);
  const good = results.filter(Boolean).length;
  $("#connection-status").textContent = good === 4 ? "데이터 연결 완료" : `일부 연결 실패 (${good}/4)`;
}

$("#refresh-button")?.addEventListener("click", loadDashboard);
loadDashboard();
