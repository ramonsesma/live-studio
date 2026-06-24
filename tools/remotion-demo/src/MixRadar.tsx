import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Easing } from "remotion";

const FONT = '-apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif';
const NB = 30;
const TRACKS = [
  { name: "Kick", color: "#e8a13a" },
  { name: "Bass", color: "#4a90d9" },
  { name: "Rhodes", color: "#b56fd4" },
  { name: "Vocal", color: "#e85d8a" },
  { name: "Hats", color: "#d4c84a" },
  { name: "Pad", color: "#5ec4a8" },
];
const SCENES = ["Intro", "Verse", "Chorus", "Drop", "Break"];

const bell = (c: number, w: number, a: number, x: number) => a * Math.exp(-Math.pow((x - c) / w, 2));
function energy(t: number, x: number) {
  if (t === 0) return bell(0.06, 0.07, 1, x) + bell(0.18, 0.05, 0.4, x);
  if (t === 1) return bell(0.12, 0.09, 0.92, x) + bell(0.3, 0.1, 0.7, x);
  if (t === 2) return bell(0.34, 0.13, 0.85, x) + bell(0.55, 0.1, 0.5, x);
  if (t === 3) return bell(0.42, 0.1, 0.8, x) + bell(0.66, 0.12, 0.72, x);
  if (t === 4) return bell(0.86, 0.1, 0.92, x) + bell(0.7, 0.1, 0.5, x);
  return bell(0.4, 0.3, 0.62, x) + bell(0.75, 0.25, 0.46, x);
}
const SPEC = TRACKS.map((_, t) => Array.from({ length: NB }, (_, b) => Math.min(1, energy(t, b / (NB - 1)))));
const COLL = Array.from({ length: NB }, (_, b) => {
  const hot = SPEC.map((s, t) => (s[b] > 0.6 ? t : -1)).filter((t) => t >= 0);
  return hot.length >= 2 ? hot : [];
});
function cell(v: number) {
  if (v < 0.05) return "rgb(22,26,38)";
  if (v < 0.45) { const k = v / 0.45; return `rgb(${35 + k * 73},${64 + k * 134},${107 + k * 148})`; }
  if (v < 0.72) { const k = (v - 0.45) / 0.27; return `rgb(${108 + k * 147},${198 - k * 19},${255 - k * 184})`; }
  const k = (v - 0.72) / 0.28; return `rgb(255,${179 - k * 60},${71 - k * 30})`;
}

// ---------- Ableton Session View backdrop ----------
const Ableton: React.FC<{ frame: number }> = ({ frame }) => {
  const meter = (i: number) => 0.35 + 0.3 * Math.abs(Math.sin(frame * 0.18 + i * 1.3)) + 0.15 * Math.abs(Math.sin(frame * 0.07 + i));
  const browser = ["Sounds", "Drums", "Instruments", "Audio Effects", "MIDI Effects", "Max for Live", "Plug-ins", "Clips", "Samples"];
  const clipFill = [
    [1, 1, 1, 1, 1, 1], [1, 1, 0, 1, 1, 0], [0, 1, 1, 1, 0, 1], [1, 0, 1, 0, 1, 1], [0, 1, 0, 1, 1, 0],
  ];
  return (
    <AbsoluteFill style={{ background: "#1c1c1c", fontFamily: FONT, color: "#c6c6c6" }}>
      {/* transport bar */}
      <div style={{ height: 44, background: "#2a2a2a", borderBottom: "1px solid #0e0e0e", display: "flex", alignItems: "center", padding: "0 14px", gap: 14, fontSize: 12 }}>
        <div style={{ width: 16, height: 16, borderRadius: 3, background: "#f2b33a" }} />
        <span style={{ color: "#9a9a9a" }}>TAP</span>
        <div style={{ background: "#1e1e1e", border: "1px solid #111", borderRadius: 3, padding: "3px 8px", color: "#e6e6e6", fontVariantNumeric: "tabular-nums" }}>124.00</div>
        <span style={{ color: "#9a9a9a" }}>4 / 4</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ width: 0, height: 0, borderLeft: "11px solid #6fcf6f", borderTop: "7px solid transparent", borderBottom: "7px solid transparent" }} />
          <div style={{ width: 12, height: 12, background: "#9a9a9a" }} />
          <div style={{ width: 12, height: 12, borderRadius: 6, background: "#e0504e" }} />
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ color: "#9a9a9a" }}>1 Bar</span>
        <span style={{ color: "#9a9a9a" }}>A min</span>
        <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 14 }}>
          {[0, 1, 2, 3, 4].map((i) => <div key={i} style={{ width: 3, height: 4 + ((frame + i * 3) % 11), background: "#6fcf6f" }} />)}
        </div>
      </div>
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* browser */}
        <div style={{ width: 184, background: "#242424", borderRight: "1px solid #0e0e0e", padding: "8px 0", fontSize: 12.5 }}>
          {browser.map((b, i) => (
            <div key={b} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", color: i === 1 ? "#e6e6e6" : "#a9a9a9", background: i === 1 ? "#323232" : "transparent" }}>
              <div style={{ width: 7, height: 7, borderRadius: 2, background: ["#d9a23a", "#e8a13a", "#7fb1e0", "#cf6f6f", "#9a9a9a", "#6fcf9a", "#b08fd0", "#d4c84a", "#7fd0c0"][i] }} />
              {b}
            </div>
          ))}
        </div>
        {/* session grid */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* track headers */}
          <div style={{ display: "flex", height: 26, background: "#222", borderBottom: "1px solid #0e0e0e" }}>
            {TRACKS.map((t) => (
              <div key={t.name} style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, padding: "0 10px", borderRight: "1px solid #161616", fontSize: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, border: `2px solid ${t.color}` }} />
                <span style={{ color: "#d2d2d2", overflow: "hidden", whiteSpace: "nowrap" }}>{t.name}</span>
              </div>
            ))}
            <div style={{ width: 132, padding: "0 10px", display: "flex", alignItems: "center", color: "#8a8a8a", fontSize: 12 }}>Master</div>
          </div>
          {/* clip rows */}
          {clipFill.map((row, r) => (
            <div key={r} style={{ display: "flex", height: 34, borderBottom: "1px solid #1a1a1a" }}>
              {row.map((on, c) => (
                <div key={c} style={{ flex: 1, borderRight: "1px solid #161616", padding: 3 }}>
                  <div style={{ height: "100%", borderRadius: 4, background: on ? TRACKS[c].color : "#262626", opacity: on ? 0.9 : 1, display: "flex", alignItems: "center", padding: "0 8px", border: on ? "none" : "1px solid #2e2e2e" }}>
                    {on ? (
                      r === 0
                        ? <div style={{ width: 0, height: 0, borderLeft: "8px solid rgba(20,20,20,.8)", borderTop: "5px solid transparent", borderBottom: "5px solid transparent" }} />
                        : <div style={{ width: 8, height: 8, background: "rgba(20,20,20,.7)", borderRadius: 1 }} />
                    ) : <div style={{ width: 7, height: 7, border: "1px solid #4a4a4a", borderRadius: 1 }} />}
                  </div>
                </div>
              ))}
              <div style={{ width: 132, padding: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 0, height: 0, borderLeft: "8px solid #7a7a7a", borderTop: "5px solid transparent", borderBottom: "5px solid transparent" }} />
                <span style={{ fontSize: 11.5, color: "#9a9a9a" }}>{SCENES[r]}</span>
              </div>
            </div>
          ))}
          <div style={{ flex: 1 }} />
          {/* mixer strip */}
          <div style={{ display: "flex", height: 96, background: "#212121", borderTop: "1px solid #0e0e0e" }}>
            {TRACKS.map((t, i) => (
              <div key={t.name} style={{ flex: 1, borderRight: "1px solid #161616", padding: 8, display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{ flex: 1, height: 70, background: "#1a1a1a", borderRadius: 3, position: "relative" }}>
                  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${meter(i) * 100}%`, background: meter(i) > 0.8 ? "#e0504e" : t.color, borderRadius: 3, opacity: 0.85 }} />
                </div>
                <div style={{ width: 6, height: 70, background: "#1a1a1a", borderRadius: 3, position: "relative" }}>
                  <div style={{ position: "absolute", left: -2, width: 10, height: 7, borderRadius: 2, background: "#9a9a9a", bottom: `${30 + i * 7}%` }} />
                </div>
              </div>
            ))}
            <div style={{ width: 132 }} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- Live Studio modal: Mix Radar ----------
const MixRadarPanel: React.FC<{ frame: number }> = ({ frame }) => {
  const listen = interpolate(frame, [30, 54], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sweep = interpolate(frame, [50, 112], [0, NB], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const movesIn = interpolate(frame, [116, 138], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const carve = interpolate(frame, [150, 178], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const pulse = 0.5 + 0.5 * Math.sin(frame * 0.45);
  const info = frame < 30 ? "Press Listen to render & analyze the stems"
    : frame < 54 ? "Rendering stems → FFT in host…"
    : frame < 112 ? "Analyzing spectra…"
    : "6 stems analyzed · 4 masking collisions";

  const ring = 2 * Math.PI * 9;
  const moves = [
    { a: "#e24b4a", t: "Bass vs Kick @ 95 Hz", d: "carve EQ −3.5 dB" },
    { a: "#ffb347", t: "Rhodes vs Vocal @ 1.1 kHz", d: "−2.5 dB Rhodes" },
    { a: "#c792ea", t: "Pad masks everything", d: "HPF 180 Hz" },
  ];
  const ROWH = 32, GW = 470;

  return (
    <div style={{ width: 940, background: "#161619", borderRadius: 12, border: "1px solid #38383f", boxShadow: "0 30px 80px rgba(0,0,0,.6)", overflow: "hidden", fontFamily: FONT }}>
      {/* title bar */}
      <div style={{ height: 40, background: "#202024", display: "flex", alignItems: "center", padding: "0 14px", gap: 8, borderBottom: "1px solid #2e2e34" }}>
        <div style={{ display: "flex", gap: 7 }}>{["#ff5f57", "#febc2e", "#28c840"].map((c) => <div key={c} style={{ width: 11, height: 11, borderRadius: 6, background: c }} />)}</div>
        <div style={{ flex: 1, textAlign: "center", color: "#c9c9d0", fontSize: 13 }}>Live Studio — Resonance · Mix Radar</div>
        <div style={{ width: 44 }} />
      </div>
      <div style={{ padding: 16 }}>
        {/* toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: listen > 0 && listen < 1 ? "#2a2a30" : "#ffb347", color: listen > 0 && listen < 1 ? "#e8e8ea" : "#1a1a1e", padding: "7px 14px", borderRadius: 7, fontSize: 14, fontWeight: 500 }}>
            <svg width="18" height="18" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="9" fill="none" stroke="rgba(0,0,0,.25)" strokeWidth="3.5" />
              {listen > 0 && listen < 1 && <circle cx="18" cy="18" r="9" fill="none" stroke="#ffb347" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={ring} strokeDashoffset={ring * (1 - listen)} transform="rotate(-90 18 18)" />}
            </svg>
            Listen
          </div>
          <div style={{ fontSize: 12, color: "#6cc6ff", border: "1px solid #2f3a46", borderRadius: 14, padding: "3px 10px" }}>key: A minor</div>
          <div style={{ fontSize: 12.5, color: "#9a9aa2" }}>{info}</div>
        </div>
        {/* grid: rail | heatmap | moves */}
        <div style={{ display: "grid", gridTemplateColumns: `120px ${GW}px 1fr`, gap: 12 }}>
          {/* rail */}
          <div style={{ paddingTop: 4 }}>
            {TRACKS.map((t, i) => {
              const lvl = Math.min(1, (SPEC[i].reduce((a, b) => a + b, 0) / NB) * 2.4) * Math.min(1, sweep / NB);
              return (
                <div key={t.name} style={{ height: ROWH, display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                  <span style={{ color: "#e8e8ea", fontSize: 12.5 }}>{t.name}</span>
                  <div style={{ width: 30, height: 7, background: "#202026", border: "1px solid #34343b", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${lvl * 100}%`, background: lvl > 0.85 ? "#e24b4a" : lvl > 0.6 ? "#ffb347" : "#5ad17a" }} />
                  </div>
                </div>
              );
            })}
          </div>
          {/* heatmap */}
          <div style={{ background: "#13131a", border: "1px solid #38383f", borderRadius: 10, padding: "6px 0 18px", position: "relative" }}>
            {TRACKS.map((_, t) => (
              <div key={t} style={{ height: ROWH, display: "flex", padding: "0 6px", alignItems: "center" }}>
                {SPEC[t].map((v, b) => {
                  let bg = "rgb(20,22,32)";
                  if (b <= sweep) {
                    const isC = COLL[b].includes(t);
                    if (isC) {
                      const loud = COLL[b].slice().sort((p, q) => SPEC[q][b] - SPEC[p][b])[0];
                      if (t === loud && carve > 0) bg = cell(v * (1 - 0.55 * carve));
                      else bg = `rgb(${150 + pulse * 76},${40 + pulse * 35},${40 + pulse * 34})`;
                    } else bg = cell(v);
                  }
                  return <div key={b} style={{ flex: 1, height: ROWH - 6, margin: "0 0.8px", borderRadius: 2, background: bg, boxShadow: b <= sweep && COLL[b].includes(t) && !(COLL[b].slice().sort((p, q) => SPEC[q][b] - SPEC[p][b])[0] === t && carve > 0.5) ? "0 0 6px rgba(226,75,74,.7)" : "none" }} />;
                })}
              </div>
            ))}
            {sweep < NB && (
              <div style={{ position: "absolute", top: 6, bottom: 18, left: `calc(6px + ${(sweep / NB) * 100}% )`, width: 2, background: "#6cc6ff", boxShadow: "0 0 8px #6cc6ff" }} />
            )}
            <div style={{ position: "absolute", bottom: 3, left: 8, right: 8, display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6c6c76" }}>
              {["20", "100", "500", "1k", "4k", "12k"].map((l) => <span key={l}>{l}</span>)}
            </div>
          </div>
          {/* moves */}
          <div style={{ opacity: movesIn, transform: `translateX(${(1 - movesIn) * 16}px)` }}>
            <div style={{ fontSize: 12, color: "#9a9aa2", margin: "2px 0 6px" }}>Proposed moves</div>
            {moves.map((m, i) => {
              const applied = i === 0 && carve > 0.6;
              return (
                <div key={i} style={{ border: "1px solid #2f2f36", borderLeft: `3px solid ${m.a}`, borderRadius: 8, padding: "7px 9px", marginBottom: 7 }}>
                  <div style={{ color: "#e8e8ea", fontSize: 12 }}>{m.t}</div>
                  <div style={{ color: "#9a9aa2", fontSize: 11, margin: "3px 0 6px" }}>{m.d}</div>
                  <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 5, background: applied ? "#5ad17a" : "#ffb347", color: "#1a1a1e" }}>{applied ? "✓ applied" : "Apply"}</span>
                </div>
              );
            })}
          </div>
        </div>
        {/* energy lane */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: "#9a9aa2", marginBottom: 4 }}>Arrangement energy</div>
          <div style={{ display: "flex", height: 26, gap: 3 }}>
            {[["Intro", 0.25, 10], ["Verse", 0.5, 22], ["Chorus", 0.95, 24], ["Break", 0.3, 10], ["Chorus", 1, 24], ["Outro", 0.2, 10]].map((s, i) => {
              const e = s[1] as number;
              return <div key={i} style={{ flex: s[2] as number, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, color: "#10101a", background: `rgb(${60 + e * 195},${200 - e * 120},${160 - e * 120})` }}>{s[0]}</div>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export const MixRadar: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 14, fps, config: { damping: 16, mass: 0.7 } });
  const dim = interpolate(frame, [14, 28], [0, 0.55], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "#101010" }}>
      <Ableton frame={frame} />
      <AbsoluteFill style={{ background: `rgba(8,8,10,${dim})` }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ opacity: enter, transform: `translateY(${(1 - enter) * 36}px) scale(${0.94 + enter * 0.06})` }}>
          <MixRadarPanel frame={frame} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
