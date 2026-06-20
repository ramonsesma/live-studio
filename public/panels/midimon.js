// Panel rico: MIDI Monitor — log en vivo + estadísticas de tráfico.
window.LiveStudioPanels = window.LiveStudioPanels || {};
window.LiveStudioPanels.midimon = function (panel, helpers) {
  const exec = helpers.execute;
  panel.innerHTML = `
    <div class="panel-head"><h1>📟 MIDI Monitor</h1><p>Mensajes MIDI entrantes y estadísticas de tráfico.</p></div>
    <div class="ss-toolbar">
      <button class="btn" id="mn-refresh">↻ Refrescar</button>
      <button class="btn ghost" id="mn-clear">Limpiar log</button>
    </div>
    <div id="mn-stats" class="mn-stats"></div>
    <table class="mn-table"><thead><tr><th>Tiempo</th><th>Puerto</th><th>Tipo</th><th>Datos</th><th>Ch</th></tr></thead><tbody id="mn-log"></tbody></table>`;

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
        statCard("msg/min", d.messagesPerMinute) + statCard("pico", d.peakRate) +
        statCard("notas", d.totalNotes.toLocaleString()) + statCard("CC", d.totalCC.toLocaleString());
    }
  }
  panel.querySelector("#mn-refresh").onclick = refresh;
  panel.querySelector("#mn-clear").onclick = async () => { await exec("clear_log", {}); refresh(); };
  refresh();
};
