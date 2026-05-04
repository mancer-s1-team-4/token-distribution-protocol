import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";
import { TokenDistributionProtocol } from "../target/types/token_distribution_protocol";

// ─────────────────────────────────────────────────────────────────────────────
// Token Distribution Protocol — Week 3 Test Suite
//
// These tests verify that:
//   1. The program deploys successfully and its program ID matches Anchor.toml
//   2. Each instruction stub compiles and executes without error
//
// Note: All instruction handlers are stubs (Ok(()) only) for Week 3.
// Week 4 will add tests that validate actual on-chain state changes,
// vesting math, token transfers, and all 10 edge cases from the architecture doc.
// ─────────────────────────────────────────────────────────────────────────────

describe("token-distribution-protocol", () => {
  // Use the local cluster configured in Anchor.toml
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace
    .tokenDistributionProtocol as Program<TokenDistributionProtocol>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;

  // ── Test 1: Deploy ─────────────────────────────────────────────────────────
  it("deploys successfully — program ID is set", async () => {
    assert.ok(
      program.programId,
      "Program ID should be defined after deploy"
    );
    console.log("  Program ID:", program.programId.toBase58());
  });

  // ── Test 2: initialize ─────────────────────────────────────────────────────
  it("initialize — executes and returns a transaction signature", async () => {
    const tx = await program.methods.initialize().rpc();

    assert.ok(tx, "initialize should return a transaction signature");
    console.log("  initialize tx:", tx);
  });

  // ── Test 3: create_stream stub ─────────────────────────────────────────────
  // Arya owns this instruction — stub verifies it compiles and can be called.
  it("create_stream — stub compiles and returns Ok", async () => {
    const recipient = Keypair.generate();

    const now = Math.floor(Date.now() / 1000);
    const thirtyDays = 30 * 24 * 60 * 60;

    const tx = await program.methods
      .createStream(
        new anchor.BN(1),                // stream_id
        new anchor.BN(1_000_000),        // amount (1 USDC with 6 decimals)
        new anchor.BN(now),              // start_time
        new anchor.BN(now),              // cliff_time (= start_time = no cliff)
        new anchor.BN(now + thirtyDays), // end_time
        0,                               // stream_type: Linear
        true                             // is_cancelable
      )
      .accounts({
        creator: provider.wallet.publicKey,
        recipient: recipient.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    assert.ok(tx, "create_stream should return a transaction signature");
    console.log("  create_stream tx:", tx);
  });

  // ── Test 4: withdraw stub ──────────────────────────────────────────────────
  // Alex owns this instruction — stub verifies it compiles and can be called.
  it("withdraw — stub compiles and returns Ok", async () => {
    const tx = await program.methods
      .withdraw()
      .accounts({
        recipient: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    assert.ok(tx, "withdraw should return a transaction signature");
    console.log("  withdraw tx:", tx);
  });

  // ── Test 5: cancel stub ────────────────────────────────────────────────────
  // Alex owns this instruction — stub verifies it compiles and can be called.
  it("cancel — stub compiles and returns Ok", async () => {
    const tx = await program.methods
      .cancel()
      .accounts({
        creator: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    assert.ok(tx, "cancel should return a transaction signature");
    console.log("  cancel tx:", tx);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Week 4 test stubs (to be implemented by Alex)
//
// describe("withdraw — vesting math", () => {
//   it("returns NothingToClaim before cliff_time", async () => { ... });
//   it("returns correct linear vested amount at midpoint", async () => { ... });
//   it("returns full amount after end_time", async () => { ... });
//   it("prevents double-spend (second withdraw in same second)", async () => { ... });
// });
//
// describe("cancel — token split", () => {
//   it("sends 50% to recipient and 50% to creator at midpoint", async () => { ... });
//   it("sends 100% to recipient after full vesting", async () => { ... });
//   it("rejects StreamNotCancelable when is_cancelable == false", async () => { ... });
//   it("sends 100% to creator when cancelled before start_time", async () => { ... });
// });
// ─────────────────────────────────────────────────────────────────────────────
