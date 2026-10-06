
const API_BASE = "https://api.jolpi.ca/ergast/f1";
const F1_BASE = "https://www.formula1.com/en/results/2026/races";

const $ = (selector) => document.querySelector(selector);

const teamColors = {
  "McLaren": "#ff8700",
  "Ferrari": "#e8002d",
  "Red Bull": "#3671c6",
  "Red Bull Racing": "#3671c6",
  "Mercedes": "#27f4d2",
  "Aston Martin": "#229971",
  "Alpine": "#ff87bc",
  "Alpine F1 Team": "#ff87bc",
  "Williams": "#64c4ff",
  "Racing Bulls": "#6692ff",
  "Haas": "#b6babd",
  "Haas F1 Team": "#b6babd",
  "Kick Sauber": "#52e252",
  "Sauber": "#52e252",
  "Audi": "#bb0000",
  "Cadillac": "#d6d6d6"
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

/* 날짜: YYYY/MM/DD */
function formatDate(dateString) {
  if (!dateString) return "날짜 미정";

  const match = String(dateString).match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

  return match
    ? `${match[1]}/${match[2]}/${match[3]}`
    : dateString;
}

async function getJson(path) {
  const response = await fetch(API_BASE + path, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error(`API 요청 실패 (${response.status})`);
  }

  return response.json();
}

function setStatus(message, good = true) {
  const status = $("#connection-status");
  if (!status) return;

  status.textContent = message;
  status.style.color = good ? "var(--green)" : "#ff7c88";
}

/* 레이스 일정 */
function renderSchedule(races) {
  const body = $("#schedule-body");
  if (!body) return;

  if (!races.length) {
    body.innerHTML = `
      <tr><td colspan="4" class="loading-cell">
        표시할 일정이 없습니다.
      </td></tr>`;
    return;
  }

  body.innerHTML = races.map(race => `
    <tr>
      <td>${escapeHtml(race.round)}</td>
      <td>${escapeHtml(race.raceName)}</td>
      <td>${escapeHtml(race.Circuit?.circuitName || "서킷 정보 없음")}</td>
      <td>${escapeHtml(formatDate(race.date))}</td>
    </tr>
  `).join("");
}

/* 드라이버 순위: 이름을 소속 팀 색상으로 표시 */
function renderDrivers(drivers) {
  const list = $("#drivers-list");
  if (!list) return;

  if (!drivers.length) {
    list.innerHTML = `
      <div class="loading-cell">드라이버 순위가 없습니다.</div>`;
    return;
  }

  list.innerHTML = drivers.slice(0, 5).map(item => {
    const driver = item.Driver || {};
    const name = [
      driver.givenName,
      driver.familyName
    ].filter(Boolean).join(" ");

    const team = item.Constructors?.[0]?.name || "팀 정보 없음";
    const color = teamColors[team] || "#ffffff";

    return `
      <div class="leader-row">
        <span class="rank">${escapeHtml(item.position || "—")}</span>

        <div class="leader-name">
          <span style="color:${color};font-weight:700">
            ${escapeHtml(name)}
          </span>
          <span class="leader-team">${escapeHtml(team)}</span>
        </div>

        <span class="points">
          ${escapeHtml(item.points || "0")}
          <small>PTS</small>
        </span>
      </div>
    `;
  }).join("");
}

/* 팀 순위 */
function renderTeams(teams) {
  const list = $("#teams-list");
  if (!list) return;

  if (!teams.length) {
    list.innerHTML = `
      <div class="loading-cell">팀 순위가 없습니다.</div>`;
    return;
  }

  list.innerHTML = teams.map(item => {
    const name = item.Constructor?.name || "팀";
    const color = teamColors[name] || "#ff3548";

    return `
      <article class="team-card" style="--team-color:${color}">
        <div class="team-top">
          <span>POS ${escapeHtml(item.position || "—")}</span>
          <span>2026</span>
        </div>
        <strong style="color:${color}">
          ${escapeHtml(name)}
        </strong>
        <div class="team-score">
          ${escapeHtml(item.points || "0")}
          <span>PTS</span>
        </div>
      </article>
    `;
  }).join("");
}

/*
  F1.com 공식 결과 링크.
  링크를 통해 각 세션의 실제 결과를 확인한다.
*/
function renderLatestWeekend(race) {
  const container = $("#latest-results");
  if (!container) return;

  const slugMap = {
    "Australian Grand Prix": "australia",
    "Chinese Grand Prix": "china",
    "Japanese Grand Prix": "japan",
    "Bahrain Grand Prix": "bahrain",
    "Saudi Arabian Grand Prix": "saudi-arabia",
    "Miami Grand Prix": "miami",
    "Canadian Grand Prix": "canada",
    "Monaco Grand Prix": "monaco",
    "Spanish Grand Prix": "spain",
    "Austrian Grand Prix": "austria",
    "British Grand Prix": "great-britain",
    "Belgian Grand Prix": "belgium",
    "Hungarian Grand Prix": "hungary",
    "Dutch Grand Prix": "netherlands",
    "Italian Grand Prix": "italy",
    "Azerbaijan Grand Prix": "azerbaijan",
    "Singapore Grand Prix": "singapore",
    "United States Grand Prix": "united-states",
    "Mexico City Grand Prix": "mexico",
    "São Paulo Grand Prix": "brazil",
    "Brazilian Grand Prix": "brazil",
    "Las Vegas Grand Prix": "las-vegas",
    "Qatar Grand Prix": "qatar",
    "Abu Dhabi Grand Prix": "abu-dhabi"
  };

  const slug = slugMap[race.raceName];

  if (!slug) {
    container.innerHTML = `
      <div class="loading-cell">
        최신 레이스의 공식 결과 링크를 자동으로 찾지 못했습니다.
        <a href="https://www.formula1.com/en/results/2026/races"
           target="_blank" rel="noopener noreferrer">
          F1.com 전체 결과 보기 ↗
        </a>
      </div>`;
    return;
  }

  const base = `${F1_BASE}/${slug}`;

  const sessions = [
    { label: "Practice 1", category: "PRACTICE", path: "/practice/1" },
    { label: "Practice 2", category: "PRACTICE", path: "/practice/2" },
    { label: "Practice 3", category: "PRACTICE", path: "/practice/3" },
    { label: "Qualifying", category: "QUALIFYING", path: "/qualifying" },
    { label: "Race", category: "RACE", path: "/race-result" }
  ];

  container.innerHTML = `
    <div class="latest-weekend-header">
      <div>
        <p class="eyebrow">LATEST RACE WEEKEND</p>
        <h2>${escapeHtml(race.raceName)}</h2>
      </div>
      <div class="latest-weekend-info">
        <div>Round ${escapeHtml(race.round)}</div>
        <div>${escapeHtml(formatDate(race.date))}</div>
      </div>
    </div>

    <div class="latest-sessions">
      ${sessions.map(session => `
        <a class="latest-session-card"
           href="${base}${session.path}"
           target="_blank"
           rel="noopener noreferrer">
          <span class="latest-session-type">${session.category}</span>
          <span class="latest-session-name">${session.label}</span>
          <span class="latest-session-date">F1.com 공식 결과</span>
          <span class="latest-session-arrow">결과 보기 ↗</span>
        </a>
      `).join("")}
    </div>

    <p class="latest-results-source">
      공식 결과:
      <a href="https://www.formula1.com/en/results/2026/races"
         target="_blank" rel="noopener noreferrer">
        Formula1.com
      </a>
    </p>
  `;
}

async function loadDashboard() {
  const button = $("#refresh-button");

  if (button) {
    button.disabled = true;
    button.style.opacity = ".65";
  }

  setStatus("데이터 불러오는 중…");

  try {
    const results = await Promise.allSettled([
      getJson("/current.json?limit=100"),
      getJson("/current/driverStandings.json"),
      getJson("/current/constructorStandings.json")
    ]);

    let successCount = 0;

    const [scheduleResult, driversResult, teamsResult] = results;

    /* 일정 */
    if (scheduleResult.status === "fulfilled") {
      const races =
        scheduleResult.value?.MRData?.RaceTable?.Races || [];

      renderSchedule(races);

      const roundsValue = $("#rounds-value");
      if (roundsValue) roundsValue.textContent = races.length || "—";

      if (races.length) {
        successCount++;

        const today = new Date();

        const completedRaces = races.filter(race => {
          if (!race.date) return false;

          const date = new Date(`${race.date}T23:59:59Z`);
          return date <= today;
        });

        if (completedRaces.length) {
          renderLatestWeekend(
            completedRaces[completedRaces.length - 1]
          );
        } else {
          const container = $("#latest-results");
          if (container) {
            container.innerHTML = `
              <div class="loading-cell">
                아직 완료된 레이스가 없습니다.
                <a href="https://www.formula1.com/en/results/2026/races"
                   target="_blank" rel="noopener noreferrer">
                  F1.com에서 일정 확인 ↗
                </a>
              </div>`;
          }
        }
      }
    } else {
      const body = $("#schedule-body");
      if (body) {
        body.innerHTML = `
          <tr><td colspan="4" class="loading-cell">
            일정을 불러오지 못했습니다. 새로고침해 주세요.
          </td></tr>`;
      }
    }

    /* 드라이버 */
    if (driversResult.status === "fulfilled") {
      const standings =
        driversResult.value?.MRData?.StandingsTable?.StandingsLists || [];

      const drivers = standings[0]?.DriverStandings || [];

      renderDrivers(drivers);

      const value = $("#drivers-value");
      if (value) value.textContent = drivers.length || "—";

      if (drivers.length) successCount++;
    } else {
      const list = $("#drivers-list");
      if (list) {
        list.innerHTML = `
          <div class="loading-cell">
            드라이버 순위를 불러오지 못했습니다.
          </div>`;
      }
    }

    /* 팀 */
    if (teamsResult.status === "fulfilled") {
      const standings =
        teamsResult.value?.MRData?.StandingsTable?.StandingsLists || [];

      const teams = standings[0]?.ConstructorStandings || [];

      renderTeams(teams);

      const value = $("#teams-value");
      if (value) value.textContent = teams.length || "—";

      if (teams.length) successCount++;
    } else {
      const list = $("#teams-list");
      if (list) {
        list.innerHTML = `
          <div class="loading-cell">
            팀 순위를 불러오지 못했습니다.
          </div>`;
      }
    }

    if (successCount === 3) {
      setStatus("API 연결 완료");
    } else if (successCount > 0) {
      setStatus("일부 데이터만 연결됨", false);
    } else {
      setStatus("API 연결 실패", false);
    }

  } catch (error) {
    console.error("F1 데이터 오류:", error);
    setStatus("데이터를 불러오지 못했습니다.", false);
  } finally {
    if (button) {
      button.disabled = false;
      button.style.opacity = "1";
    }
  }
}

/* 메뉴 선택 표시 */
document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach(item => {
      item.classList.remove("active");
    });

    link.classList.add("active");
  });
});

/* 새로고침 버튼 */
const refreshButton = $("#refresh-button");

if (refreshButton) {
  refreshButton.addEventListener("click", loadDashboard);
}

/* 시작 */
loadDashboard();
