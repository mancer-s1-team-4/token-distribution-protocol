// Alex — Week 5 new instruction.
//
// verify_milestone allows the designated verifier for a milestone to mark it
// as completed. Once verified, calculate_vested() includes that milestone's
// token amount in the unlocked total, and the recipient can withdraw it.
//
// BD context (SClair, Week 3 interviews, interest 5/5):
//   "Milestone-linked liquidity ensures capital only reaches the recipient when
//    performance parameters are met transparently on-chain."
//   → The verifier is the on-chain enforcement of that performance check.
//     It can be a multisig, an oracle, or the investor themselves.
//
// CEI pattern:
//   Checks:      milestone index bounds, not already verified, verifier is signer
//   Effects:     milestone.is_verified = true
//   Interactions: none (no token movement; withdraw handles that)
//
// Logic:
//   1. Bounds check: milestone_index < stream_data.milestone_count.
//   2. Load milestone; require !is_verified (MilestoneAlreadyVerified).
//   3. Require ctx.signer == milestone.verifier (Unauthorized).
//   4. Set milestone.is_verified = true.
//   5. Emit log.

use anchor_lang::prelude::*;

use crate::{error::VestingError, state::StreamData};

#[derive(Accounts)]
#[instruction(milestone_index: u8)]
pub struct VerifyMilestone<'info> {
    /// The verifier stored in the target milestone must sign.
    /// We cannot validate this at the account constraint level (it depends on
    /// the milestone_index argument), so the check lives in the handler.
    #[account(mut)]
    pub verifier: Signer<'info>,

    /// CHECK: Creator is needed only for PDA seed derivation.
    pub creator: UncheckedAccount<'info>,

    /// CHECK: Recipient is needed only for PDA seed derivation.
    pub recipient: UncheckedAccount<'info>,

    /// The vesting schedule PDA.
    /// must be a Milestone-type stream; handler validates milestone_index.
    #[account(
        mut,
        seeds = [
            b"stream",
            creator.key().as_ref(),
            recipient.key().as_ref(),
            &stream_data.stream_id.to_le_bytes(),
        ],
        bump = stream_data.bump,
        constraint = !stream_data.is_cancelled @ VestingError::StreamExpired,
    )]
    pub stream_data: Account<'info, StreamData>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<VerifyMilestone>, milestone_index: u8) -> Result<()> {
    let stream = &mut ctx.accounts.stream_data;

    // ── Checks ────────────────────────────────────────────────────────────────

    // Milestone index must be within the populated slice.
    require!(
        (milestone_index as usize) < stream.milestones.len(),
        VestingError::InvalidMilestoneIndex
    );

    let milestone = &stream.milestones[milestone_index as usize];

    // Idempotency guard — prevents double-counting a milestone's tokens.
    require!(!milestone.is_verified, VestingError::MilestoneAlreadyVerified);

    // Only the designated verifier for this specific milestone may call this.
    // This allows different milestones to have different verifiers (e.g. one
    // milestone verified by a technical auditor, another by the investor).
    require!(
        milestone.verifier == ctx.accounts.verifier.key(),
        VestingError::Unauthorized
    );

    // ── Effects ───────────────────────────────────────────────────────────────
    stream.milestones[milestone_index as usize].is_verified = true;

    msg!(
        "verify_milestone: milestone {} verified for stream {}. {} tokens now unlocked.",
        milestone_index,
        stream.stream_id,
        stream.milestones[milestone_index as usize].amount,
    );

    Ok(())
}
