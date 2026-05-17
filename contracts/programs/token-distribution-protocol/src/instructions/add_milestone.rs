// Alex — Week 5 helper instruction.
//
// add_milestone lets the stream creator append a milestone entry to a
// Milestone-type stream (stream_type == 2). It is called once per milestone
// after create_stream and before any recipient activity begins.
//
// BD context (SClair, Week 3 interviews, interest 5/5):
//   "Milestone-linked liquidity ensures capital only reaches the recipient when
//    performance parameters are met transparently on-chain."
//   → Each milestone encodes one performance gate: its unlock amount, a
//     content-addressed description, and a verifier who can flip the gate.
//
// CEI pattern:
//   Checks:      creator signer, milestone-type stream, not cancelled,
//                milestone_count < MAX_MILESTONES
//   Effects:     push Milestone to vec, increment milestone_count
//   Interactions: none (no token movement)
//
// Logic:
//   1. Constraint: has_one = creator (Unauthorized if wrong).
//   2. Constraint: stream_type == Milestone (InvalidStreamType).
//   3. Constraint: not is_cancelled (StreamExpired).
//   4. Constraint: milestone_count < MAX_MILESTONES (TooManyMilestones).
//   5. Push new Milestone { amount, description_hash, is_verified: false, verifier }.
//   6. Increment milestone_count.

use anchor_lang::prelude::*;

use crate::{
    error::VestingError,
    state::{Milestone, StreamData},
};

#[derive(Accounts)]
pub struct AddMilestone<'info> {
    /// Only the stream creator may append milestones.
    #[account(mut)]
    pub creator: Signer<'info>,

    /// CHECK: recipient is needed only for PDA seed derivation.
    pub recipient: UncheckedAccount<'info>,

    /// The vesting schedule PDA.
    /// Constraints:
    ///   has_one = creator        → Unauthorized
    ///   stream_type == Milestone → InvalidStreamType
    ///   !is_cancelled            → StreamExpired
    ///   milestone_count < MAX    → TooManyMilestones
    #[account(
        mut,
        seeds = [
            b"stream",
            creator.key().as_ref(),
            recipient.key().as_ref(),
            &stream_data.stream_id.to_le_bytes(),
        ],
        bump = stream_data.bump,
        has_one = creator @ VestingError::Unauthorized,
        constraint = stream_data.stream_type == StreamData::STREAM_TYPE_MILESTONE
            @ VestingError::InvalidStreamType,
        constraint = !stream_data.is_cancelled @ VestingError::StreamExpired,
        constraint = (stream_data.milestone_count as usize) < (StreamData::MAX_MILESTONES as usize)
            @ VestingError::TooManyMilestones,
    )]
    pub stream_data: Account<'info, StreamData>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<AddMilestone>,
    amount: u64,
    description_hash: [u8; 32],
    verifier: Pubkey,
) -> Result<()> {
    let stream = &mut ctx.accounts.stream_data;

    // Guard: no milestones can be added once the recipient has started interacting
    // with the stream. This prevents the creator from reshaping the vesting schedule
    // after tokens have already begun flowing to the recipient.
    require!(
        stream.amount_claimed == 0 && stream.milestones.iter().all(|m| !m.is_verified),
        VestingError::StreamAlreadyComplete
    );

    stream.milestones.push(Milestone {
        amount,
        description_hash,
        is_verified: false,
        verifier,
    });

    // Guard: cumulative milestone amounts must not exceed the escrow balance.
    // An overfunded set would drain the escrow before all milestones can be claimed.
    let milestone_total: u64 = stream
        .milestones
        .iter()
        .map(|m| m.amount)
        .fold(0u64, |acc, a| acc.saturating_add(a));
    require!(
        milestone_total <= stream.amount_total,
        VestingError::MilestoneAmountMismatch
    );

    stream.milestone_count = stream.milestones.len() as u8;

    msg!(
        "add_milestone: milestone {} added to stream {} — {} tokens, verifier {}",
        stream.milestone_count - 1,
        stream.stream_id,
        amount,
        verifier,
    );

    Ok(())
}
