"use client";

interface ProofVisualizationProps {
  evidenceHash: string;
  solanaTx?: string | null;
  solanaCluster?: string | null;
  encryptedOnChain?: boolean;
  inspectionId?: string;
  compact?: boolean;
}

export default function ProofVisualization({
  evidenceHash,
  solanaTx,
  solanaCluster,
  encryptedOnChain = false,
  inspectionId,
  compact = false,
}: ProofVisualizationProps) {
  const cluster =
    solanaCluster !== undefined
      ? (solanaCluster ?? "")
      : (process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet");
  const explorerUrl = solanaTx
    ? `https://explorer.solana.com/tx/${solanaTx}${cluster ? `?cluster=${cluster}` : ""}`
    : null;

  return (
    <div className="rounded-lg border border-white/10 bg-black shadow-sm p-4 font-sans">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-3">
        On-chain proof
      </p>

      {/* Flow diagram */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 mb-3">
        <span className="px-2 py-0.5 rounded bg-black/30 border border-white/5">
          Evidence
        </span>
        <span aria-hidden>→</span>
        <span className="px-2 py-0.5 rounded bg-black/30 border border-white/5">
          SHA-256
        </span>
        {encryptedOnChain && (
          <>
            <span aria-hidden>→</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
              AES-256-GCM
            </span>
          </>
        )}
        <span aria-hidden>→</span>
        <span className="px-2 py-0.5 rounded bg-black/30 border border-white/5">
          Memo
        </span>
        <span aria-hidden>→</span>
        <span className="px-2 py-0.5 rounded bg-black/30 border border-white/5">
          Solana
        </span>
      </div>

      {encryptedOnChain && (
        <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 text-xs text-emerald-400 mb-3">
          <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          Encrypted on-chain
        </div>
      )}

      <div className="space-y-2">
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Evidence hash</p>
          <p className="font-mono text-xs break-all text-zinc-300">
            {evidenceHash}
          </p>
        </div>
        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-300 hover:text-white hover:underline"
          >
            View transaction on Solana Explorer
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>

      {!compact && inspectionId && (
        <p className="text-xs text-zinc-500 mt-3 pt-3 border-t border-white/5">
          Verify: /verify/{inspectionId}
        </p>
      )}
    </div>
  );
}
