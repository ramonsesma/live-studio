// Custom hand-drawn line icons, one per module — replaces the generic emoji set.
// 24×24 viewBox, stroke = currentColor; the sidebar tints each by its module color.
window.LiveStudioIcons = (function () {
  const I = {
    session: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    clips: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    templates: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/>',
    notes: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    organizer: '<path d="M4 6h16M4 12h10M4 18h6"/><path d="M16 15l3 3 3-3"/>',
    snapshots: '<rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8 7l1.5-2h5L16 7"/>',
    setlist: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    health: '<path d="M6 4v5a4 4 0 0 0 8 0V4"/><path d="M10 13v2a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="11" r="2"/>',
    trackmanager: '<rect x="3" y="5" width="18" height="4" rx="1"/><rect x="3" y="11" width="18" height="4" rx="1"/><rect x="3" y="17" width="18" height="4" rx="1"/><path d="M6 13l1 1 2-2"/>',
    projectsnapshot: '<circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 8v8M8 6h6a4 4 0 0 1 4 4"/>',
    clipversions: '<circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 8v8M6 14h6a4 4 0 0 0 4-4"/>',
    setlistx: '',

    chords: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 6v8M11 6v8M15 6v8"/>',
    melody: '<circle cx="7" cy="16" r="2.5"/><path d="M9.5 16V5"/><path d="M9.5 7c4-2 7 1 11-1"/>',
    lyricmelody: '<path d="M4 18l3-9 3 9M5 15h4"/><path d="M14 18V8l5-1"/><circle cx="13" cy="18" r="1.6"/>',
    harmonizer: '<path d="M9 18V6l9-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="15.5" cy="16" r="2.5"/><path d="M9 9l9-2"/>',
    miditransform: '<path d="M4 8h12l-3-3M20 16H8l3 3"/>',
    randomizer: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2"/><circle cx="15" cy="9" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="9" cy="15" r="1.2"/><circle cx="15" cy="15" r="1.2"/>',
    midigate: '<path d="M3 16h3v-8h3v8h3v-8h3v8h3"/>',
    midilfo: '<path d="M3 12c2-6 4 6 6 0s4-6 6 0 4 6 6 0"/>',
    chordpads: '<rect x="4" y="4" width="7" height="7" rx="1.5" fill="currentColor" opacity=".25"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5" fill="currentColor" opacity=".25"/>',
    stepseq: '<rect x="3" y="9" width="3.5" height="6" rx="1" fill="currentColor" opacity=".25"/><rect x="8" y="9" width="3.5" height="6" rx="1"/><rect x="13" y="9" width="3.5" height="6" rx="1" fill="currentColor" opacity=".25"/><rect x="18" y="9" width="3" height="6" rx="1"/>',
    quantizer: '<path d="M3 7h18M3 12h18M3 17h18M8 3v18M14 3v18"/>',
    groove: '<path d="M3 12h4l2-5 3 10 2-5h7"/>',
    groovetemplate: '<path d="M3 12h3l2-5 3 10 2-5h3"/><path d="M19 7v10"/>',
    notation: '<path d="M3 7h18M3 11h18M3 15h18"/><circle cx="9" cy="15" r="2"/><path d="M11 15V6"/>',
    genrhythm: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2"/><circle cx="15" cy="15" r="1.2"/><circle cx="9" cy="15" r="1.2"/><circle cx="15" cy="9" r="1.2"/>',
    scoreeditor: '<path d="M3 7h18M3 12h18M3 17h18"/><path d="M14 4c-3 0-3 4 0 4s2 8-2 8"/>',
    clipvariations: '<rect x="3" y="9" width="6" height="6" rx="1.5"/><rect x="15" y="3" width="6" height="6" rx="1.5"/><rect x="15" y="15" width="6" height="6" rx="1.5"/><path d="M9 12h3V6h3M12 12v6h3"/>',
    probabilitylab: '<path d="M9 3v6l-4 8a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-4-8V3"/><path d="M8 3h8M7.5 14h9"/>',
    phrasefinder: '<circle cx="10" cy="10" r="6"/><path d="M14.5 14.5L20 20"/><path d="M8 12V7l4-1"/><circle cx="7" cy="12" r="1.2"/>',
    keyscale: '<circle cx="8" cy="8" r="4"/><path d="M11 11l8 8M16 16l2-2M14 14l2-2"/>',

    drums: '<ellipse cx="12" cy="8" rx="8" ry="3"/><path d="M4 8v6c0 1.6 3.6 3 8 3s8-1.4 8-3V8"/><path d="M9 12l-3 6M15 12l3 6"/>',
    drumreplace: '<ellipse cx="11" cy="9" rx="7" ry="2.5"/><path d="M4 9v5c0 1.4 3.1 2.5 7 2.5"/><path d="M17 4l3 0 0 3M20 4l-4 4"/>',
    drummap: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="3" y="13" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><path d="M14 17h6m-3-3l3 3-3 3"/>',
    drumbus: '<path d="M4 8h5M4 16h5M15 8h5M15 16h5"/><rect x="9" y="6" width="6" height="12" rx="2"/>',

    eq: '<path d="M6 4v16M12 4v16M18 4v16"/><circle cx="6" cy="9" r="2"/><circle cx="12" cy="14" r="2"/><circle cx="18" cy="7" r="2"/>',
    compressor: '<path d="M4 8h16M4 16h16M8 4l4 3 4-3M8 20l4-3 4 3"/>',
    mixassistant: '<path d="M5 19L16 8M14 6l4 4"/><path d="M18 3l.7 1.6L20 5l-1.3.4L18 7l-.7-1.6L16 5z"/>',
    mixconsole: '<path d="M6 4v16M12 4v16M18 4v16"/><rect x="4" y="13" width="4" height="3" rx="1" fill="currentColor"/><rect x="10" y="8" width="4" height="3" rx="1" fill="currentColor"/><rect x="16" y="11" width="4" height="3" rx="1" fill="currentColor"/>',
    mixscene: '<path d="M6 5v14M12 5v14M18 5v14"/><circle cx="6" cy="14" r="2"/><circle cx="12" cy="9" r="2"/><circle cx="18" cy="12" r="2"/>',
    fxchain: '<path d="M9 12a3 3 0 0 1 3-3h2a3 3 0 0 1 0 6M15 12a3 3 0 0 1-3 3h-2a3 3 0 0 1 0-6"/>',
    fxpresets: '<path d="M7 4h10v16l-5-3-5 3z"/><path d="M5 7v13l5-3"/>',
    macros: '<circle cx="7" cy="8" r="3"/><circle cx="17" cy="8" r="3"/><circle cx="7" cy="17" r="3"/><circle cx="17" cy="17" r="3"/><path d="M7 6v2M17 6v2M7 15v2M17 15v2"/>',
    rackbuilder: '<rect x="4" y="4" width="16" height="5" rx="1.5"/><rect x="4" y="11" width="16" height="5" rx="1.5"/><path d="M8 18h8"/>',
    macromorph: '<circle cx="7" cy="8" r="3"/><circle cx="17" cy="8" r="3"/><path d="M7 6v2M17 6v2M4 17h16"/><circle cx="11" cy="17" r="2" fill="currentColor"/>',
    saferandom: '<rect x="4" y="4" width="13" height="13" rx="3"/><circle cx="8" cy="8" r="1.2"/><circle cx="13" cy="13" r="1.2"/><rect x="15" y="14" width="6" height="5" rx="1"/><path d="M16.5 14v-1.5a1.5 1.5 0 0 1 3 0V14"/>',
    paramdiff: '<path d="M4 18v-6M8 18v-9M12 18v-4"/><circle cx="17" cy="9" r="4"/><path d="M20 12l2 2"/>',
    mastering: '<path d="M3 20h18"/><rect x="5" y="13" width="3" height="7"/><rect x="10.5" y="8" width="3" height="12"/><rect x="16" y="11" width="3" height="9"/>',
    autogain: '<path d="M3 20h18"/><path d="M6 20V9M11 20V5M16 20v-7"/><circle cx="6" cy="9" r="1.5"/><circle cx="11" cy="5" r="1.5"/><circle cx="16" cy="13" r="1.5"/>',

    resonance: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><path d="M12 12l6-3"/>',
    spectrumcompare: '<path d="M3 15c3-7 6 3 9-2s6-6 9-2"/><path d="M3 18c3-5 6 4 9-1s6-5 9-1" opacity=".5"/>',
    texturemap: '<path d="M3 18v-3M7 18v-7M11 18v-10M15 18V8"/><circle cx="19" cy="9" r="2"/><path d="M21 9V4"/>',
    stemalign: '<path d="M5 7h8M5 12h12M5 17h6"/><path d="M18 4v16"/>',
    samplebrain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5 3 3 0 0 0 2 4 3 3 0 0 0 4 1V4z"/><path d="M11 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5 3 3 0 0 1-2 4 3 3 0 0 1-4 1"/>',
    warpcompare: '<path d="M5 16l3-8 3 8M5.8 13h4.4"/><path d="M15 8h3a2 2 0 0 1 0 4h-3zM15 12h3.5a2 2 0 0 1 0 4H15z"/>',
    loopdetect: '<path d="M7 8a6 5 0 1 1-1 6"/><path d="M7 4v4h4"/>',
    velocompress: '<path d="M3 20h18"/><rect x="5" y="13" width="3" height="7" rx="1"/><rect x="10.5" y="9" width="3" height="11" rx="1"/><rect x="16" y="15" width="3" height="5" rx="1"/><path d="M4 7h16" stroke-dasharray="2 2"/>',
    transposer: '<path d="M7 21V7m-4 4 4-4 4 4"/><path d="M17 3v14m4-4-4 4-4-4"/>',
    colortheory: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3.5 7.5l17 9M3.5 16.5l17-9"/><circle cx="12" cy="12" r="2" fill="currentColor"/>',
    takeorganizer: '<rect x="3" y="5" width="13" height="3.5" rx="1.5"/><rect x="3" y="10.5" width="10" height="3.5" rx="1.5"/><rect x="3" y="16" width="12" height="3.5" rx="1.5"/><path d="M19 4.5l1.8 1.8-4.5 4.5-1.8-1.8z"/>',
    audio2midi: '<path d="M3 13v-2M6 15V9M9 12v-1"/><path d="M11 12h3"/><path d="M14 9l-2.5 3 2.5 3" opacity=".6"/><path d="M18 6v9"/><circle cx="16.2" cy="15" r="1.8"/>',
    history: '<path d="M4 12a8 8 0 1 1 2.3 5.6"/><path d="M4 17v-5h5"/><path d="M12 8v4l3 2"/>',

    arrangement: '<path d="M3 6h18M3 18h18"/><rect x="4" y="9" width="5" height="6" rx="1"/><rect x="11" y="9" width="8" height="6" rx="1"/>',
    sections: '<rect x="3" y="8" width="5" height="8" rx="1"/><rect x="9.5" y="8" width="5" height="8" rx="1"/><rect x="16" y="8" width="5" height="8" rx="1"/>',
    genarranger: '<rect x="3" y="9" width="5" height="6" rx="1"/><rect x="10" y="9" width="5" height="6" rx="1"/><path d="M19 4v4M17 6h4"/>',
    performance: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><path d="M16 15l4 2.5-4 2.5z"/>',
    takes: '<rect x="3" y="5" width="18" height="4" rx="1.5"/><rect x="3" y="11" width="13" height="4" rx="1.5"/><rect x="3" y="17" width="16" height="4" rx="1.5"/>',
    colorizer: '<path d="M12 3s6 6 6 10a6 6 0 0 1-12 0c0-4 6-10 6-10z"/>',
    clipgraph: '<circle cx="6" cy="7" r="2.2"/><circle cx="18" cy="9" r="2.2"/><circle cx="11" cy="18" r="2.2"/><path d="M8 8l8 .5M7 9l3 7M16 11l-4 6"/>',
    launchquant: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="13" width="7" height="7" rx="1.5"/><rect x="14" y="13" width="7" height="7" rx="1.5"/><circle cx="17.5" cy="6.5" r="3.5"/><path d="M17.5 4.5v2l1.5 1"/>',

    temposync: '<path d="M9 4h6l3 16H6z"/><path d="M12 8l4 8M6 20h12"/>',
    tempotap: '<path d="M9 4h6l3 16H6z"/><path d="M6 20h12"/><circle cx="12" cy="10" r="1.6" fill="currentColor"/>',
    timesig: '<path d="M15 5L9 19"/><circle cx="8" cy="8" r="1.6"/><circle cx="16" cy="16" r="1.6"/>',
    delaycalc: '<circle cx="11" cy="12" r="7"/><path d="M11 8v4l3 2"/><path d="M19 9a6 6 0 0 1 0 6"/>',

    synth: '<circle cx="12" cy="12" r="9"/><path d="M5 13c2-4 3 4 5 0s3-4 5 0 3 4 4 0"/>',
    sfx: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/>',
    vocal: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/>',

    grouprouting: '<circle cx="5" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 6h6a4 4 0 0 1 4 4M7 18h6a4 4 0 0 0 4-4"/>',
    console: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M13 15h4"/>',
    sandbox: '<path d="M9 7l-4 5 4 5M15 7l4 5-4 5"/>',
    trackcolor: '<rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" opacity=".3"/><rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" opacity=".5"/><rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" opacity=".7"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',

    copilot: '<rect x="5" y="8" width="14" height="11" rx="3"/><circle cx="9.5" cy="13" r="1.3"/><circle cx="14.5" cy="13" r="1.3"/><path d="M12 5v3M9 19v2M15 19v2"/>',
    palette: '<path d="M9 7l-4 5 4 5M15 7l4 5-4 5"/>',
    _default: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2" fill="currentColor"/>',
  };

  const TINT = {
    session: "#f6a623", clips: "#f6a623", templates: "#f6a623", notes: "#f6a623", organizer: "#7bd88f", snapshots: "#f6a623", setlist: "#f6a623", health: "#5ad17a", trackmanager: "#f6a623", projectsnapshot: "#f6a623", clipversions: "#f6a623", trackcolor: "#c792ea",
    chords: "#b58ce0", melody: "#b58ce0", lyricmelody: "#b58ce0", harmonizer: "#b58ce0", miditransform: "#b58ce0", randomizer: "#b58ce0", midigate: "#b58ce0", midilfo: "#b58ce0", chordpads: "#b58ce0", stepseq: "#b58ce0", quantizer: "#b58ce0", groove: "#b58ce0", groovetemplate: "#b58ce0", notation: "#b58ce0", genrhythm: "#b58ce0", scoreeditor: "#b58ce0", clipvariations: "#b58ce0", probabilitylab: "#b58ce0", phrasefinder: "#b58ce0", keyscale: "#b58ce0", velocompress: "#b58ce0", transposer: "#b58ce0",
    drums: "#e8617a", drumreplace: "#e8617a", drummap: "#e8617a", drumbus: "#e8617a",
    eq: "#6cc6ff", compressor: "#6cc6ff", mixassistant: "#6cc6ff", mixconsole: "#6cc6ff", mixscene: "#6cc6ff", fxchain: "#6cc6ff", fxpresets: "#6cc6ff", macros: "#6cc6ff", rackbuilder: "#6cc6ff", macromorph: "#6cc6ff", saferandom: "#6cc6ff", paramdiff: "#6cc6ff", mastering: "#5ec4a8", autogain: "#5ec4a8",
    resonance: "#57c7e0", spectrumcompare: "#57c7e0", texturemap: "#57c7e0", stemalign: "#74b8e0", samplebrain: "#74b8e0", warpcompare: "#74b8e0", loopdetect: "#f0a04b",
    arrangement: "#82c98a", sections: "#82c98a", genarranger: "#82c98a", performance: "#82c98a", takes: "#82c98a", colorizer: "#82c98a", colortheory: "#82c98a", takeorganizer: "#82c98a", clipgraph: "#82c98a", launchquant: "#82c98a",
    audio2midi: "#74b8e0",
    temposync: "#f0a04b", tempotap: "#f0a04b", timesig: "#f0a04b", delaycalc: "#f0a04b",
    synth: "#9d8cff", sfx: "#9d8cff", vocal: "#9d8cff",
    grouprouting: "#9a9aa2", console: "#9a9aa2", sandbox: "#9a9aa2", history: "#9a9aa2",
    copilot: "#6cc6ff",
  };

  function svg(id, opts) {
    const inner = I[id] || I._default;
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="${(opts && opts.size) || 20}" height="${(opts && opts.size) || 20}">${inner}</svg>`;
  }
  return { svg, tint: (id) => TINT[id] || "#9a9aa2", has: (id) => !!I[id] };
})();
