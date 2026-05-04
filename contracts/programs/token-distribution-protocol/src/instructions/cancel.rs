// Alex — Week 3 stub / Week 4 implementation owner.
//
// Week 4 implementation will:
//   1. Guard: stream_data.is_cancelable == true (StreamNotCancelable if false)
//   2. Compute vested at the moment cancel is called
//   3. earned_unclaimed = vested - amount_claimed
//   4. unvested = amount_total - vested
//   5. CPI transfer earned_unclaimed → recipient_token_account (if > 0)
//   6. CPI transfer unvested → creator_token_account (if > 0)
//   7. Close escrow_token_account and stream_data — rent returned to creator
//
// Key design rule: vested tokens always go to the recipient first.
// The creator can NEVER use cancel to reclaim tokens that have already vested.
// This is the direct answer to Vharel's counterparty risk concern.

use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct Cancel<'info> {
    /// Must match stream_data.creator.
    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Stub handler — returns Ok(()) with no logic.
/// Full implementation in Week 4 by Alex.
pub fn handler(_ctx: Context<Cancel>) -> Result<()> {
    Ok(())
}
