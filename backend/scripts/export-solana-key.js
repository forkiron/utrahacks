#!/usr/bin/env node
/**
 * Export Solana keypair secret as base58 for SOLANA_PRIVATE_KEY in .env.
 * Reads ~/.config/solana/id.json (default from solana-keygen new).
 *
 * Run from repo root: node backend/scripts/export-solana-key.js
 * Or from backend: node scripts/export-solana-key.js
 */
const fs = require("fs");
const path = require("path");
const keypairPath =
  process.env.SOLANA_KEYPAIR_PATH ||
  path.join(process.env.HOME || process.env.USERPROFILE, ".config", "solana", "id.json");

if (!fs.existsSync(keypairPath)) {
  console.error("Keypair not found at:", keypairPath);
  console.error("Run: solana-keygen new");
  process.exit(1);
}

const bs58 = require("bs58");
const encode = bs58.default && typeof bs58.default.encode === "function" ? bs58.default.encode : bs58.encode;
const j = JSON.parse(fs.readFileSync(keypairPath, "utf8"));
const secret = Buffer.from(j);
console.log(encode(secret));
