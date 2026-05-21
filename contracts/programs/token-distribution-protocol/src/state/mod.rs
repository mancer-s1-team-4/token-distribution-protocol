use anchor_lang::prelude::*;

use crate::constant::ACCOUNT_DISCRIMINATOR_SIZE;

// ── Milestone ─────────────────────────────────────────────────────────────────
// Nested inside StreamData for milestone-type streams (stream_type == 2).
// Each entry represents one deliverable that unlocks a tranche of tokens when
// verified by the designated verifier.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct Milestone {
    /// Tokens unlocked when this milestone is verified.
    pub amount: u64,
    /// SHA-256 hash of the milestone description string — fixed-size, prevents
    /// unbounded on-chain storage while still allowing off-chain verification.
    pub description_hash: [u8; 32],
    /// Flipped to true by verify_milestone — this is what allows withdrawal of
    /// this milestone's tranche.
    pub is_verified: bool,
    /// Only this pubkey may call verify_milestone for this entry.
    /// Can be an oracle, a multisig member, or a DAO treasury.
    pub verifier: Pubkey,
}

// ── StreamData PDA ────────────────────────────────────────────────────────────
// The core on-chain record for every vesting stream. Address is deterministic:
//   seeds = ["stream", creator, recipient, stream_id.to_le_bytes()]
// No private key controls this account — only the vesting program can act on it.
#[account]
#[derive(InitSpace)]
pub struct StreamData {
    /// Wallet that created and funded the stream.
    pub creator: Pubkey,
    /// Wallet that receives vested tokens.
    pub recipient: Pubkey,
    /// SPL token mint being distributed.
    pub mint: Pubkey,
    /// Address of the PDA-owned escrow token account.
    pub escrow_token_account: Pubkey,
    /// Unique ID used to derive this PDA — caller-chosen, allows multiple
    /// parallel streams between the same two wallets.
    pub stream_id: u64,
    /// Total tokens locked at creation (raw units).
    pub amount_total: u64,
    /// Running total of tokens already withdrawn — the on-chain audit trail.
    /// Incremented on every successful withdraw call.
    pub amount_claimed: u64,
    /// Unix timestamp when vesting begins.
    pub start_time: i64,
    /// Unix timestamp of first unlock.
    /// Set equal to start_time if no cliff is wanted.
    pub cliff_time: i64,
    /// Unix timestamp when all tokens are fully vested.
    pub end_time: i64,
    /// 0 = Linear  |  1 = Cliff + Linear  |  2 = Milestone
    pub stream_type: u8,
    /// If false, the cancel instruction is permanently blocked for this stream —
    /// a hardcoded payment guarantee for the recipient.
    pub is_cancelable: bool,
    /// Set to true when the creator cancels the stream.
    /// Persisted so downstream instructions (withdraw, add_milestone) can gate on it.
    pub is_cancelled: bool,
    /// Number of milestones (0 for time-based streams).
    pub milestone_count: u8,
    /// Milestone conditions and unlock amounts. Only populated for stream_type == 2.
    #[max_len(20)]
    pub milestones: Vec<Milestone>,
    /// PDA canonical bump — stored to avoid recomputing on every instruction.
    pub bump: u8,
}

impl StreamData {
    pub const SPACE: usize = ACCOUNT_DISCRIMINATOR_SIZE + Self::INIT_SPACE;

    // Stream type constants
    pub const STREAM_TYPE_LINEAR: u8 = 0;
    pub const STREAM_TYPE_CLIFF_LINEAR: u8 = 1;
    pub const STREAM_TYPE_MILESTONE: u8 = 2;

    pub const MAX_MILESTONES: u8 = 20;

    // ── Vesting math ──────────────────────────────────────────────────────────
    /// Returns total tokens vested up to `now` (not yet claimed).
    ///
    /// Formula (Linear / Cliff+Linear):
    ///   vested = amount_total * elapsed / duration   — capped at amount_total
    ///
    /// Uses u128 intermediate values to prevent overflow on large amounts.
    /// For Milestone streams, sums all verified milestone amounts.
    ///
    /// Edge cases:
    ///   • now < cliff_time  → 0 (nothing unlocked yet)
    ///   • now >= end_time   → amount_total (fully vested)
    ///   • duration == 0     → amount_total (defensive guard)
    pub fn calculate_vested(&self, now: i64) -> u64 {
        match self.stream_type {
            // ── Milestone ─────────────────────────────────────────────────────
            Self::STREAM_TYPE_MILESTONE => {
                self.milestones
                    .iter()
                    .filter(|m| m.is_verified)
                    .map(|m| m.amount)
                    .fold(0u64, |acc, a| acc.saturating_add(a))
            }

            // ── Linear and Cliff+Linear ────────────────────────────────────
            _ => {
                // Nothing vested before the cliff.
                if now < self.cliff_time {
                    return 0;
                }
                // Fully vested after end_time.
                if now >= self.end_time {
                    return self.amount_total;
                }

                let duration = (self.end_time - self.start_time) as u128;
                // Guard against degenerate streams (start == end).
                if duration == 0 {
                    return self.amount_total;
                }

                let elapsed = (now - self.start_time).max(0) as u128;

                // u128 prevents overflow: max u64 * max u64 = 3.4e38 < u128::MAX.
                let vested = (self.amount_total as u128)
                    .checked_mul(elapsed)
                    .unwrap_or(u128::MAX)
                    / duration;

                // Cap at amount_total (saturating cast back to u64).
                vested.min(self.amount_total as u128) as u64
            }
        }
    }
}

// ── ProtocolState ─────────────────────────────────────────────────────────────
// Kept from the scaffold for the initialize instruction.
#[account]
#[derive(InitSpace)]
pub struct ProtocolState {
    pub authority: Pubkey,
    pub bump: u8,
}

impl ProtocolState {
    pub const SPACE: usize = ACCOUNT_DISCRIMINATOR_SIZE + Self::INIT_SPACE;
}
