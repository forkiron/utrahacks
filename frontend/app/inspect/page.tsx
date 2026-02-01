"use client";

import { useState } from "react";
import AppNavbar from "../components/AppNavbar";
import CameraCapture from "./CameraCapture";
import ImagePreview from "./ImagePreview";
import AnalysisResults from "./AnalysisResults";
import FinalizeInspection from "./FinalizeInspection";
import RecentScansQueue from "../components/RecentScansQueue";

export type InspectStep =
  | "capture"
  | "preview"
  | "analyzing"
  | "results"
  | "finalize";

export interface CapturedImage {
  blob: Blob;
  preview: string;
  id: string;
}

export interface Detection {
  label: string;
  confidence: number;
  bbox?: [number, number, number, number];
}

export interface Component {
  type: string;
  name: string;
  count: number;
}

export interface AnalysisResult {
  detections: Detection[];
  components: Component[];
  result: { status: "PASS" | "FAIL"; violations: string[] };
  image_hash: string;
  analysis_hash: string;
}

export default function InspectPage() {
  const [step, setStep] = useState<InspectStep>("capture");
  const [images, setImages] = useState<CapturedImage[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [robotId, setRobotId] = useState("");

  const onCaptureComplete = (captured: CapturedImage[]) => {
    setImages(captured);
    setStep("preview");
  };

  const onAnalyze = async () => {
    setStep("analyzing");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    const formData = new FormData();
    for (const img of images) {
      formData.append("images", img.blob, `capture-${img.id}.jpg`);
    }
    const res = await fetch(`${apiUrl}/api/inspect/analyze`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setAnalysis(data);
    setStep("results");
  };

  const onFinalize = () => {
    setStep("finalize");
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans">
      <AppNavbar />

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {step === "capture" && (
          <>
            <CameraCapture onComplete={onCaptureComplete} />
            <RecentScansQueue />
          </>
        )}
        {step === "preview" && (
          <ImagePreview
            images={images}
            onBack={() => setStep("capture")}
            onAnalyze={onAnalyze}
          />
        )}
        {step === "analyzing" && (
          <div className="flex flex-col items-center justify-center py-24 gap-6 font-sans">
            <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-sm text-zinc-400">
              Running CV detection + Gemini analysis...
            </p>
          </div>
        )}
        {step === "results" && analysis && (
          <AnalysisResults
            analysis={analysis}
            images={images}
            onBack={() => setStep("preview")}
            onFinalize={onFinalize}
            robotId={robotId}
            setRobotId={setRobotId}
          />
        )}
        {step === "finalize" && analysis && (
          <FinalizeInspection
            robotId={robotId}
            analysis={analysis}
            images={images}
            onDone={() => {
              setStep("capture");
              setImages([]);
              setAnalysis(null);
            }}
          />
        )}
      </main>
    </div>
  );
}

