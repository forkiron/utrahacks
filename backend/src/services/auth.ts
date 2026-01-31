import nacl from "tweetnacl";
import bs58 from "bs58";

export function verifyWalletSignature(
  message: string,
  signatureBase58: string,
  walletAddress: string
): boolean {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signature = bs58.decode(signatureBase58) as Uint8Array;
    const publicKey = bs58.decode(walletAddress) as Uint8Array;

    if (signature.length !== nacl.sign.signatureLength) return false;
    if (publicKey.length !== nacl.sign.publicKeyLength) return false;

    return nacl.sign.detached.verify(messageBytes, signature, publicKey);
  } catch {
    return false;
  }
}
