use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{mint_to, Mint, MintTo, Token, TokenAccount},
};

use crate::error::VestingError;

pub const MOCK_TOKEN_DECIMALS: u8 = 0;
pub const MAX_MOCK_TOKEN_MINT: u64 = 1_000_000;

#[derive(Accounts)]
pub struct MintMockTokens<'info> {
    /// Wallet requesting test tokens. Pays rent if the mint or ATA does not exist yet.
    #[account(mut)]
    pub minter: Signer<'info>,

    /// Program-owned mock token mint used only for demos and vesting tests.
    #[account(
        init_if_needed,
        payer = minter,
        seeds = [b"mock_mint"],
        bump,
        mint::decimals = MOCK_TOKEN_DECIMALS,
        mint::authority = mock_mint,
        mint::freeze_authority = mock_mint,
    )]
    pub mock_mint: Account<'info, Mint>,

    /// Minter ATA for the mock mint. Created automatically on first mint.
    #[account(
        init_if_needed,
        payer = minter,
        associated_token::mint = mock_mint,
        associated_token::authority = minter,
    )]
    pub minter_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<MintMockTokens>, amount: u64) -> Result<()> {
    require!(amount > 0, VestingError::InvalidAmount);
    require!(
        amount <= MAX_MOCK_TOKEN_MINT,
        VestingError::MockTokenMintTooLarge
    );

    let bump = [ctx.bumps.mock_mint];
    let signer_seeds: &[&[&[u8]]] = &[&[b"mock_mint", &bump]];

    mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mock_mint.to_account_info(),
                to: ctx.accounts.minter_token_account.to_account_info(),
                authority: ctx.accounts.mock_mint.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
    )?;

    msg!(
        "mint_mock_tokens: minted {} mock tokens to {}",
        amount,
        ctx.accounts.minter.key()
    );

    Ok(())
}
