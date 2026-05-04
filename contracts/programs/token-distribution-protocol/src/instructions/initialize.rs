use anchor_lang::prelude::*;

use crate::event::Initialized;

#[derive(Accounts)]
pub struct Initialize {}

pub fn handler(ctx: Context<Initialize>) -> Result<()> {
    msg!("Greetings from: {:?}", ctx.program_id);

    emit!(Initialized {
        program_id: *ctx.program_id,
    });

    Ok(())
}
