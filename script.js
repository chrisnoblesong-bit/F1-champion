const API_BASE = "https://api.jolpi.ca/ergast/f1";
const OPENF1_BASE = "https://api.openf1.org/v1";

const $ = (selector) => document.querySelector(selector);

const teamColors = {
  "McLaren": "#ff8700", "Ferrari": "#e8002d", "Red Bull": "#3671c6",
  "Mercedes": "#27f4d2", "Aston Martin": "#229971", "Alpine F1 Team": "#ff87bc",
  "Williams": "#64c4ff", "Racing Bulls": "#6692ff", "Haas F1 Team": "#b6babd",
  "Kick Sauber": "#52e252", "Audi": "#bb0000", "Cadillac": "#d6d6d6"
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function formatDate(dateString) {
  if (!dateString) return "날짜 미정";

  const date = new Date(dateString + "T12:00:00Z");

  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(date);
}

async function getJson(path) {
  const response = await fetch(API_BASE + path, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error("API 요청 실패 (" + response.status + ")");
  }

  return response.json();
}

async function getOpenF1(path) {
  const response = await fetch(OPENF1_BASE + path, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error("OpenF1 API 요청 실패 (" + response.status + ")");
  }

  return response.json();
}

function setStatus(message, good = true) {
  const status = $("#connection-status");

  if (!status) return;

  status.textContent = message;
  status.style.color = good ? "var(--green)" : "#ff7c88";
}


/* =========================
   기존 일정
========================= */

function renderSchedule(races) {
  const body = $("#schedule-body");

  if (!body) return;

  if (!races.length) {
    body.innerHTML =
      '<tr><td colspan="4" class="loading-cell">표시할 일정이 없습니다.</td></tr>';
    return;
  }

  body.innerHTML = races.map((race) => `
    <tr>
      <td>${escapeHtml(race.round)}</td>
      <td>${escapeHtml(race.raceName)}</td>
      <td>${escapeHtml(race.Circuit?.circuitName || "서킷 정보 없음")}</td>
      <td>${escapeHtml(formatDate(race.date))}</td>
    </tr>
  `).join("");
}


/* =========================
   기존 드라이버 순위
========================= */

function renderDrivers(drivers) {
  const list = $("#drivers-list");

  if (!list) return;

  if (!drivers.length) {
    list.innerHTML =
      '<div class="loading-cell">드라이버 순위가 없습니다.</div>';
    return;
  }

  list.innerHTML = drivers.slice(0, 5).map((item) => {
    const driver = item.Driver || {};

    const name = [
      driver.givenName,
      driver.familyName
    ].filter(Boolean).join(" ");

    const team =
      item.Constructors?.[0]?.name || "팀 정보 없음";

    return `
      <div class="leader-row">
        <span class="rank">
          ${escapeHtml(item.position || "—")}
        </span>

        <div class="leader-name">
          ${escapeHtml(name)}
          <span class="leader-team">
            ${escapeHtml(team)}
          </span>
        </div>

        <span class="points">
          ${escapeHtml(item.points || "0")}
          <small>PTS</small>
        </span>
      </div>
    `;
  }).join("");
}


/* =========================
   기존 팀 순위
========================= */

function renderTeams(teams) {
  const list = $("#teams-list");

  if (!list) return;

  if (!teams.length) {
    list.innerHTML =
      '<div class="loading-cell">팀 순위가 없습니다.</div>';
    return;
  }

  list.innerHTML = teams.map((item) => {
    const name = item.Constructor?.name || "팀";
    const color = teamColors[name] || "#ff3548";

    return `
      <article
        class="team-card"
        style="--team-color:${color}"
      >
        <div class="team-top">
          <span>POS ${escapeHtml(item.position || "—")}</span>
          <span>2026</span>
        </div>

        <strong>${escapeHtml(name)}</strong>

        <div class="team-score">
          ${escapeHtml(item.points || "0")}
          <span>PTS</span>
        </div>
      </article>
    `;
  }).join("");
}


/* =========================================================
   최신 F1 세션 데이터
   Race / Qualifying / Practice 1 / 2 / 3
========================================================= */

function sessionLabel(type) {
  switch (type) {
    case "Race":
      return "🏁 RACE";

    case "Qualifying":
      return "🟣 QUALIFYING";

    case "Practice 1":
      return "🔵 PRACTICE 1";

    case "Practice 2":
      return "🔵 PRACTICE 2";

    case "Practice 3":
      return "🔵 PRACTICE 3";

    default:
      return type;
  }
}


/* 최신 완료 세션들을 가져온다 */

async function getLatestSessions() {
  const sessions = await getOpenF1(
    "/sessions?year=2026"
  );

  if (!Array.isArray(sessions)) {
    throw new Error("세션 데이터 형식 오류");
  }

  const now = new Date();

  const completed = sessions
    .filter((session) => {
      if (!session.date_end) return false;

      return new Date(session.date_end) <= now;
    })
    .sort((a, b) => {
      return new Date(b.date_end) - new Date(a.date_end);
    });

  return completed;
}


/* 하나의 세션 결과를 가져온다 */

async function getSessionResults(sessionKey) {
  const data = await getOpenF1(
    "/session_result?session_key=" + encodeURIComponent(sessionKey)
  );

  return Array.isArray(data) ? data : [];
}


/* 드라이버 번호 */

function driverNumber(result) {
  if (result.driver_number !== undefined) {
    return result.driver_number;
  }

  return "";
}


/* 결과 하나의 HTML */

function renderSessionResult(result, position) {
  const name = [
    result.first_name,
    result.last_name
  ].filter(Boolean).join(" ");

  const team = result.team_name || "";

  return `
    <div class="latest-result-row">
      <span class="latest-result-position">
        ${escapeHtml(position)}
      </span>

      <div class="latest-result-driver">
        <strong>
          ${escapeHtml(name || "드라이버")}
        </strong>

        <small>
          ${escapeHtml(team)}
        </small>
      </div>

      <span class="latest-result-number">
        ${escapeHtml(driverNumber(result))}
      </span>
    </div>
  `;
}


/* 세션 하나 */

function renderLatestSession(session, results) {
  const rows = results
    .filter((item) => item.position !== null && item.position !== undefined)
    .sort((a, b) => Number(a.position) - Number(b.position))
    .slice(0, 10);

  if (!rows.length) {
    return `
      <article class="latest-session-card">
        <div class="latest-session-title">
          ${sessionLabel(session.session_name)}
        </div>

        <div class="loading-cell">
          결과가 아직 없습니다.
        </div>
      </article>
    `;
  }

  return `
    <article class="latest-session-card">

      <div class="latest-session-header">
        <div>
          <span class="latest-session-type">
            ${escapeHtml(sessionLabel(session.session_name))}
          </span>

          <h3>
            ${escapeHtml(session.session_name)}
          </h3>
        </div>

        <span class="latest-session-date">
          ${escapeHtml(
            new Intl.DateTimeFormat("ko-KR", {
              month: "short",
              day: "numeric"
            }).format(new Date(session.date_end))
          )}
        </span>
      </div>

      <div class="latest-results-list">

        ${rows.map((result) =>
          renderSessionResult(
            result,
            result.position
          )
        ).join("")}

      </div>

    </article>
  `;
}


/* =========================================================
   최신 경기 결과 화면
========================================================= */

async function loadLatestRaceWeekend() {

  const container = $("#latest-results");

  if (!container) {
    console.warn(
      "latest-results 요소가 index.html에 없습니다."
    );
    return;
  }

  container.innerHTML = `
    <div class="loading-cell">
      최신 F1 경기 결과를 불러오는 중…
    </div>
  `;

  try {

    const sessions = await getLatestSessions();

    /*
      가장 최근 Race를 찾는다.
    */

    const latestRace = sessions.find(
      (session) => session.session_name === "Race"
    );

    if (!latestRace) {
      container.innerHTML = `
        <div class="loading-cell">
          아직 완료된 레이스가 없습니다.
        </div>
      `;

      return;
    }


    /*
      같은 경기 주말의 Practice / Qualifying을 찾기 위해
      meeting_key를 사용한다.
    */

    const weekendSessions = sessions
      .filter(
        (session) =>
          session.meeting_key === latestRace.meeting_key
      )
      .filter((session) =>
        [
          "Practice 1",
          "Practice 2",
          "Practice 3",
          "Qualifying",
          "Race"
        ].includes(session.session_name)
      )
      .sort(
        (a, b) =>
          new Date(a.date_start) -
          new Date(b.date_start)
      );


    /*
      경기 이름 표시
    */

    const meetingName =
      latestRace.meeting_name ||
      "F1 Grand Prix";


    let html = `
      <div class="latest-weekend-header">

        <div>
          <p class="eyebrow">
            LATEST RACE WEEKEND
          </p>

          <h2>
            ${escapeHtml(meetingName)}
          </h2>
        </div>

        <span class="section-badge">
          최신 결과
        </span>

      </div>

      <div class="latest-sessions">
    `;


    /*
      각 세션의 결과를 가져온다.
    */

    for (const session of weekendSessions) {

      try {

        const results =
          await getSessionResults(
            session.session_key
          );

        html += renderLatestSession(
          session,
          results
        );

      } catch (error) {

        console.error(
          "세션 결과 오류:",
          session.session_name,
          error
        );

        html += `
          <article class="latest-session-card">

            <div class="latest-session-title">
              ${escapeHtml(
                sessionLabel(session.session_name)
              )}
            </div>

            <div class="loading-cell">
              이 세션의 결과를 불러오지 못했습니다.
            </div>

          </article>
        `;
      }
    }

    html += `
      </div>
    `;

    container.innerHTML = html;

  } catch (error) {

    console.error(
      "최신 경기 결과 오류:",
      error
    );

    container.innerHTML = `
      <div class="loading-cell">
        최신 경기 결과를 불러오지 못했습니다.
        <br>
        잠시 후 새로고침해 주세요.
      </div>
    `;
  }
}


/* =========================================================
   전체 대시보드
========================================================= */

async function loadDashboard() {

  const button = $("#refresh-button");

  if (button) {
    button.disabled = true;
    button.style.opacity = ".65";
  }

  setStatus("데이터 불러오는 중…");


  /*
    기존 Jolpica 데이터
  */

  const results = await Promise.allSettled([

    getJson("/current.json?limit=100"),

    getJson("/current/driverStandings.json"),

    getJson("/current/constructorStandings.json")

  ]);


  let successCount = 0;

  const [
    scheduleResult,
    driversResult,
    teamsResult
  ] = results;


  /*
    일정
  */

  if (scheduleResult.status === "fulfilled") {

    const races =
      scheduleResult.value?.MRData?.RaceTable?.Races || [];

    renderSchedule(races);

    const roundsValue = $("#rounds-value");

    if (roundsValue) {
      roundsValue.textContent =
        races.length || "—";
    }

    if (races.length) {
      successCount++;
    }

  } else {

    const body = $("#schedule-body");

    if (body) {
      body.innerHTML =
        '<tr><td colspan="4" class="loading-cell">일정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</td></tr>';
    }
  }


  /*
    드라이버 순위
  */

  if (driversResult.status === "fulfilled") {

    const lists =
      driversResult.value?.MRData?.StandingsTable?.StandingsLists || [];

    const drivers =
      lists[0]?.DriverStandings || [];

    renderDrivers(drivers);

    const driversValue =
      $("#drivers-value");

    if (driversValue) {
      driversValue.textContent =
        drivers.length || "—";
    }

    if (drivers.length) {
      successCount++;
    }

  } else {

    const list = $("#drivers-list");

    if (list) {
      list.innerHTML =
        '<div class="loading-cell">드라이버 순위를 불러오지 못했습니다.</div>';
    }
  }


  /*
    팀 순위
  */

  if (teamsResult.status === "fulfilled") {

    const lists =
      teamsResult.value?.MRData?.StandingsTable?.StandingsLists || [];

    const teams =
      lists[0]?.ConstructorStandings || [];

    renderTeams(teams);

    const teamsValue =
      $("#teams-value");

    if (teamsValue) {
      teamsValue.textContent =
        teams.length || "—";
    }

    if (teams.length) {
      successCount++;
    }

  } else {

    const list = $("#teams-list");

    if (list) {
      list.innerHTML =
        '<div class="loading-cell">팀 순위를 불러오지 못했습니다.</div>';
    }
  }


  /*
    최신 Race / Qualifying / Practice
  */

  await loadLatestRaceWeekend();


  /*
    API 상태
  */

  if (successCount === 3) {

    setStatus(
      "API 연결 완료"
    );

  } else if (successCount > 0) {

    setStatus(
      "일부 데이터만 연결됨",
      false
    );

  } else {

    setStatus(
      "API 연결 실패 · 새로고침을 눌러 주세요",
      false
    );
  }


  if (button) {
    button.disabled = false;
    button.style.opacity = "1";
  }
}


/* =========================================================
   버튼
========================================================= */

$("#refresh-button")?.addEventListener(
  "click",
  loadDashboard
);


/* =========================================================
   메뉴
========================================================= */

document.querySelectorAll(".nav-link")
  .forEach((link) => {

    link.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(".nav-link")
          .forEach((item) =>
            item.classList.remove("active")
          );

        link.classList.add("active");
      }
    );

  });


/* =========================================================
   시작
========================================================= */

loadDashboard();
