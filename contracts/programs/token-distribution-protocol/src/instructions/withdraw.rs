// Alex — Week 4 full implementation.
//
// Logic:
//   1. Verify signer is stream_data.recipient (enforced by has_one).
//   2. Call calculate_vested(now) to get total tokens earned so far.
//   3. claimable = vested - amount_claimed. Reject if 0 (NothingToClaim).
//   4. CPI: transfer claimable tokens from escrow → recipient ATA.
//      The escrow is a PDA-owned token account; the program signs with
//      ["stream", creator, recipient, stream_id] seeds + bump.
//   5. Increment stream_data.amount_claimed by claimable.

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{transfer, Mint, Token, TokenAccount, Transfer},
};

use crate::{error::VestingError, state::StreamData};

#[derive(Accounts)]
pub struct Withdraw<'info> {
    /// The recipient must sign — ensures nobody else can claim on their behalf.
    #[account(mut)]
    pub recipient: Signer<'info>,

    /// CHECK: Creator is needed only for PDA seed derivation; no signing required.
    pub creator: UncheckedAccount<'info>,

    /// The vesting schedule PDA.
    /// Seeds: ["stream", creator, recipient, stream_id.to_le_bytes()]
    /// has_one = recipient enforces that the signer is the rightful claimant.
    #[account(
        mut,
        seeds = [
            b"stream",
            creator.key().as_ref(),
            recipient.key().as_ref(),
            &stream_data.stream_id.to_le_bytes(),
        ],
        bump = stream_data.bump,
        has_one = recipient @ VestingError::Unauthorized,
        has_one = mint @ VestingError::Unauthorized,
    )]
    pub stream_data: Account<'info, StreamData>,

    /// PDA-owned escrow holding the locked tokens.
    /// Seeds: ["escrow", stream_data]
    #[account(
        mut,
        seeds = [b"escrow", stream_data.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = stream_data,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// Recipient's token account for this mint.
    /// Created automatically if it doesn't exist yet (init_if_needed).
    #[account(
        init_if_needed,
        payer = recipient,
        associated_token::mint = mint,
        associated_token::authority = recipient,
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,

    /// SPL token mint — verified transitively via stream_data.has_one.
    pub mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Withdraw>) -> Result<()> {
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    // ── 1. Compute vested and claimable ──────────────────────────────────────
    // Read everything we need from stream_data up front so we can release the
    // shared borrow before the mutable update at the end.
    let vested = ctx.accounts.stream_data.calculate_vested(now);
    let claimable = vested
        .checked_sub(ctx.accounts.stream_data.amount_claimed)
        .unwrap_or(0);

    require!(claimable > 0, VestingError::NothingToClaim);

    // Copy seed components into locals — they must outlive the signer_seeds slice.
    let creator_key = ctx.accounts.stream_data.creator;
    let recipient_key = ctx.accounts.stream_data.recipient;
    let stream_id_bytes = ctx.accounts.stream_data.stream_id.to_le_bytes();
    let bump_arr = [ctx.accounts.stream_data.bump];
    let old_claimed = ctx.accounts.stream_data.amount_claimed;

    // ── 2. CPI: transfer claimable tokens from escrow → recipient ATA ────────
    // stream_data is the PDA authority over the escrow; sign with its seeds.
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"stream",
        creator_key.as_ref(),
        recipient_key.as_ref(),
        &stream_id_bytes,
        &bump_arr,
    ]];

    transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.recipient_token_account.to_account_info(),
                authority: ctx.accounts.stream_data.to_account_info(),
            },
            signer_seeds,
        ),
        claimable,
    )?;

    // ── 3. Update claimed counter ─────────────────────────────────────────────
    let new_claimed = old_claimed
        .checked_add(claimable)
        .ok_or(VestingError::ArithmeticOverflow)?;
    ctx.accounts.stream_data.amount_claimed = new_claimed;

    msg!(
        "withdraw: {} tokens transferred to recipient (total claimed: {})",
        claimable,
        new_claimed,
    );

    Ok(())
}
