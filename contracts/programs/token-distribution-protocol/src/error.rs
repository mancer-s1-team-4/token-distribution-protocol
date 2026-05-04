use anchor_lang::prelude::*;

#[error_code]
pub enum ProtocolError {
    #[msg("Invalid protocol state.")]
    InvalidProtocolState,
}
