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
  gradient: string; // for bg gradient
};

type MusicTrack = {
  id: string;
  label: string;
  gradient: string;
  textClass: string;
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
    gradient: "from-emerald-500/20 via-emerald-500/5 to-transparent",
  },
  {
    id: "play_by_play",
    label: "Play-by-Play (fast, precise)",
    rate: 1.18,
    pitch: 1.15,
    className: "text-violet-200",
    gradient: "from-violet-500/20 via-violet-500/5 to-transparent",
  },
  {
    id: "excited_caster",
    label: "Excited Caster (high-energy, punchy)",
    rate: 1.22,
    pitch: 1.25,
    className: "text-rose-200",
    gradient: "from-rose-500/20 via-rose-500/5 to-transparent",
  },
  {
    id: "analyst_desk",
    label: "Analyst Desk (measured, technical)",
    rate: 0.92,
    pitch: 0.85,
    className: "text-amber-200",
    gradient: "from-amber-500/20 via-amber-500/5 to-transparent",
  },
  {
    id: "sideline_reporter",
    label: "Sideline Reporter (warm, conversational)",
    rate: 1.02,
    pitch: 1.0,
    className: "text-lime-200",
    gradient: "from-lime-500/20 via-lime-500/5 to-transparent",
  },
];

const MUSIC_TRACKS: MusicTrack[] = [
  { id: "none", label: "None", gradient: "from-zinc-500/10 via-transparent to-transparent", textClass: "text-zinc-400" },
  { id: "cinematic", label: "Cinematic", gradient: "from-purple-500/20 via-purple-500/5 to-transparent", textClass: "text-purple-200" },
  { id: "upbeat", label: "Upbeat", gradient: "from-green-500/20 via-green-500/5 to-transparent", textClass: "text-green-200" },
  { id: "tension", label: "Tension", gradient: "from-red-500/20 via-red-500/5 to-transparent", textClass: "text-red-200" },
  { id: "victory", label: "Victory", gradient: "from-amber-500/20 via-amber-500/5 to-transparent", textClass: "text-amber-200" },
];

/** Map frontend voice theme id to backend voice profile id (ElevenLabs). */
const VOICE_THEME_TO_PROFILE: Record<string, string> = {
  broadcast_anchor: "referee_calm",
  play_by_play: "hype_caster",
  excited_caster: "hype_caster",
  analyst_desk: "analyst_precise",
  sideline_reporter: "coach_mentor",
};

/** Default video path (file must live in frontend/public/). Change to your file, e.g. "/my-run.mp4". */
const DEFAULT_VIDEO_PATH = "/my-run.mp4";

/** Intro and track analysis — played with video paused on first frame, before scripted commentary. */
const INTRO_AND_TRACK_ANALYSIS =
  "WE'RE SEEING THE 2026 ROBOT BIATHLON TRACK FOR THE FIRST TIME, and it's a BEAST. " +
  "Two brutal zones: first, an obstacle course with two punishing obstructions. " +
  "Then there's the shooting range, where our fearsome robots must nail a shot to the outer blue ring. " +
  "THIS TRACK IS SCARY — we wish everyone good luck!";

/** Scripted commentary during live feed (after intro). Fires as video plays from start. */
const demoTimeline: TimelineEvent[] = [
  {
    id: "nice_start",
    t: 1,
    type: "commentary",
    label: "INFO",
    text: "And off to the races Lightning McQueen goes! Nice start.",
  },
  {
    id: "missed_turn",
    t: 5,
    type: "commentary",
    label: "INFO",
    text: "Ohhh, it seems the turn was missed, and we weren't able to even touch obstacle number 1.",
  },
  {
    id: "disqualification",
    t: 10,
    type: "penalty",
    label: "PENALTY",
    text: "WOAH! Off the track, McQueen goes. That's a disqualification for this run. So unfortunate.",
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
  const [captionsOn, setCaptionsOn] = useState(true);
  const [commentaryVolume, setCommentaryVolume] = useState(0.8);
  const [musicVolume, setMusicVolume] = useState(0.25);
  const [latestCaption, setLatestCaption] = useState("");
  const [status, setStatus] = useState("Press Start to begin live commentary.");
  const [introPhaseActive, setIntroPhaseActive] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceMode, setVoiceMode] = useState<"default" | "clone">("default");
  const [showEthicsModal, setShowEthicsModal] = useState(false);
  const [ethicsConfirmed, setEthicsConfirmed] = useState(false);
  const pendingStartRef = useRef(false);
  const pendingIntroRef = useRef(false);
  const cloneAudioRef = useRef<HTMLAudioElement | null>(null);
  const introHasRunRef = useRef(false);

  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
    []
  );

  const selectedTheme = useMemo(
    () => VOICE_THEMES.find((theme) => theme.id === voiceTheme) || VOICE_THEMES[0],
    [voiceTheme]
  );

  const selectedMusicTrack = useMemo(
    () => MUSIC_TRACKS.find((t) => t.id === musicTrack) || MUSIC_TRACKS[0],
    [musicTrack]
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
    if (typeof window === "undefined") return {} as Record<string, string>;
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

  function speak(text: string, onEnd?: () => void) {
    if (voiceMode === "default") {
      if (!window.speechSynthesis) {
        onEnd?.();
        return;
      }
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
      utterance.onend = () => onEnd?.();
      utterance.onerror = () => onEnd?.();
      window.speechSynthesis.speak(utterance);
      return;
    }
    const voiceProfile = VOICE_THEME_TO_PROFILE[voiceTheme] ?? "hype_caster";
    const body = JSON.stringify({
      text,
      voiceProfile,
      language: dubbingLang,
    });
    fetch(`${apiBase}/api/audio/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    })
      .then((res) => res.json())
      .then((data: { audioBase64?: string; mimeType?: string }) => {
        const b64 = data?.audioBase64;
        if (!b64) {
          onEnd?.();
          return;
        }
        const mime = data?.mimeType ?? "audio/mpeg";
        const src = `data:${mime};base64,${b64}`;
        if (cloneAudioRef.current) {
          cloneAudioRef.current.pause();
          cloneAudioRef.current = null;
        }
        const audio = new Audio(src);
        cloneAudioRef.current = audio;
        audio.volume = commentaryVolume;
        audio.onended = () => {
          cloneAudioRef.current = null;
          onEnd?.();
        };
        audio.onerror = () => {
          cloneAudioRef.current = null;
          onEnd?.();
        };
        audio.play().catch(() => {
          cloneAudioRef.current = null;
          onEnd?.();
        });
      })
      .catch(() => {
        onEnd?.();
      });
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
    if (!video || !isRunning || introPhaseActive) return;
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
    introHasRunRef.current = false;
    setIsRunning(false);
    setIsPaused(false);
    setIntroPhaseActive(false);
    setTimelineIndex(0);
    setLog([]);
    setLatestCaption("");
    setStatus("Demo reset.");
    window.speechSynthesis.cancel();
    if (cloneAudioRef.current) {
      cloneAudioRef.current.pause();
      cloneAudioRef.current.currentTime = 0;
      cloneAudioRef.current = null;
    }
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

  function runIntroThenPlay() {
    const video = videoRef.current;
    if (!video) return;
    if (introHasRunRef.current) return;
    introHasRunRef.current = true;
    pendingIntroRef.current = false;
    video.currentTime = 0;
    video.pause();
    setIntroPhaseActive(true);
    setStatus("Introduction and track analysis…");
    const introEvent: TimelineEvent = {
      id: "intro",
      t: 0,
      type: "intro",
      label: "INFO",
      text: INTRO_AND_TRACK_ANALYSIS,
    };
    setLog((prev) => [...prev, { event: introEvent, time: 0, text: INTRO_AND_TRACK_ANALYSIS }]);
    setLatestCaption(INTRO_AND_TRACK_ANALYSIS);
    speak(INTRO_AND_TRACK_ANALYSIS, () => {
      setIntroPhaseActive(false);
      setStatus("Live commentary active.");
      startPlayback();
    });
  }

  function startDemo() {
    if (!videoRef.current) return;
    if (voiceMode === "clone" && !ethicsConfirmed) {
      setShowEthicsModal(true);
      setStatus("Please confirm voice permissions to continue.");
      return;
    }
    setStatus("Live commentary active.");
    setIsRunning(true);
    setIsPaused(false);
    setTimelineIndex(0);
    setLog([]);
    setLatestCaption("");
    window.speechSynthesis.cancel();
    if (musicRef.current) {
      musicRef.current.pause();
    }
    if (!videoUrl) {
      pendingStartRef.current = true;
      setVideoUrl(DEFAULT_VIDEO_PATH);
      return;
    }
    runIntroThenPlay();
  }

  function stopDemo() {
    setIsPaused(true);
    setStatus("Paused.");
    window.speechSynthesis.cancel();
    if (cloneAudioRef.current) {
      cloneAudioRef.current.pause();
      cloneAudioRef.current = null;
    }
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
    if (cloneAudioRef.current) {
      cloneAudioRef.current.pause();
      cloneAudioRef.current = null;
    }
    if (musicRef.current) {
      musicRef.current.pause();
    }
  }

  useEffect(() => {
    if (!pendingStartRef.current || !videoUrl) return;
    pendingStartRef.current = false;
    setStatus("Loading…");
    setIsRunning(true);
    setIsPaused(false);
    setTimelineIndex(0);
    setLog([]);
    setLatestCaption("");
    pendingIntroRef.current = true;
    const video = videoRef.current;
    if (video && video.readyState >= 2) {
      pendingIntroRef.current = false;
      runIntroThenPlay();
    }
  }, [videoUrl]);

  function handleVideoLoadedData() {
    if (pendingIntroRef.current && videoRef.current) {
      pendingIntroRef.current = false;
      runIntroThenPlay();
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

  return (
    <div className="space-y-6 font-sans max-w-4xl mx-auto">
      <div className="relative rounded-lg border border-white/20 bg-black/60 backdrop-blur-sm shadow-sm p-5 overflow-hidden">
        <div
          className={`absolute inset-0 bg-gradient-to-br ${selectedTheme.gradient} pointer-events-none`}
        />
        <div className="relative z-10 flex flex-col items-center text-center gap-4">
          <span className={`text-sm ${selectedTheme.className}`}>
            {selectedTheme.label}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={startDemo}
              className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 transition-colors"
            >
              Start
            </button>
            {isRunning && !isPaused && (
              <button
                type="button"
                onClick={stopDemo}
                className="rounded-lg bg-white/10 border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
              >
                Pause
              </button>
            )}
            {isPaused && (
              <button
                type="button"
                onClick={resumeDemo}
                className="rounded-lg bg-white/10 border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
              >
                Resume
              </button>
            )}
            <button
              type="button"
              onClick={resetDemo}
              className="rounded-lg bg-white/10 border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
            >
              Reset
            </button>
          </div>
          <div className="text-sm text-zinc-500">{status}</div>
        </div>
      </div>

      <div className="rounded-lg border border-white/20 bg-black/60 backdrop-blur-sm shadow-sm p-5">
        <div className="max-w-md mx-auto space-y-4">
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wide block mb-1">
              Dubbing language
            </label>
            <select
              className="w-full bg-black border border-white/20 rounded-lg px-3 py-2.5 text-sm text-zinc-200"
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
            <label className="text-xs text-zinc-500 uppercase tracking-wide block mb-1">
              Voice selection
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleVoiceModeChange("default")}
                className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium border transition-colors ${
                  voiceMode === "default"
                    ? "bg-white text-zinc-950 border-white"
                    : "bg-black text-white border-white/20 hover:bg-white/10"
                }`}
              >
                Default voice
              </button>
              <button
                type="button"
                onClick={() => handleVoiceModeChange("clone")}
                className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium border transition-colors ${
                  voiceMode === "clone"
                    ? "bg-white text-zinc-950 border-white"
                    : "bg-black text-white border-white/20 hover:bg-white/10"
                }`}
              >
                Voice clone
              </button>
            </div>
            <p className="text-xs text-zinc-600 mt-2">
              Voice clone requires permission verification.
            </p>
          </div>
          <div className="relative rounded-lg overflow-hidden">
            <div
              className={`absolute inset-0 bg-gradient-to-br ${selectedTheme.gradient} pointer-events-none`}
            />
            <div className="relative z-10 p-4">
              <label className="text-xs text-zinc-500 uppercase tracking-wide block mb-1">
                Voice theme
              </label>
              <select
                className={`w-full bg-black/80 border border-white/20 rounded-lg px-3 py-2.5 text-sm ${selectedTheme.className}`}
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
          </div>
          <div className="relative rounded-lg overflow-hidden">
            <div
              className={`absolute inset-0 bg-gradient-to-tr ${selectedMusicTrack.gradient} pointer-events-none`}
            />
            <div className="relative z-10 p-4">
              <label className="text-xs text-zinc-500 uppercase tracking-wide block mb-1">
                Background music
              </label>
              <select
                className={`w-full bg-black/80 border border-white/20 rounded-lg px-3 py-2.5 text-sm ${selectedMusicTrack.textClass}`}
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
          </div>
          <div className="flex items-center justify-center gap-8">
            <label className="flex items-center gap-2 text-sm text-zinc-400">
              <input
                type="checkbox"
                checked={sfxEnabled}
                onChange={(event) => setSfxEnabled(event.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-black accent-white"
              />
              SFX on/off
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-400">
              <input
                type="checkbox"
                checked={captionsOn}
                onChange={(event) => setCaptionsOn(event.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-black accent-white"
              />
              Captions on/off
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="text-xs text-zinc-500 uppercase tracking-wide">
              Commentary volume
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={commentaryVolume}
                onChange={(event) => setCommentaryVolume(Number(event.target.value))}
                className="w-full mt-2 accent-white"
              />
            </label>
            <label className="text-xs text-zinc-500 uppercase tracking-wide">
              Music volume
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={musicVolume}
                onChange={(event) => setMusicVolume(Number(event.target.value))}
                className="w-full mt-2 accent-white"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-lg border border-white/20 bg-black/60 backdrop-blur-sm shadow-sm p-4">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Live camera feed
          </h2>
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay={false}
              muted
              playsInline
              className="w-full rounded-lg border border-white/20 bg-black aspect-video object-contain"
              src={videoUrl || undefined}
              onLoadedData={handleVideoLoadedData}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnded}
              controls={false}
              controlsList="nodownload noplaybackrate"
              disablePictureInPicture
            />
            {captionsOn && latestCaption && (
              <div className="absolute bottom-3 left-3 right-3 bg-black/80 border border-white/10 text-white text-sm px-3 py-2 rounded-lg">
                {latestCaption}
              </div>
            )}
            <div className="absolute top-3 left-3 inline-flex items-center gap-2 bg-black/80 border border-white/10 text-xs text-red-300 px-2.5 py-1 rounded-lg">
              <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
              LIVE
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-white/20 bg-black/60 backdrop-blur-sm shadow-sm p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Commentary Log
            </h2>
            <span className="text-xs text-zinc-400">
              {selectedTheme.label}
            </span>
          </div>
          <div
            ref={logRef}
            className="mt-4 max-h-[420px] space-y-3 overflow-y-auto rounded-lg border border-white/20 bg-black px-4 py-3"
          >
            {log.length === 0 && (
              <p className="text-sm text-zinc-600">
                Commentary appears here as the demo plays.
              </p>
            )}
            {log.map((entry, index) => (
              <div
                key={`${entry.event.id}-${index}`}
                className="rounded-lg border border-white/10 bg-white/5 p-3"
              >
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>{formatTime(entry.time)}</span>
                  <span className="uppercase tracking-wide">{entry.event.label}</span>
                </div>
                <p className="mt-2 text-sm text-zinc-300">{entry.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <audio ref={musicRef} />
      {showEthicsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-lg border border-white/20 bg-black p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Voice Clone Ethics</h3>
            <p className="text-sm text-zinc-500">
              Confirm you have explicit permission to use this voice in this
              recording and any generated commentary.
            </p>
            <label className="flex items-start gap-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                className="mt-1 w-4 h-4 rounded border-white/20 bg-black accent-white"
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
                className="px-4 py-2.5 text-sm rounded-lg border border-white/20 bg-black text-white hover:bg-white/10 transition-colors"
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
                className={`px-4 py-2.5 text-sm rounded-lg font-medium transition-colors ${
                  ethicsConfirmed
                    ? "bg-white text-zinc-950 hover:bg-zinc-200"
                    : "bg-white/10 text-zinc-600 cursor-not-allowed border border-white/10"
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
