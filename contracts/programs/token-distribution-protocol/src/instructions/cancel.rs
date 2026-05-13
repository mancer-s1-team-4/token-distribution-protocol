// Alex — Week 4 full implementation.
//
// Cancel terminates a vesting stream mid-way. The key invariant:
//   - Vested tokens (minus what was already claimed) always go to the recipient.
//   - Unvested tokens return to the creator.
//   - All accounts are closed and rent is returned to the creator.
//
// This directly addresses the counterparty-risk concern raised in the Week 2
// architecture review: the creator cannot use cancel to reclaim tokens that
// have already vested, only unvested ones.
//
// Logic:
//   1. Guard: stream_data.is_cancelable must be true.
//   2. Compute vested at now via calculate_vested.
//   3. earned_unclaimed = vested - amount_claimed (may be 0 if already claimed).
//   4. unvested = amount_total - vested.
//   5. CPI transfer earned_unclaimed → recipient ATA (if > 0).
//   6. CPI transfer unvested → creator ATA (if > 0).
//   7. Close escrow_token_account; close stream_data. Rent → creator.

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{
        close_account, transfer, CloseAccount, Mint, Token, TokenAccount, Transfer,
    },
};

use crate::{error::VestingError, state::StreamData};

#[derive(Accounts)]
pub struct Cancel<'info> {
    /// The creator must sign. Verified by has_one on stream_data.
    #[account(mut)]
    pub creator: Signer<'info>,

    /// CHECK: Recipient is needed to derive the PDA and to receive vested tokens.
    /// Identity enforced by has_one on stream_data.
    #[account(mut)]
    pub recipient: UncheckedAccount<'info>,

    /// The vesting schedule PDA.
    /// Constraint: is_cancelable must be true — on-chain enforcement.
    /// close = creator: rent lamports returned to the creator on successful cancel.
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
        has_one = recipient @ VestingError::Unauthorized,
        has_one = mint @ VestingError::Unauthorized,
        constraint = stream_data.is_cancelable @ VestingError::StreamNotCancelable,
        close = creator,
    )]
    pub stream_data: Account<'info, StreamData>,

    /// PDA-owned escrow.
    /// Closed after token transfers so no lamports are stranded.
    #[account(
        mut,
        seeds = [b"escrow", stream_data.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = stream_data,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// Recipient's ATA — receives any vested-but-unclaimed tokens.
    #[account(
        init_if_needed,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = recipient,
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,

    /// Creator's ATA — receives unvested tokens returned from escrow.
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = creator,
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Cancel>) -> Result<()> {
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    // ── 1. Compute split ──────────────────────────────────────────────────────
    // Copy seed components into locals so the references outlive signer_seeds.
    let creator_key  = ctx.accounts.stream_data.creator;
    let recipient_key = ctx.accounts.stream_data.recipient;
    let stream_id_bytes = ctx.accounts.stream_data.stream_id.to_le_bytes();
    let bump_arr = [ctx.accounts.stream_data.bump];

    let vested = ctx.accounts.stream_data.calculate_vested(now);
    let earned_unclaimed = vested.saturating_sub(ctx.accounts.stream_data.amount_claimed);
    let unvested = ctx.accounts.stream_data.amount_total.saturating_sub(vested);

    // Build PDA signer seeds once — used for all CPIs below.
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"stream",
        creator_key.as_ref(),
        recipient_key.as_ref(),
        &stream_id_bytes,
        &bump_arr,
    ]];

    // ── 2. Send vested-but-unclaimed tokens to recipient ─────────────────────
    if earned_unclaimed > 0 {
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
            earned_unclaimed,
        )?;
    }

    // ── 3. Return unvested tokens to creator ──────────────────────────────────
    if unvested > 0 {
        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_token_account.to_account_info(),
                    to: ctx.accounts.creator_token_account.to_account_info(),
                    authority: ctx.accounts.stream_data.to_account_info(),
                },
                signer_seeds,
            ),
            unvested,
        )?;
    }

    // ── 4. Close escrow token account — rent to creator ──────────────────────
    close_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        CloseAccount {
            account: ctx.accounts.escrow_token_account.to_account_info(),
            destination: ctx.accounts.creator.to_account_info(),
            authority: ctx.accounts.stream_data.to_account_info(),
        },
        signer_seeds,
    ))?;

    // stream_data is closed by Anchor via close = creator on the account constraint.

    msg!(
        "cancel: {} tokens → recipient, {} tokens → creator",
        earned_unclaimed,
        unvested,
    );

    Ok(())
}
