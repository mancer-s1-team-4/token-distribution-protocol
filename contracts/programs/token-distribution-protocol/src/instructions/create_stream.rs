// Arya — owns the final Week 4 version of this instruction.
// Alex — implemented a working version to unblock the withdraw/cancel test suite.
//
// This replaces the stub with real account initialization and token transfer
// so integration tests can create live streams and test withdraw/cancel logic.
// Arya can extend or override this implementation as needed.
//
// Logic:
//   1. Validate: amount > 0, end > start, cliff within [start, end], stream_type valid.
//   2. Init stream_data PDA — seeds: ["stream", creator, recipient, stream_id_le].
//   3. Init escrow token account — PDA-owned, seeds: ["escrow", stream_data].
//   4. CPI: transfer `amount` tokens from creator ATA → escrow.
//   5. Populate all StreamData fields.

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{transfer, Mint, Token, TokenAccount, Transfer},
};

use crate::{error::VestingError, state::StreamData};

#[derive(Accounts)]
#[instruction(stream_id: u64)]
pub struct CreateStream<'info> {
    /// The wallet creating and funding the stream. Pays rent for all new accounts.
    #[account(mut)]
    pub creator: Signer<'info>,

    /// CHECK: Recipient pubkey stored in StreamData.
    /// Enforced via has_one in withdraw and cancel.
    pub recipient: UncheckedAccount<'info>,

    /// The vesting schedule PDA.
    /// Seeds: ["stream", creator, recipient, stream_id.to_le_bytes()]
    #[account(
        init,
        payer = creator,
        space = StreamData::SPACE,
        seeds = [
            b"stream",
            creator.key().as_ref(),
            recipient.key().as_ref(),
            &stream_id.to_le_bytes(),
        ],
        bump,
    )]
    pub stream_data: Account<'info, StreamData>,

    /// PDA-owned escrow that holds the locked tokens.
    /// Seeds: ["escrow", stream_data]
    /// Authority is stream_data so only the program can move tokens out.
    #[account(
        init,
        payer = creator,
        seeds = [b"escrow", stream_data.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = stream_data,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// Creator's source ATA — tokens are pulled from here into escrow.
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = creator,
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    /// The SPL token being vested.
    pub mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[allow(clippy::too_many_arguments)]
pub fn handler(
    ctx: Context<CreateStream>,
    stream_id: u64,
    amount: u64,
    start_time: i64,
    cliff_time: i64,
    end_time: i64,
    stream_type: u8,
    is_cancelable: bool,
) -> Result<()> {
    // ── 1. Validate parameters ────────────────────────────────────────────────
    require!(amount > 0, VestingError::InvalidAmount);
    require!(end_time > start_time, VestingError::InvalidTimeRange);
    require!(
        cliff_time >= start_time && cliff_time <= end_time,
        VestingError::InvalidCliffTime
    );
    require!(
        stream_type <= StreamData::STREAM_TYPE_MILESTONE,
        VestingError::InvalidStreamType
    );
    require!(
        ctx.accounts.creator.key() != ctx.accounts.recipient.key(),
        VestingError::SelfVesting
    );
    require!(
        ctx.accounts.creator_token_account.amount >= amount,
        VestingError::InsufficientFunds
    );

    // ── 2. CPI: lock tokens in escrow ─────────────────────────────────────────
    transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.creator_token_account.to_account_info(),
                to: ctx.accounts.escrow_token_account.to_account_info(),
                authority: ctx.accounts.creator.to_account_info(),
            },
        ),
        amount,
    )?;

    // ── 3. Populate StreamData ────────────────────────────────────────────────
    let stream = &mut ctx.accounts.stream_data;
    let bump = ctx.bumps.stream_data;

    stream.creator = ctx.accounts.creator.key();
    stream.recipient = ctx.accounts.recipient.key();
    stream.mint = ctx.accounts.mint.key();
    stream.escrow_token_account = ctx.accounts.escrow_token_account.key();
    stream.stream_id = stream_id;
    stream.amount_total = amount;
    stream.amount_claimed = 0;
    stream.start_time = start_time;
    stream.cliff_time = cliff_time;
    stream.end_time = end_time;
    stream.stream_type = stream_type;
    stream.is_cancelable = is_cancelable;
    stream.milestone_count = 0;
    stream.milestones = Vec::new();
    stream.bump = bump;

    msg!(
        "create_stream: stream {} created. {} tokens locked. Linear vesting {} → {}",
        stream_id,
        amount,
        start_time,
        end_time,
    );

    Ok(())
}
