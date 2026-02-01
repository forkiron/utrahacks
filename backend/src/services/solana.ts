import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { encryptMemoPayload, isEncryptionConfigured } from "./encryption.js";

const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

export type OnChainPayload = {
  inspectionId: string;
  robotId: string;
  result: "PASS" | "FAIL";
  evidenceHash: string;
};

export async function writeInspectionToChain(
  inspectionId: string,
  robotId: string,
  result: "PASS" | "FAIL",
  evidenceHash: string,
  rpcUrl: string,
  privateKeyBase58?: string
): Promise<{ txSignature: string | null; encrypted: boolean }> {
  if (!rpcUrl || !privateKeyBase58) {
    return { txSignature: null, encrypted: false };
  }

  try {
    const connection = new Connection(rpcUrl);
    let memo: string;
    let encrypted = false;

    if (isEncryptionConfigured()) {
      const payload: OnChainPayload = {
        inspectionId,
        robotId,
        result,
        evidenceHash,
      };
      const ciphertext = encryptMemoPayload(JSON.stringify(payload));
      memo = `UTRAHACKS:ENC:${ciphertext}`;
      encrypted = true;
    } else {
      memo = `UTRAHACKS:${inspectionId}:${robotId}:${result}:${evidenceHash}`;
    }

    const secret = bs58.decode(privateKeyBase58);
    const signer = Keypair.fromSecretKey(secret);

    const memoIx = new TransactionInstruction({
      keys: [],
      programId: new PublicKey(MEMO_PROGRAM_ID),
      data: Buffer.from(memo, "utf8"),
    });

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");

    const tx = new Transaction({
      blockhash,
      lastValidBlockHeight,
      feePayer: signer.publicKey,
    }).add(memoIx);
    tx.sign(signer);

    const sig = await connection.sendTransaction(tx, [signer], {
      skipPreflight: true,
      preflightCommitment: "confirmed",
    });

    await connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed"
    );
    return { txSignature: sig, encrypted };
  } catch (err) {
    console.error("Solana write error:", err);
    return { txSignature: null, encrypted: false };
  }
}
