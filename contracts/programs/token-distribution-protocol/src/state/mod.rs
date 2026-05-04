use anchor_lang::prelude::*;

use crate::constant::ACCOUNT_DISCRIMINATOR_SIZE;

#[account]
#[derive(InitSpace)]
pub struct ProtocolState {
    pub authority: Pubkey,
    pub bump: u8,
}

impl ProtocolState {
    pub const SPACE: usize = ACCOUNT_DISCRIMINATOR_SIZE + Self::INIT_SPACE;
}
