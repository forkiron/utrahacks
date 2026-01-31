import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import bs58 from "bs58";

const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

export async function writeInspectionToChain(
  inspectionId: string,
  robotId: string,
  result: "PASS" | "FAIL",
  evidenceHash: string,
  rpcUrl: string,
  privateKeyBase58?: string
): Promise<string | null> {
  if (!rpcUrl || !privateKeyBase58) {
    return null;
  }

  try {
    const connection = new Connection(rpcUrl);
    const memo = `UTRAHACKS:${inspectionId}:${robotId}:${result}:${evidenceHash}`;

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
    return sig;
  } catch (err) {
    console.error("Solana write error:", err);
    return null;
  }
}
