// Alex — Week 3 stub / Week 4 implementation owner.
//
// Week 4 implementation will:
//   1. Read StreamData: amount_total, amount_claimed, schedule fields
//   2. Compute vested via calculate_vested helper (Linear / Cliff+Linear / Milestone)
//   3. claimable = vested - amount_claimed; reject if claimable == 0
//   4. CPI transfer: escrow_token_account → recipient_token_account (init_if_needed)
//   5. Update stream_data.amount_claimed += claimable

use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    /// Must match stream_data.recipient — proves identity, no intermediary needed.
    #[account(mut)]
    pub recipient: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Stub handler — returns Ok(()) with no logic.
/// Full implementation in Week 4 by Alex.
pub fn handler(_ctx: Context<Withdraw>) -> Result<()> {
    Ok(())
}
