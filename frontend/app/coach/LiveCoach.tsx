"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SfxId =
  | "start_beep"
  | "penalty_ding"
  | "impact_thud"
  | "lap_chime"
  | "range_ping"
  | "finish_fanfare";

type TimelineEvent = {
  id: string;
  t: number;
  type: "intro" | "commentary" | "penalty" | "impact" | "finish" | "info";
  label: "INFO" | "PENALTY" | "CONTACT" | "FINISH";
  text: string;
  sfx?: SfxId;
};

type VoiceTheme = {
  id: string;
  label: string;
  rate: number;
  pitch: number;
  className: string;
};

const DEMO_LANGS = [
  { id: "en", label: "English (en)" },
  { id: "fr", label: "French (fr)" },
  { id: "es", label: "Spanish (es)" },
  { id: "de", label: "German (de)" },
  { id: "pt", label: "Portuguese (pt)" },
  { id: "it", label: "Italian (it)" },
  { id: "ja", label: "Japanese (ja)" },
  { id: "ko", label: "Korean (ko)" },
  { id: "hi", label: "Hindi (hi)" },
];

const VOICE_THEMES: VoiceTheme[] = [
  {
    id: "broadcast_anchor",
    label: "Broadcast Anchor (clean, authoritative)",
    rate: 0.95,
    pitch: 0.9,
    className: "text-emerald-200",
  },
  {
    id: "play_by_play",
    label: "Play-by-Play (fast, precise)",
    rate: 1.18,
    pitch: 1.15,
    className: "text-sky-200",
  },
  {
    id: "excited_caster",
    label: "Excited Caster (high-energy, punchy)",
    rate: 1.22,
    pitch: 1.25,
    className: "text-rose-200",
  },
  {
    id: "analyst_desk",
    label: "Analyst Desk (measured, technical)",
    rate: 0.92,
    pitch: 0.85,
    className: "text-amber-200",
  },
  {
    id: "sideline_reporter",
    label: "Sideline Reporter (warm, conversational)",
    rate: 1.02,
    pitch: 1.0,
    className: "text-lime-200",
  },
];

const MUSIC_TRACKS = [
  { id: "none", label: "None" },
  { id: "cinematic", label: "Cinematic" },
  { id: "upbeat", label: "Upbeat" },
  { id: "tension", label: "Tension" },
  { id: "victory", label: "Victory" },
];

const demoTimeline: TimelineEvent[] = [
  {
    id: "intro",
    t: 0.6,
    type: "intro",
    label: "INFO",
    text: "Welcome to the live run. All systems green and the track is clear.",
    sfx: "start_beep",
  },
  {
    id: "start",
    t: 3.4,
    type: "commentary",
    label: "INFO",
    text: "Clean start, strong acceleration out of the gate.",
    sfx: "start_beep",
  },
  {
    id: "corner_one",
    t: 7.8,
    type: "commentary",
    label: "INFO",
    text: "Corner one looks stable. Steering corrections are smooth.",
  },
  {
    id: "penalty_touch",
    t: 11.2,
    type: "penalty",
    label: "PENALTY",
    text: "Warning: boundary touch detected at corner two.",
    sfx: "penalty_ding",
  },
  {
    id: "impact_barrier",
    t: 15.3,
    type: "impact",
    label: "CONTACT",
    text: "Contact with barrier. Recovery looks steady.",
    sfx: "impact_thud",
  },
  {
    id: "lap_one",
    t: 21.0,
    type: "commentary",
    label: "INFO",
    text: "Lap one complete. Pace remains consistent.",
    sfx: "lap_chime",
  },
  {
    id: "range_entry",
    t: 27.5,
    type: "commentary",
    label: "INFO",
    text: "Entering the shooting range. Alignment is clean.",
  },
  {
    id: "range_hit",
    t: 31.2,
    type: "commentary",
    label: "INFO",
    text: "Target hit on the outer blue ring.",
    sfx: "range_ping",
  },
  {
    id: "final_push",
    t: 39.4,
    type: "commentary",
    label: "INFO",
    text: "Final push underway. Motors holding steady torque.",
  },
  {
    id: "finish",
    t: 45.8,
    type: "finish",
    label: "FINISH",
    text: "Finish line crossed. Time looks strong for qualification.",
    sfx: "finish_fanfare",
  },
];

const translations: Record<string, Partial<Record<string, string>>> = {
  intro: {
    fr: "Bienvenue pour la course en direct. Tous les systemes sont au vert et la piste est degagee.",
    es: "Bienvenidos a la carrera en vivo. Todos los sistemas en verde y la pista despejada.",
    de: "Willkommen zum Live-Lauf. Alle Systeme sind grun und die Strecke ist frei.",
    pt: "Bem-vindos a corrida ao vivo. Todos os sistemas verdes e pista limpa.",
    it: "Benvenuti alla corsa dal vivo. Tutti i sistemi sono verdi e la pista e libera.",
    ja: "Raibu soko e youkoso. Shisutemu wa mondai naku, kosu wa kuria desu.",
    ko: "Laibeu juhaeng hwanyeonghamnida. Siseutem jeongseong, teuraek keullin.",
    hi: "Live run mein apka swagat hai. Sabhi system hara aur track saaf hai.",
  },
  start: {
    fr: "Depart propre, forte acceleration au lancement.",
    es: "Salida limpia, fuerte aceleracion al inicio.",
    de: "Sauberer Start, starke Beschleunigung aus der Box.",
    pt: "Largada limpa, forte aceleracao na saida.",
    it: "Partenza pulita, forte accelerazione in uscita.",
    ja: "Kurin na sutaato, kasoku mo surudoi desu.",
    ko: "Kkalkkeumhan chulbal, choban gasok joayo.",
    hi: "Saaf shuruaat, tez twaran ke saath.",
  },
  corner_one: {
    fr: "Le premier virage est stable. Corrections fluides.",
    es: "La curva uno se ve estable. Correcciones suaves.",
    de: "Kurve eins bleibt stabil. Weiche Korrekturen.",
    pt: "Curva um estavel. Correcao suave.",
    it: "Curva uno stabile. Correzioni fluide.",
    ja: "Kona 1 wa antei. Shusei mo namaraka desu.",
    ko: "Cheot koneyo anteijeok, bojeong bundeureopseumnida.",
    hi: "Pehla mod sthir hai. Sudhar sucharu hain.",
  },
  penalty_touch: {
    fr: "Avertissement: contact avec la limite au virage deux.",
    es: "Advertencia: toque de limite en la curva dos.",
    de: "Warnung: Randberuhrung in Kurve zwei.",
    pt: "Aviso: toque na linha no segundo canto.",
    it: "Avviso: tocco del limite alla curva due.",
    ja: "Keikoku: kona 2 de kyokai ni sesshoku.",
    ko: "Gyeonggo: koneyo 2 eseo gyeonggye jeopchok gamji.",
    hi: "Chetavni: mod do par seema ko chhua.",
  },
  impact_barrier: {
    fr: "Contact avec la barriere. La recuperation est stable.",
    es: "Contacto con la barrera. Recuperacion estable.",
    de: "Kontakt mit der Barriere. Erholung stabil.",
    pt: "Contato com a barreira. Recuperacao estavel.",
    it: "Contatto con la barriera. Recupero stabile.",
    ja: "Baria ni sesshoku. Kaifuku wa antei.",
    ko: "Jangbyeok jeopchok. Hoebok eun anjeongjeok.",
    hi: "Barrier se sampark. Recovery sthir hai.",
  },
  lap_one: {
    fr: "Tour un termine. Le rythme reste regulier.",
    es: "Vuelta uno completa. El ritmo sigue constante.",
    de: "Runde eins abgeschlossen. Tempo bleibt konstant.",
    pt: "Volta um completa. Ritmo consistente.",
    it: "Giro uno completato. Ritmo costante.",
    ja: "1 shume kanryo. Pesu wa antei.",
    ko: "1 raep wallyo. Pace iljeong.",
    hi: "Pehla lap poora. Gati sthir hai.",
  },
  range_entry: {
    fr: "Entree au stand de tir. Alignement propre.",
    es: "Entrada al rango de tiro. Alineacion limpia.",
    de: "Einfahrt in den Schiesstand. Ausrichtung sauber.",
    pt: "Entrada na area de tiro. Alinhamento limpo.",
    it: "Ingresso al poligono. Allineamento pulito.",
    ja: "Shageki renji ni shinnyu. Seiretsu wa ryoko.",
    ko: "Sagyeok guyeok jinip. Jeongnyeol joayo.",
    hi: "Shooting range mein pravesh. Sanrekhan saaf hai.",
  },
  range_hit: {
    fr: "Cible touchee sur l'anneau bleu exterieur.",
    es: "Objetivo alcanzado en el anillo azul exterior.",
    de: "Zieltreffer am auseren blauen Ring.",
    pt: "Alvo atingido no anel azul externo.",
    it: "Bersaglio colpito nell'anello blu esterno.",
    ja: "Sotogawa no ao ringu ni meichu.",
    ko: "Bakkat paran ring e myeongjung.",
    hi: "Bahari neele ring par hit.",
  },
  final_push: {
    fr: "Derniere ligne droite. Couple moteur stable.",
    es: "Ultimo empuje. Motores con par estable.",
    de: "Letzter Sprint. Motoren halten Drehmoment.",
    pt: "Ultimo esforço. Motores estaveis.",
    it: "Spinta finale. Coppia stabile.",
    ja: "Saishu supurinto. Toku wa antei.",
    ko: "Majimak seupoteu. Tokeu yujijung.",
    hi: "Antim dhakka. Torque sthir hai.",
  },
  finish: {
    fr: "Ligne d'arrivee franchie. Temps prometteur.",
    es: "Linea de meta cruzada. Tiempo competitivo.",
    de: "Ziel uberquert. Zeit sieht stark aus.",
    pt: "Linha de chegada cruzada. Tempo forte.",
    it: "Traguardo superato. Tempo ottimo.",
    ja: "Goru tsuka. Taimu wa ryoko.",
    ko: "Gyeolseungseon tonga. Girogi joayo.",
    hi: "Finish line paar. Samay mazboot hai.",
  },
};

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000)
    .toString()
    .padStart(3, "0");
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms}`;
}

function buildWavBase64(sampleRate: number, data: Float32Array): string {
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = data.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  let offset = 0;

  function writeString(value: string) {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset, value.charCodeAt(i));
      offset += 1;
    }
  }

  writeString("RIFF");
  view.setUint32(offset, 36 + dataSize, true);
  offset += 4;
  writeString("WAVE");
  writeString("fmt ");
  view.setUint32(offset, 16, true);
  offset += 4;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint16(offset, numChannels, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, byteRate, true);
  offset += 4;
  view.setUint16(offset, blockAlign, true);
  offset += 2;
  view.setUint16(offset, bytesPerSample * 8, true);
  offset += 2;
  writeString("data");
  view.setUint32(offset, dataSize, true);
  offset += 4;

  for (let i = 0; i < data.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, sample * 0x7fff, true);
    offset += 2;
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createTone(
  frequency: number,
  durationSec: number,
  volume = 0.4,
  decay = 0.0
) {
  const sampleRate = 22050;
  const length = Math.floor(sampleRate * durationSec);
  const data = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    const env = decay > 0 ? Math.exp(-decay * t) : 1;
    data[i] = Math.sin(2 * Math.PI * frequency * t) * volume * env;
  }
  return buildWavBase64(sampleRate, data);
}

function createNoise(durationSec: number, volume = 0.35) {
  const sampleRate = 22050;
  const length = Math.floor(sampleRate * durationSec);
  const data = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const env = Math.exp(-4 * (i / length));
    data[i] = (Math.random() * 2 - 1) * volume * env;
  }
  return buildWavBase64(sampleRate, data);
}

export default function LiveCoach() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [timelineIndex, setTimelineIndex] = useState(0);
  const [log, setLog] = useState<Array<{ event: TimelineEvent; time: number; text: string }>>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [dubbingLang, setDubbingLang] = useState("en");
  const [voiceTheme, setVoiceTheme] = useState(VOICE_THEMES[0].id);
  const [musicTrack, setMusicTrack] = useState("cinematic");
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [commentaryVolume, setCommentaryVolume] = useState(0.8);
  const [musicVolume, setMusicVolume] = useState(0.25);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [latestCaption, setLatestCaption] = useState("");
  const [status, setStatus] = useState("Press Start to begin live commentary.");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceMode, setVoiceMode] = useState<"default" | "clone">("default");
  const [showEthicsModal, setShowEthicsModal] = useState(false);
  const [ethicsConfirmed, setEthicsConfirmed] = useState(false);
  const pendingStartRef = useRef(false);

  const selectedTheme = useMemo(
    () => VOICE_THEMES.find((theme) => theme.id === voiceTheme) || VOICE_THEMES[0],
    [voiceTheme]
  );

  const sfxMap = useMemo<Record<SfxId, string>>(() => {
    if (typeof window === "undefined") return {} as Record<SfxId, string>;
    return {
      start_beep: `data:audio/wav;base64,${createTone(840, 0.16, 0.5, 4)}`,
      penalty_ding: `data:audio/wav;base64,${createTone(1200, 0.2, 0.45, 3)}`,
      impact_thud: `data:audio/wav;base64,${createNoise(0.2, 0.5)}`,
      lap_chime: `data:audio/wav;base64,${createTone(620, 0.25, 0.4, 2)}`,
      range_ping: `data:audio/wav;base64,${createTone(980, 0.18, 0.45, 3)}`,
      finish_fanfare: `data:audio/wav;base64,${createTone(520, 0.35, 0.5, 1.2)}`,
    };
  }, []);

  const musicMap = useMemo<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    return {
      cinematic: `data:audio/wav;base64,${createTone(220, 5, 0.2, 0.2)}`,
      upbeat: `data:audio/wav;base64,${createTone(440, 4, 0.22, 0.3)}`,
      tension: `data:audio/wav;base64,${createTone(330, 4.5, 0.2, 0.4)}`,
      victory: `data:audio/wav;base64,${createTone(520, 3.5, 0.22, 0.3)}`,
    };
  }, []);

  useEffect(() => {
    const handleVoices = () => {
      setAvailableVoices(window.speechSynthesis.getVoices());
    };
    handleVoices();
    window.speechSynthesis.onvoiceschanged = handleVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    if (!logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  useEffect(() => {
    if (!musicRef.current) return;
    musicRef.current.volume = musicVolume;
  }, [musicVolume]);

  function getEventText(event: TimelineEvent) {
    const translated = translations[event.id]?.[dubbingLang];
    return translated || event.text;
  }

  function speak(text: string) {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    const voiceMatch = availableVoices.find((voice) =>
      voice.lang.toLowerCase().startsWith(dubbingLang)
    );
    if (voiceMatch) {
      utterance.voice = voiceMatch;
      utterance.lang = voiceMatch.lang;
    } else {
      utterance.lang = dubbingLang;
    }
    utterance.rate = selectedTheme.rate;
    utterance.pitch = selectedTheme.pitch;
    utterance.volume = commentaryVolume;
    window.speechSynthesis.speak(utterance);
  }

  function playSfx(sfxId?: SfxId) {
    if (!sfxId || !sfxEnabled) return;
    const src = sfxMap[sfxId];
    if (!src) return;
    const audio = new Audio(src);
    audio.volume = 0.6;
    audio.play().catch(() => undefined);
  }

  function appendLog(event: TimelineEvent, currentTime: number) {
    const text = getEventText(event);
    setLog((prev) => [...prev, { event, time: currentTime, text }]);
    setLatestCaption(text);
    speak(text);
    playSfx(event.sfx);
  }

  function handleTimeUpdate() {
    const video = videoRef.current;
    if (!video || !isRunning) return;
    const currentTime = video.currentTime;
    let idx = timelineIndex;
    while (idx < demoTimeline.length && currentTime >= demoTimeline[idx].t) {
      appendLog(demoTimeline[idx], currentTime);
      idx += 1;
    }
    if (idx !== timelineIndex) {
      setTimelineIndex(idx);
    }
  }

  function resetDemo() {
    setIsRunning(false);
    setIsPaused(false);
    setTimelineIndex(0);
    setLog([]);
    setLatestCaption("");
    setStatus("Demo reset.");
    window.speechSynthesis.cancel();
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    if (musicRef.current) {
      musicRef.current.pause();
      musicRef.current.currentTime = 0;
    }
  }

  function startPlayback() {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play().catch(() => undefined);
  }

  function startDemo() {
    if (!videoRef.current) return;
    setStatus("Live commentary active.");
    setIsRunning(true);
    setIsPaused(false);
    setTimelineIndex(0);
    setLog([]);
    setLatestCaption("");
    window.speechSynthesis.cancel();
    if (musicRef.current) {
      if (musicTrack !== "none") {
        const src = musicMap[musicTrack as keyof typeof musicMap];
        if (src) {
          musicRef.current.src = src;
          musicRef.current.loop = true;
          musicRef.current.volume = musicVolume;
          musicRef.current.play().catch(() => undefined);
        }
      } else {
        musicRef.current.pause();
      }
    }
    if (voiceMode === "clone" && !ethicsConfirmed) {
      setShowEthicsModal(true);
      setStatus("Please confirm voice permissions to continue.");
      return;
    }
    if (!videoUrl) {
      pendingStartRef.current = true;
      setVideoUrl("/landing.mov");
      return;
    }
    startPlayback();
  }

  function stopDemo() {
    setIsPaused(true);
    setStatus("Paused.");
    window.speechSynthesis.cancel();
    if (videoRef.current) {
      videoRef.current.pause();
    }
    if (musicRef.current) {
      musicRef.current.pause();
    }
  }

  function resumeDemo() {
    setIsPaused(false);
    setStatus("Live commentary active.");
    if (videoRef.current) {
      videoRef.current.play().catch(() => undefined);
    }
    if (musicRef.current && musicTrack !== "none") {
      musicRef.current.play().catch(() => undefined);
    }
  }

  function handleVideoEnded() {
    setStatus("Run complete.");
    setIsRunning(false);
    setIsPaused(false);
    window.speechSynthesis.cancel();
    if (musicRef.current) {
      musicRef.current.pause();
    }
  }

  function handleVoiceModeChange(mode: "default" | "clone") {
    if (mode === "clone") {
      setShowEthicsModal(true);
    } else {
      setEthicsConfirmed(false);
    }
    setVoiceMode(mode);
  }

  useEffect(() => {
    if (pendingStartRef.current && videoUrl) {
      pendingStartRef.current = false;
      startPlayback();
    }
  }, [videoUrl]);

  return (
    <div className="space-y-6 font-sans">
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`text-sm ${selectedTheme.className}`}>
                {selectedTheme.label}
              </span>
            </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={startDemo}
              className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-100 disabled:opacity-50 transition-colors"
            >
              Start
            </button>
            {isRunning && !isPaused && (
              <button
                type="button"
                onClick={stopDemo}
                className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
              >
                Pause
              </button>
            )}
            {isPaused && (
              <button
                type="button"
                onClick={resumeDemo}
                className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
              >
                Resume
              </button>
            )}
            <button
              type="button"
              onClick={resetDemo}
              className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
            >
              Reset
            </button>
          </div>
          <div className="text-sm text-zinc-400">{status}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-3">
            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">
                Dubbing language
              </label>
              <select
                className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm"
                value={dubbingLang}
                onChange={(event) => setDubbingLang(event.target.value)}
              >
                {DEMO_LANGS.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.label}
                  </option>
                ))}
                </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">
                Voice selection
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleVoiceModeChange("default")}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-medium border transition-colors ${
                    voiceMode === "default"
                      ? "bg-white text-zinc-950 border-white"
                      : "bg-white/10 text-white border-white/10 hover:bg-white/20"
                  }`}
                >
                  Default voice
                </button>
                <button
                  type="button"
                  onClick={() => handleVoiceModeChange("clone")}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-medium border transition-colors ${
                    voiceMode === "clone"
                      ? "bg-white text-zinc-950 border-white"
                      : "bg-white/10 text-white border-white/10 hover:bg-white/20"
                  }`}
                >
                  Voice clone
                </button>
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Voice clone requires permission verification.
              </p>
            </div>
            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">
                Voice theme
              </label>
              <select
                className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm"
                value={voiceTheme}
                onChange={(event) => setVoiceTheme(event.target.value)}
              >
                {VOICE_THEMES.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wide block mb-1">
                Background music
              </label>
              <select
                className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm"
                value={musicTrack}
                onChange={(event) => setMusicTrack(event.target.value)}
              >
                {MUSIC_TRACKS.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={sfxEnabled}
                  onChange={(event) => setSfxEnabled(event.target.checked)}
                />
                SFX on/off
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={captionsOn}
                  onChange={(event) => setCaptionsOn(event.target.checked)}
                />
                Captions on/off
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-zinc-400 uppercase tracking-wide">
                Commentary volume
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={commentaryVolume}
                  onChange={(event) => setCommentaryVolume(Number(event.target.value))}
                  className="w-full"
                />
              </label>
              <label className="text-xs text-zinc-400 uppercase tracking-wide">
                Music volume
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={musicVolume}
                  onChange={(event) => setMusicVolume(Number(event.target.value))}
                  className="w-full"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-lg border border-white/20 bg-black shadow-sm p-4">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Live camera feed
          </h2>
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay={false}
              muted
              playsInline
              className="w-full rounded-xl border border-white/10 bg-black aspect-video object-cover"
              src={videoUrl || undefined}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnded}
              controls={false}
              controlsList="nodownload noplaybackrate"
              disablePictureInPicture
            />
            {captionsOn && latestCaption && (
              <div className="absolute bottom-3 left-3 right-3 bg-black/60 text-white text-sm px-3 py-2 rounded-md">
                {latestCaption}
              </div>
            )}
            <div className="absolute top-3 left-3 inline-flex items-center gap-2 bg-black/70 text-xs text-red-200 px-2 py-1 rounded-full">
              <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
              LIVE
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Commentary Log
            </h2>
            <span className={`text-xs ${selectedTheme.className}`}>
              {selectedTheme.label}
            </span>
          </div>
          <div
            ref={logRef}
            className="mt-4 max-h-[420px] space-y-3 overflow-y-auto rounded-lg border border-white/10 bg-black/40 px-4 py-3"
          >
            {log.length === 0 && (
              <p className="text-sm text-zinc-500">
                Commentary appears here as the demo plays.
              </p>
            )}
            {log.map((entry, index) => (
              <div
                key={`${entry.event.id}-${index}`}
                className="rounded-xl border border-white/5 bg-black/30 p-3"
              >
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>{formatTime(entry.time)}</span>
                  <span className="uppercase tracking-wide">{entry.event.label}</span>
                </div>
                <p className="mt-2 text-sm text-zinc-200">{entry.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <audio ref={musicRef} />
      {showEthicsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111] p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Voice Clone Ethics</h3>
            <p className="text-sm text-zinc-400">
              Confirm you have explicit permission to use this voice in this
              recording and any generated commentary.
            </p>
            <label className="flex items-start gap-3 text-sm text-zinc-200">
              <input
                type="checkbox"
                className="mt-1"
                checked={ethicsConfirmed}
                onChange={(event) => setEthicsConfirmed(event.target.checked)}
              />
              I confirm I have permission to use this voice for cloning in this demo.
            </label>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowEthicsModal(false);
                  if (!ethicsConfirmed) {
                    setVoiceMode("default");
                  }
                }}
                className="px-4 py-2 text-sm rounded-md bg-white/10 text-white hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (ethicsConfirmed) {
                    setShowEthicsModal(false);
                  }
                }}
                className={`px-4 py-2 text-sm rounded-md font-medium ${
                  ethicsConfirmed
                    ? "bg-white text-zinc-950 hover:bg-zinc-100"
                    : "bg-white/10 text-zinc-500 cursor-not-allowed"
                }`}
                disabled={!ethicsConfirmed}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
