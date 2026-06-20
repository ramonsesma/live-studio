// Rich panel: MIDI Monitor — live log + traffic stats.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.midimon = function (panel, helpers) {
  const exec = helpers.execute;
  panel.innerHTML = `
    <div class="panel-head"><h1>📟 MIDI Monitor</h1><p>Incoming MIDI messages and traffic stats.</p></div>
    <div class="ss-toolbar">
      <button class="btn" id="mn-refresh">↻ Refresh</button>
      <button class="btn ghost" id="mn-clear">Clear log</button>
    </div>
    <div id="mn-stats" class="mn-stats"></div>
    <table class="mn-table"><thead><tr><th>Time</th><th>Port</th><th>Type</th><th>Data</th><th>Ch</th></tr></thead><tbody id="mn-log"></tbody></table>`;

  function statCard(label, val) { return `<div class="mn-stat"><div class="mn-stat-v">${val}</div><div class="hint">${label}</div></div>`; }

  async function refresh() {
    const log = await exec("get_midi_log", { count: 20 });
    const tbody = panel.querySelector("#mn-log");
    tbody.innerHTML = "";
    if (log.success) for (const m of log.data.messages) {
      const tr = document.createElement("tr");
      tr.className = "mn-" + m.type.replace(/\s/g, "").toLowerCase();
      tr.innerHTML = `<td class="hint">${m.time}</td><td>${m.port}</td><td>${m.type}</td><td class="mono">${m.data}</td><td>${m.channel}</td>`;
      tbody.appendChild(tr);
    }
    const st = await exec("get_stats", {});
    if (st.success) {
      const d = st.data;
      panel.querySelector("#mn-stats").innerHTML =
        statCard("msg/min", d.messagesPerMinute) + statCard("peak", d.peakRate) +
        statCard("notes", d.totalNotes.toLocaleString()) + statCard("CC", d.totalCC.toLocaleString());
    }
  }
  panel.querySelector("#mn-refresh").onclick = refresh;
  panel.querySelector("#mn-clear").onclick = async () => { await exec("clear_log", {}); refresh(); };
  refresh();
};
