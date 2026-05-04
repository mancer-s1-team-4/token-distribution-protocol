use anchor_lang::prelude::*;

#[event]
pub struct Initialized {
    pub program_id: Pubkey,
}
