use anchor_lang::prelude::*;

pub mod constant;
pub mod error;
pub mod event;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("J4zBUJeaXA26nV6i9Jz45t4hfwNrsxZ96g5ozhwALfX3");

#[program]
pub mod token_distribution_protocol {
    use super::*;

    // ── Scaffold (Arya) ──────────────────────────────────────────────────────
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::handler(ctx)
    }

    // ── create_stream (Arya — Week 4 implementation) ─────────────────────────
    /// Locks tokens in a PDA-owned escrow and writes the vesting schedule.
    #[allow(clippy::too_many_arguments)]
    pub fn create_stream(
        ctx: Context<CreateStream>,
        stream_id: u64,
        amount: u64,
        start_time: i64,
        cliff_time: i64,
        end_time: i64,
        stream_type: u8,
        is_cancelable: bool,
    ) -> Result<()> {
        instructions::create_stream::handler(
            ctx,
            stream_id,
            amount,
            start_time,
            cliff_time,
            end_time,
            stream_type,
            is_cancelable,
        )
    }

    // ── withdraw (Week 4 implementation) ─────────────────────────────────────
    /// Recipient claims vested tokens. Calculates claimable = vested - amount_claimed.
    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        instructions::withdraw::handler(ctx)
    }

    // ── cancel (Alex — Week 4 / Week 5 hardened) ─────────────────────────────
    /// Creator terminates a cancelable stream. Vested → recipient,
    /// unvested → creator. Errors: StreamNotCancelable, AlreadyCancelled, FullyVested.
    pub fn cancel(ctx: Context<Cancel>) -> Result<()> {
        instructions::cancel::handler(ctx)
    }

    // ── add_milestone (Alex — Week 5) ────────────────────────────────────────
    /// Appends a milestone entry to a Milestone-type stream. Called by the
    /// creator after create_stream to configure each performance gate before
    /// recipient activity begins.
    pub fn add_milestone(
        ctx: Context<AddMilestone>,
        amount: u64,
        description_hash: [u8; 32],
        verifier: Pubkey,
    ) -> Result<()> {
        instructions::add_milestone::handler(ctx, amount, description_hash, verifier)
    }

    // ── verify_milestone (Alex — Week 5) ─────────────────────────────────────
    /// Designated verifier marks a milestone as complete, unlocking its tokens
    /// for the recipient to withdraw. BD insight: SClair (investor, 5/5 interest)
    /// requires milestone-linked liquidity for performance-gated capital release.
    pub fn verify_milestone(
        ctx: Context<VerifyMilestone>,
        milestone_index: u8,
    ) -> Result<()> {
        instructions::verify_milestone::handler(ctx, milestone_index)
    }
}
