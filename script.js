const API_BASE = "https://api.jolpi.ca/ergast/f1";
const F1_OFFICIAL_BASE = "https://www.formula1.com/en/results/2026/races";

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
  "Haas F1 Team": "#b6babd",
  "Haas": "#b6babd",
  "Kick Sauber": "#52e252",
  "Audi": "#bb0000",
  "Cadillac": "#d6d6d6"
};


function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]
  );
}


function formatDate(dateString) {

  if (!dateString) {
    return "날짜 미정";
  }

  const date = new Date(
    dateString + "T12:00:00Z"
  );

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC"
    }
  ).format(date);
}


async function getJson(path) {

  const response = await fetch(
    API_BASE + path,
    {
      headers: {
        Accept: "application/json"
      }
    }
  );

  if (!response.ok) {
    throw new Error(
      "API 요청 실패 (" +
      response.status +
      ")"
    );
  }

  return response.json();
}


function setStatus(message, good = true) {

  const status = $("#connection-status");

  if (!status) {
    return;
  }

  status.textContent = message;

  status.style.color =
    good
      ? "var(--green)"
      : "#ff7c88";
}


/* =========================
   SCHEDULE
========================= */

function renderSchedule(races) {

  const body = $("#schedule-body");

  if (!body) {
    return;
  }

  if (!races.length) {

    body.innerHTML = `
      <tr>
        <td
          colspan="4"
          class="loading-cell"
        >
          표시할 일정이 없습니다.
        </td>
      </tr>
    `;

    return;
  }


  body.innerHTML = races
    .map(
      (race) => `
        <tr>

          <td>
            ${escapeHtml(race.round)}
          </td>

          <td>
            ${escapeHtml(race.raceName)}
          </td>

          <td>
            ${escapeHtml(
              race.Circuit?.circuitName ||
              "서킷 정보 없음"
            )}
          </td>

          <td>
            ${escapeHtml(
              formatDate(race.date)
            )}
          </td>

        </tr>
      `
    )
    .join("");
}


/* =========================
   DRIVER STANDINGS
========================= */

function renderDrivers(drivers) {

  const list = $("#drivers-list");

  if (!list) {
    return;
  }

  if (!drivers.length) {

    list.innerHTML = `
      <div class="loading-cell">
        드라이버 순위가 없습니다.
      </div>
    `;

    return;
  }


  list.innerHTML = drivers
    .slice(0, 5)
    .map(
      (item) => {

        const driver =
          item.Driver || {};

        const name =
          [
            driver.givenName,
            driver.familyName
          ]
            .filter(Boolean)
            .join(" ");

        const team =
          item.Constructors?.[0]?.name ||
          "팀 정보 없음";


        return `
          <div class="leader-row">

            <span class="rank">
              ${escapeHtml(
                item.position || "—"
              )}
            </span>

            <div class="leader-name">

              ${escapeHtml(name)}

              <span class="leader-team">
                ${escapeHtml(team)}
              </span>

            </div>

            <span class="points">

              ${escapeHtml(
                item.points || "0"
              )}

              <small>
                PTS
              </small>

            </span>

          </div>
        `;
      }
    )
    .join("");
}


/* =========================
   TEAM STANDINGS
========================= */

function renderTeams(teams) {

  const list = $("#teams-list");

  if (!list) {
    return;
  }

  if (!teams.length) {

    list.innerHTML = `
      <div class="loading-cell">
        팀 순위가 없습니다.
      </div>
    `;

    return;
  }


  list.innerHTML = teams
    .map(
      (item) => {

        const name =
          item.Constructor?.name ||
          "팀";

        const color =
          teamColors[name] ||
          "#ff3548";


        return `
          <article
            class="team-card"
            style="--team-color:${color}"
          >

            <div class="team-top">

              <span>
                POS
                ${escapeHtml(
                  item.position || "—"
                )}
              </span>

              <span>
                2026
              </span>

            </div>

            <strong>
              ${escapeHtml(name)}
            </strong>

            <div class="team-score">

              ${escapeHtml(
                item.points || "0"
              )}

              <span>
                PTS
              </span>

            </div>

          </article>
        `;
      }
    )
    .join("");
}


/* =========================
   F1.COM OFFICIAL LINKS
========================= */

/*
  F1.com의 결과 페이지 구조:

  /races/{raceId}/{raceSlug}/practice/1
  /races/{raceId}/{raceSlug}/practice/2
  /races/{raceId}/{raceSlug}/practice/3
  /races/{raceId}/{raceSlug}/qualifying
  /races/{raceId}/{raceSlug}/race-result

  실제 결과는 F1.com 공식 페이지에서 확인하도록
  연결한다.
*/


function createF1Url(
  raceId,
  raceSlug,
  session
) {

  const base =
    `${F1_OFFICIAL_BASE}/${raceId}/${raceSlug}`;

  switch (session) {

    case "practice1":
      return `${base}/practice/1`;

    case "practice2":
      return `${base}/practice/2`;

    case "practice3":
      return `${base}/practice/3`;

    case "qualifying":
      return `${base}/qualifying`;

    case "race":
      return `${base}/race-result`;

    default:
      return `${base}/race-result`;
  }
}


/* =========================
   LATEST WEEKEND
========================= */

function renderLatestWeekend(race) {

  const container =
    $("#latest-results");

  if (!container) {
    return;
  }


  const raceId =
    race.round
      ? Number(race.round) + 1268
      : null;


  /*
    2026 F1.com race ID는 시즌 중
    순차적으로 증가하지만 Jolpica round와
    완전히 동일한 ID 체계가 아니다.

    따라서 알려진 2026 라운드는
    공식 URL slug를 사용한다.
  */

  const raceMap = {

    "1": {
      id: 1279,
      slug: "australia"
    },

    "2": {
      id: 1280,
      slug: "china"
    },

    "3": {
      id: 1281,
      slug: "japan"
    },

    "4": {
      id: 1282,
      slug: "miami"
    },

    "5": {
      id: 1283,
      slug: "canada"
    },

    "6": {
      id: 1286,
      slug: "monaco"
    },

    "7": {
      id: 1287,
      slug: "barcelona"
    },

    "8": {
      id: 1288,
      slug: "austria"
    },

    "9": {
      id: 1289,
      slug: "great-britain"
    },

    "10": {
      id: 1290,
      slug: "belgium"
    },

    "11": {
      id: 1291,
      slug: "hungary"
    },

    "12": {
      id: 1292,
      slug: "netherlands"
    },

    "13": {
      id: 1293,
      slug: "italy"
    },

    "14": {
      id: 1294,
      slug: "spain"
    },

    "15": {
      id: 1295,
      slug: "azerbaijan"
    },

    "16": {
      id: 1308,
      slug: "bahrain"
    }

  };


  const officialRace =
    raceMap[String(race.round)];


  if (!officialRace) {

    container.innerHTML = `
      <div class="loading-cell">
        최신 F1.com 결과 페이지를 찾을 수 없습니다.
      </div>
    `;

    return;
  }


  const sessions = [

    {
      type: "PRACTICE",
      name: "Practice 1",
      key: "practice1"
    },

    {
      type: "PRACTICE",
      name: "Practice 2",
      key: "practice2"
    },

    {
      type: "PRACTICE",
      name: "Practice 3",
      key: "practice3"
    },

    {
      type: "QUALIFYING",
      name: "Qualifying",
      key: "qualifying"
    },

    {
      type: "RACE",
      name: "Race",
      key: "race"
    }

  ];


  container.innerHTML = `

    <div class="latest-weekend-header">

      <div>

        <p class="eyebrow">
          LATEST COMPLETED WEEKEND
        </p>

        <h2>
          ${escapeHtml(
            race.raceName
          )}
        </h2>

      </div>

      <div class="latest-weekend-info">

        <div>
          Round ${escapeHtml(
            race.round
          )}
        </div>

        <div>
          ${escapeHtml(
            formatDate(race.date)
          )}
        </div>

      </div>

    </div>


    <div class="latest-sessions">

      ${sessions
        .map(
          (session) => {

            const url =
              createF1Url(
                officialRace.id,
                officialRace.slug,
                session.key
              );


            return `

              <a
                class="latest-session-card"
                href="${url}"
                target="_blank"
                rel="noopener noreferrer"
              >

                <span class="latest-session-type">
                  ${escapeHtml(
                    session.type
                  )}
                </span>

                <span class="latest-session-name">
                  ${escapeHtml(
                    session.name
                  )}
                </span>

                <span class="latest-session-date">
                  F1.com 공식 결과
                </span>

                <span class="latest-session-arrow">
                  결과 보기 ↗
                </span>

              </a>

            `;
          }
        )
        .join("")}

    </div>


    <div class="latest-results-source">

      공식 데이터 및 세션 결과:
      <a
        href="https://www.formula1.com/en/results/2026/races"
        target="_blank"
        rel="noopener noreferrer"
      >
        Formula1.com
      </a>

    </div>

  `;
}


/* =========================
   MAIN DASHBOARD
========================= */

async function loadDashboard() {

  const button =
    $("#refresh-button");


  if (button) {

    button.disabled = true;
    button.style.opacity = ".65";

  }


  setStatus(
    "데이터 불러오는 중…"
  );


  const results =
    await Promise.allSettled([

      getJson(
        "/current.json?limit=100"
      ),

      getJson(
        "/current/driverStandings.json"
      ),

      getJson(
        "/current/constructorStandings.json"
      )

    ]);


  let successCount = 0;


  const [
    scheduleResult,
    driversResult,
    teamsResult
  ] = results;


  /* =========================
     SCHEDULE
  ========================== */

  if (
    scheduleResult.status ===
    "fulfilled"
  ) {

    const races =
      scheduleResult
        .value
        ?.MRData
        ?.RaceTable
        ?.Races || [];


    renderSchedule(races);


    const roundsValue =
      $("#rounds-value");

    if (roundsValue) {

      roundsValue.textContent =
        races.length || "—";

    }


    if (races.length) {

      successCount++;

      /*
        최신 완료 레이스는
        Race 결과가 존재하는 가장
        최근 라운드로 판단한다.
      */

      const today =
        new Date();


      const completedRaces =
        races.filter(
          (race) => {

            if (!race.date) {
              return false;
            }

            const raceDate =
              new Date(
                race.date +
                "T23:59:59Z"
              );

            return raceDate <= today;

          }
        );


      if (completedRaces.length) {

        const latestRace =
          completedRaces[
            completedRaces.length - 1
          ];

        renderLatestWeekend(
          latestRace
        );

      }

    }

  } else {

    const body =
      $("#schedule-body");

    if (body) {

      body.innerHTML = `
        <tr>
          <td
            colspan="4"
            class="loading-cell"
          >
            일정을 불러오지 못했습니다.
          </td>
        </tr>
      `;

    }

  }


  /* =========================
     DRIVERS
  ========================== */

  if (
    driversResult.status ===
    "fulfilled"
  ) {

    const lists =
      driversResult
        .value
        ?.MRData
        ?.StandingsTable
        ?.StandingsLists || [];


    const drivers =
      lists[0]
        ?.DriverStandings || [];


    renderDrivers(
      drivers
    );


    const value =
      $("#drivers-value");

    if (value) {

      value.textContent =
        drivers.length || "—";

    }


    if (drivers.length) {
      successCount++;
    }

  } else {

    const list =
      $("#drivers-list");

    if (list) {

      list.innerHTML = `
        <div class="loading-cell">
          드라이버 순위를 불러오지 못했습니다.
        </div>
      `;

    }

  }


  /* =========================
     TEAMS
  ========================== */

  if (
    teamsResult.status ===
    "fulfilled"
  ) {

    const lists =
      teamsResult
        .value
        ?.MRData
        ?.StandingsTable
        ?.StandingsLists || [];


    const teams =
      lists[0]
        ?.ConstructorStandings || [];


    renderTeams(
      teams
    );


    const value =
      $("#teams-value");

    if (value) {

      value.textContent =
        teams.length || "—";

    }


    if (teams.length) {
      successCount++;
    }

  } else {

    const list =
      $("#teams-list");

    if (list) {

      list.innerHTML = `
        <div class="loading-cell">
          팀 순위를 불러오지 못했습니다.
        </div>
      `;

    }

  }


  /* =========================
     STATUS
  ========================== */

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
      "API 연결 실패",
      false
    );

  }


  if (button) {

    button.disabled = false;
    button.style.opacity = "1";

  }

}


/* =========================
   NAVIGATION
========================= */

document
  .querySelectorAll(".nav-link")
  .forEach(
    (link) => {

      link.addEventListener(
        "click",
        () => {

          document
            .querySelectorAll(
              ".nav-link"
            )
            .forEach(
              (item) => {

                item.classList.remove(
                  "active"
                );

              }
            );


          link.classList.add(
            "active"
          );

        }
      );

    }
  );


/* =========================
   REFRESH BUTTON
========================= */

const refreshButton =
  $("#refresh-button");


if (refreshButton) {

  refreshButton.addEventListener(
    "click",
    loadDashboard
  );

}


/* =========================
   START
========================= */

loadDashboard();
