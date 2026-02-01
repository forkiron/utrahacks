"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface InspectionRecord {
  inspection_id: string;
  robot_id: string;
  result: "PASS" | "FAIL";
  timestamp: number;
  image_count?: number;
}

export default function RecentScansQueue() {
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    fetch(`${apiUrl}/api/inspect/list`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        // Show only the 10 most recent
        setInspections(list.slice(0, 10));
      })
      .catch(() => setInspections([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-3">
          Recent scans
        </p>
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (inspections.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-3">
          Recent scans
        </p>
        <p className="text-xs text-zinc-500 text-center py-4">
          No recent scans. Complete an inspection to see it here.
        </p>
      </div>
    );
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-3">
        Recent scans
      </p>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {inspections.map((record) => {
          const isPass = record.result === "PASS";
          const firstImageUrl = record.image_count
            ? `${apiUrl}/api/inspect/evidence/${record.inspection_id}/0`
            : null;
          
          return (
            <Link
              key={record.inspection_id}
              href={`/verify/${record.inspection_id}`}
              className="shrink-0 group"
            >
              <div className="flex flex-col items-center gap-2 w-20">
                {/* Photo as profile pic */}
                <div className="relative">
                  <div
                    className={`w-16 h-16 rounded-full border-2 overflow-hidden ${
                      isPass
                        ? "border-emerald-500/50 group-hover:border-emerald-400"
                        : "border-red-500/50 group-hover:border-red-400"
                    } transition-colors`}
                  >
                    {firstImageUrl ? (
                      <img
                        src={firstImageUrl}
                        alt={record.robot_id}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center text-xs text-zinc-500">
                        No img
                      </div>
                    )}
                  </div>
                  {/* Pass/Fail badge */}
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isPass
                        ? "bg-emerald-500 text-emerald-950"
                        : "bg-red-500 text-red-950"
                    }`}
                  >
                    {isPass ? "✓" : "✗"}
                  </div>
                </div>
                {/* Robot ID */}
                <p className="text-[10px] text-zinc-400 text-center truncate w-full group-hover:text-zinc-200 transition-colors">
                  {record.robot_id}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
