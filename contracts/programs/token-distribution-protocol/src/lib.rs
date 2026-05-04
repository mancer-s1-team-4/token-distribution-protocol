use anchor_lang::prelude::*;

declare_id!("J4zBUJeaXA26nV6i9Jz45t4hfwNrsxZ96g5ozhwALfX3");

#[program]
pub mod token_distribution_protocol {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
