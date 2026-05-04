// TODO(arya): Implement full logic in Week 4.
// This stub satisfies the Week 3 acceptance criteria (program compiles with
// all required instruction handlers). Arya owns this instruction.
//
// Week 4 implementation will:
//   1. Validate all parameters (amount > 0, time ranges, milestone sums, etc.)
//   2. Initialize the StreamData PDA account
//   3. Initialize the EscrowTokenAccount (PDA-owned ATA)
//   4. CPI transfer: creator_token_account → escrow_token_account

use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(stream_id: u64)]
pub struct CreateStream<'info> {
    /// The wallet creating and funding the stream. Pays rent for new accounts.
    #[account(mut)]
    pub creator: Signer<'info>,

    /// CHECK: Recipient pubkey is stored in StreamData.
    /// Validated via has_one = recipient in withdraw and cancel.
    pub recipient: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

/// Stub handler — returns Ok(()) with no logic.
/// Full implementation in Week 4 by Arya.
pub fn handler(
    _ctx: Context<CreateStream>,
    _stream_id: u64,
    _amount: u64,
    _start_time: i64,
    _cliff_time: i64,
    _end_time: i64,
    _stream_type: u8,
    _is_cancelable: bool,
) -> Result<()> {
    Ok(())
}
