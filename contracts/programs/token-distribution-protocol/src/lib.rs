use anchor_lang::prelude::*;

pub mod constant;
pub mod error;
pub mod event;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("J4zBUJeaXA26nV6i9Jz45t4hfwNrsxZ96g5ozhwALfX3");

#[program]
pub mod token_distribution_protocol {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::handler(ctx)
    }
}
