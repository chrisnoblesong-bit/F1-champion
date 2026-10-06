export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");

  try {
    const year = new Date().getUTCFullYear();
    const sessionsResponse = await fetch(
      `https://api.openf1.org/v1/sessions?year=${year}`
    );
    if (!sessionsResponse.ok) throw new Error("OpenF1 sessions request failed");

    const sessions = await sessionsResponse.json();
    const now = Date.now();

    const completedRaces = sessions
      .filter(session =>
        session.session_type === "Race" &&
        session.date_end &&
        new Date(session.date_end).getTime() <= now
      )
      .sort((a, b) => new Date(b.date_end) - new Date(a.date_end));

    if (!completedRaces.length) {
      return res.status(200).json({
        ok: true, source: "OpenF1",
        message: "No completed race found for this year yet.",
        race: null, sessions: []
      });
    }

    const latestRace = completedRaces[0];
    const weekendSessions = sessions
      .filter(session =>
        session.meeting_key === latestRace.meeting_key &&
        ["Practice 1", "Practice 2", "Practice 3", "Qualifying", "Race"].includes(session.session_name) &&
        session.date_end &&
        new Date(session.date_end).getTime() <= now
      )
      .sort((a, b) => new Date(a.date_start) - new Date(b.date_start));

    const resultSets = await Promise.all(weekendSessions.map(async session => {
      try {
        const [resultsResponse, driversResponse] = await Promise.all([
          fetch(`https://api.openf1.org/v1/session_result?session_key=${encodeURIComponent(session.session_key)}`),
          fetch(`https://api.openf1.org/v1/drivers?session_key=${encodeURIComponent(session.session_key)}`)
        ]);
        if (!resultsResponse.ok || !driversResponse.ok) {
          return { session_name: session.session_name, date_start: session.date_start, results: [] };
        }

        const [rows, drivers] = await Promise.all([
          resultsResponse.json(), driversResponse.json()
        ]);
        const driverMap = new Map(
          drivers.map(driver => [Number(driver.driver_number), driver])
        );

        const sorted = rows.slice().sort((a, b) =>
          (a.position ?? 999) - (b.position ?? 999)
        );

        return {
          session_name: session.session_name,
          date_start: session.date_start,
          results: sorted.map(row => {
            const driver = driverMap.get(Number(row.driver_number)) || {};
            return {
              position: row.position ?? null,
              driver_number: row.driver_number ?? null,
              full_name: driver.full_name || `Driver ${row.driver_number ?? ""}`,
              team_name: driver.team_name || "Team unavailable",
              team_colour: (driver.team_colour || "FFFFFF").replace("#", ""),
              points: row.points ?? null,
              duration: row.duration ?? null,
              gap_to_leader: row.gap_to_leader ?? null
            };
          })
        };
      } catch (error) {
        console.error(`OpenF1 session ${session.session_key} failed:`, error);
        return { session_name: session.session_name, date_start: session.date_start, results: [] };
      }
    }));

    return res.status(200).json({
      ok: true,
      source: "OpenF1",
      race: {
        meeting_key: latestRace.meeting_key,
        meeting_name: latestRace.meeting_name,
        date_start: latestRace.date_start,
        date_end: latestRace.date_end
      },
      sessions: resultSets
    });
  } catch (error) {
    console.error("Latest F1 results API error:", error);
    return res.status(502).json({
      ok: false,
      message: "Could not load latest F1 results. Please try again later."
    });
  }
}
