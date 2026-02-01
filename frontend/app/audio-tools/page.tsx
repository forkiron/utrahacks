"use client";

import { useEffect, useMemo, useState } from "react";

type VoiceProfile = {
  id: string;
  label: string;
  description: string;
  supports: string[];
  mockOnly?: boolean;
};

const SOURCE_TYPES = [
  "judge_audio",
  "team_audio",
  "coach_audio",
  "uploaded_video_audio",
];

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function AudioToolsPage() {
  const apiBase = useMemo(() => getApiBase(), []);
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [status, setStatus] = useState<string>("");
  const [ttsText, setTtsText] = useState("Welcome to UTRAHacks.");
  const [ttsVoice, setTtsVoice] = useState("");
  const [ttsLang, setTtsLang] = useState("en");
  const [ttsResult, setTtsResult] = useState<any>(null);
  const [sfxPrompt, setSfxPrompt] = useState("A short metallic whoosh");
  const [sfxDuration, setSfxDuration] = useState("2");
  const [sfxResult, setSfxResult] = useState<any>(null);
  const [dubSourceLang, setDubSourceLang] = useState("en");
  const [dubTargetLang, setDubTargetLang] = useState("fr");
  const [dubVoice, setDubVoice] = useState("");
  const [dubFile, setDubFile] = useState<File | null>(null);
  const [dubResult, setDubResult] = useState<any>(null);
  const [transcribeRunId, setTranscribeRunId] = useState("RUN-1");
  const [transcribeSourceType, setTranscribeSourceType] = useState("coach_audio");
  const [transcribeLang, setTranscribeLang] = useState("en");
  const [transcribeTags, setTranscribeTags] = useState("demo");
  const [transcribeFile, setTranscribeFile] = useState<File | null>(null);
  const [transcribeResult, setTranscribeResult] = useState<any>(null);
  const [auditRunId, setAuditRunId] = useState("RUN-1");
  const [auditList, setAuditList] = useState<any[]>([]);
  const [auditId, setAuditId] = useState("");
  const [auditRecord, setAuditRecord] = useState<any>(null);

  useEffect(() => {
    fetch(`${apiBase}/api/voices/profiles`)
      .then((res) => res.json())
      .then((data) => {
        setProfiles(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length > 0) {
          setTtsVoice((prev) => prev || data[0].id);
          setDubVoice((prev) => prev || data[0].id);
        }
      })
      .catch(() => setProfiles([]));
  }, [apiBase]);

  async function handleTts() {
    setStatus("Generating TTS...");
    setTtsResult(null);
    try {
      const res = await fetch(`${apiBase}/api/audio/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: ttsText,
          voiceProfile: ttsVoice,
          language: ttsLang || undefined,
        }),
      });
      const data = await res.json();
      setTtsResult(data);
      setStatus("");
    } catch (err) {
      setStatus("TTS failed");
    }
  }

  async function handleSfx() {
    setStatus("Generating SFX...");
    setSfxResult(null);
    try {
      const res = await fetch(`${apiBase}/api/audio/sfx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: sfxPrompt,
          durationSec: Number(sfxDuration) || undefined,
        }),
      });
      const data = await res.json();
      setSfxResult(data);
      setStatus("");
    } catch (err) {
      setStatus("SFX failed");
    }
  }

  async function handleDub() {
    if (!dubFile) {
      setStatus("Pick an audio file to dub.");
      return;
    }
    if (dubFile.size > MAX_UPLOAD_BYTES) {
      setStatus("Audio exceeds 15MB.");
      return;
    }
    setStatus("Dubbing...");
    setDubResult(null);
    try {
      const audioBase64 = await fileToBase64(dubFile);
      const res = await fetch(`${apiBase}/api/audio/dub`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceLang: dubSourceLang,
          targetLang: dubTargetLang,
          voiceProfile: dubVoice || undefined,
          mimeType: dubFile.type || "audio/wav",
          audioBase64,
        }),
      });
      const data = await res.json();
      setDubResult(data);
      setStatus("");
    } catch (err) {
      setStatus("Dub failed");
    }
  }

  async function handleTranscribe() {
    if (!transcribeFile) {
      setStatus("Pick an audio file to transcribe.");
      return;
    }
    if (transcribeFile.size > MAX_UPLOAD_BYTES) {
      setStatus("Audio exceeds 15MB.");
      return;
    }
    setStatus("Transcribing...");
    setTranscribeResult(null);
    try {
      const audioBase64 = await fileToBase64(transcribeFile);
      const res = await fetch(`${apiBase}/api/audit-trails/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: transcribeRunId,
          sourceType: transcribeSourceType,
          language: transcribeLang || undefined,
          tags: transcribeTags ? transcribeTags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
          mimeType: transcribeFile.type || "audio/wav",
          audioBase64,
        }),
      });
      const data = await res.json();
      setTranscribeResult(data);
      setStatus("");
    } catch (err) {
      setStatus("Transcribe failed");
    }
  }

  async function handleAuditList() {
    setStatus("Loading audit trails...");
    try {
      const res = await fetch(
        `${apiBase}/api/audit-trails?runId=${encodeURIComponent(auditRunId)}`
      );
      const data = await res.json();
      setAuditList(Array.isArray(data) ? data : []);
      setStatus("");
    } catch {
      setStatus("Failed to load audit trails");
    }
  }

  async function handleAuditGet() {
    if (!auditId) {
      setStatus("Enter an audit trail ID.");
      return;
    }
    setStatus("Fetching audit trail...");
    try {
      const res = await fetch(`${apiBase}/api/audit-trails/${auditId}`);
      const data = await res.json();
      setAuditRecord(data);
      setStatus("");
    } catch {
      setStatus("Failed to fetch audit trail");
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-6 py-12">
      <div className="max-w-5xl mx-auto space-y-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Audio Tools (Demo)</h1>
          <p className="text-slate-300 text-sm">
            Backend: <span className="text-slate-100">{apiBase}</span>
          </p>
          {status && (
            <p className="text-sm text-amber-300">{status}</p>
          )}
        </header>

        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
          <h2 className="text-xl font-medium">Voice Profiles</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {profiles.map((profile) => (
              <div key={profile.id} className="rounded-lg border border-slate-800 p-4 bg-slate-900/60">
                <div className="font-semibold">{profile.label}</div>
                <div className="text-sm text-slate-400">{profile.description}</div>
                <div className="text-xs text-slate-500 mt-2">
                  {profile.supports.join(", ")}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
          <h2 className="text-xl font-medium">Text to Speech</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <input
              className="md:col-span-3 rounded-md bg-slate-950 border border-slate-800 p-3"
              value={ttsText}
              onChange={(e) => setTtsText(e.target.value)}
              placeholder="Text"
            />
            <select
              className="rounded-md bg-slate-950 border border-slate-800 p-3"
              value={ttsVoice}
              onChange={(e) => setTtsVoice(e.target.value)}
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.label}
                </option>
              ))}
            </select>
            <input
              className="rounded-md bg-slate-950 border border-slate-800 p-3"
              value={ttsLang}
              onChange={(e) => setTtsLang(e.target.value)}
              placeholder="Language (en)"
            />
            <button
              className="rounded-md bg-blue-500/80 hover:bg-blue-500 text-white font-medium px-4 py-3"
              onClick={handleTts}
            >
              Generate TTS
            </button>
          </div>
          {ttsResult?.audioBase64 && (
            <audio
              controls
              className="w-full"
              src={`data:${ttsResult.mimeType};base64,${ttsResult.audioBase64}`}
            />
          )}
          {ttsResult && (
            <pre className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg overflow-auto">
              {JSON.stringify(ttsResult, null, 2)}
            </pre>
          )}
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
          <h2 className="text-xl font-medium">Sound Effects</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <input
              className="md:col-span-2 rounded-md bg-slate-950 border border-slate-800 p-3"
              value={sfxPrompt}
              onChange={(e) => setSfxPrompt(e.target.value)}
              placeholder="Prompt"
            />
            <input
              className="rounded-md bg-slate-950 border border-slate-800 p-3"
              value={sfxDuration}
              onChange={(e) => setSfxDuration(e.target.value)}
              placeholder="Duration (sec)"
            />
            <button
              className="rounded-md bg-blue-500/80 hover:bg-blue-500 text-white font-medium px-4 py-3 md:col-span-3"
              onClick={handleSfx}
            >
              Generate SFX
            </button>
          </div>
          {sfxResult?.audioBase64 && (
            <audio
              controls
              className="w-full"
              src={`data:${sfxResult.mimeType};base64,${sfxResult.audioBase64}`}
            />
          )}
          {sfxResult && (
            <pre className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg overflow-auto">
              {JSON.stringify(sfxResult, null, 2)}
            </pre>
          )}
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
          <h2 className="text-xl font-medium">Dub Audio</h2>
          <div className="grid md:grid-cols-4 gap-3">
            <input
              className="rounded-md bg-slate-950 border border-slate-800 p-3"
              value={dubSourceLang}
              onChange={(e) => setDubSourceLang(e.target.value)}
              placeholder="Source (en)"
            />
            <input
              className="rounded-md bg-slate-950 border border-slate-800 p-3"
              value={dubTargetLang}
              onChange={(e) => setDubTargetLang(e.target.value)}
              placeholder="Target (fr)"
            />
            <select
              className="rounded-md bg-slate-950 border border-slate-800 p-3"
              value={dubVoice}
              onChange={(e) => setDubVoice(e.target.value)}
            >
              <option value="">(default)</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.label}
                </option>
              ))}
            </select>
            <input
              type="file"
              accept="audio/*"
              className="rounded-md bg-slate-950 border border-slate-800 p-3"
              onChange={(e) => setDubFile(e.target.files?.[0] ?? null)}
            />
            <button
              className="rounded-md bg-blue-500/80 hover:bg-blue-500 text-white font-medium px-4 py-3 md:col-span-4"
              onClick={handleDub}
            >
              Dub Audio
            </button>
          </div>
          {dubResult?.audioBase64 && (
            <audio
              controls
              className="w-full"
              src={`data:${dubResult.mimeType};base64,${dubResult.audioBase64}`}
            />
          )}
          {dubResult && (
            <pre className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg overflow-auto">
              {JSON.stringify(dubResult, null, 2)}
            </pre>
          )}
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
          <h2 className="text-xl font-medium">Transcribe Audio</h2>
          <div className="grid md:grid-cols-4 gap-3">
            <input
              className="rounded-md bg-slate-950 border border-slate-800 p-3"
              value={transcribeRunId}
              onChange={(e) => setTranscribeRunId(e.target.value)}
              placeholder="Run ID"
            />
            <select
              className="rounded-md bg-slate-950 border border-slate-800 p-3"
              value={transcribeSourceType}
              onChange={(e) => setTranscribeSourceType(e.target.value)}
            >
              {SOURCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <input
              className="rounded-md bg-slate-950 border border-slate-800 p-3"
              value={transcribeLang}
              onChange={(e) => setTranscribeLang(e.target.value)}
              placeholder="Language (en)"
            />
            <input
              className="rounded-md bg-slate-950 border border-slate-800 p-3"
              value={transcribeTags}
              onChange={(e) => setTranscribeTags(e.target.value)}
              placeholder="Tags (comma separated)"
            />
            <input
              type="file"
              accept="audio/*"
              className="rounded-md bg-slate-950 border border-slate-800 p-3 md:col-span-2"
              onChange={(e) => setTranscribeFile(e.target.files?.[0] ?? null)}
            />
            <button
              className="rounded-md bg-blue-500/80 hover:bg-blue-500 text-white font-medium px-4 py-3 md:col-span-2"
              onClick={handleTranscribe}
            >
              Transcribe
            </button>
          </div>
          {transcribeResult && (
            <pre className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg overflow-auto">
              {JSON.stringify(transcribeResult, null, 2)}
            </pre>
          )}
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
          <h2 className="text-xl font-medium">Audit Trails</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <input
              className="rounded-md bg-slate-950 border border-slate-800 p-3"
              value={auditRunId}
              onChange={(e) => setAuditRunId(e.target.value)}
              placeholder="Run ID"
            />
            <button
              className="rounded-md bg-emerald-500/80 hover:bg-emerald-500 text-white font-medium px-4 py-3"
              onClick={handleAuditList}
            >
              List by runId
            </button>
            <div />
            <input
              className="rounded-md bg-slate-950 border border-slate-800 p-3"
              value={auditId}
              onChange={(e) => setAuditId(e.target.value)}
              placeholder="Audit trail ID"
            />
            <button
              className="rounded-md bg-emerald-500/80 hover:bg-emerald-500 text-white font-medium px-4 py-3"
              onClick={handleAuditGet}
            >
              Get by ID
            </button>
          </div>
          {auditList.length > 0 && (
            <pre className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg overflow-auto">
              {JSON.stringify(auditList, null, 2)}
            </pre>
          )}
          {auditRecord && (
            <pre className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg overflow-auto">
              {JSON.stringify(auditRecord, null, 2)}
            </pre>
          )}
        </section>
      </div>
    </div>
  );
}
