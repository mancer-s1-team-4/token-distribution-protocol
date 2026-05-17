use anchor_lang::prelude::*;

/// All custom program errors for the Token Distribution Protocol.
/// 16 variants covering every validation failure across all 4 instructions.
/// Error codes start at 6000 (Anchor offset).
#[error_code]
pub enum VestingError {
    // ── create_stream validations ────────────────────────────────────────────
    #[msg("amount must be greater than zero")]
    InvalidAmount,

    #[msg("end_time must be after start_time")]
    InvalidTimeRange,

    #[msg("cliff_time must be within [start_time, end_time]")]
    InvalidCliffTime,

    #[msg("creator token balance is insufficient")]
    InsufficientFunds,

    #[msg("creator and recipient cannot be the same wallet")]
    SelfVesting,

    #[msg("milestone amounts must sum to amount_total")]
    MilestoneAmountMismatch,

    #[msg("maximum of 20 milestones allowed per stream")]
    TooManyMilestones,

    // ── shared authorization ─────────────────────────────────────────────────
    #[msg("signer is not authorized for this instruction")]
    Unauthorized,

    // ── withdraw validations ─────────────────────────────────────────────────
    #[msg("stream has not started yet")]
    StreamNotStarted,

    #[msg("no tokens are available to claim at this time")]
    NothingToClaim,

    // ── cancel validations ───────────────────────────────────────────────────
    #[msg("this stream does not allow cancellation")]
    StreamNotCancelable,

    #[msg("stream is already fully claimed")]
    StreamAlreadyComplete,

    #[msg("stream has already been cancelled")]
    AlreadyCancelled,

    #[msg("stream is already fully vested and cannot be cancelled")]
    FullyVested,

    #[msg("stream has been cancelled")]
    StreamExpired,

    #[msg("no tokens are available to withdraw at this time")]
    NothingToWithdraw,

    // ── verify_milestone validations ─────────────────────────────────────────
    #[msg("milestone index out of bounds")]
    InvalidMilestoneIndex,

    #[msg("this milestone has already been verified")]
    MilestoneAlreadyVerified,

    // ── arithmetic safety ────────────────────────────────────────────────────
    #[msg("arithmetic overflow in vesting calculation")]
    ArithmeticOverflow,

    #[msg("invalid stream type — must be 0 (Linear), 1 (Cliff+Linear), or 2 (Milestone)")]
    InvalidStreamType,
}
