const ANCHOR_ERROR_MESSAGES = new Map<number, string>([
  [0x1770, "Amount must be greater than zero."],
  [0x1771, "The end date must be after the start date."],
  [0x1772, "The lock date must be between the start and end dates."],
  [0x1773, "Your wallet does not have enough tokens to fund this agreement."],
  [0x1774, "You cannot create an agreement with yourself as the recipient."],
  [0x1775, "Milestone amounts must add up to the total amount."],
  [0x1776, "A maximum of 20 milestones is allowed per agreement."],
  [0x1777, "You are not authorized to perform this action."],
  [0x1778, "This stream has not started yet."],
  [0x1779, "No tokens are available to withdraw right now."],
  [0x177a, "This stream does not allow cancellation."],
  [0x177b, "This stream is already fully claimed."],
  [0x177c, "This stream has already been cancelled."],
  [0x177d, "This stream is already fully vested and cannot be cancelled."],
  [0x177e, "This stream has been cancelled."],
  [0x177f, "Milestone index is out of bounds."],
  [0x1780, "This milestone has already been verified."],
  [0x1781, "Vesting calculation overflowed. Try a smaller amount."],
  [0x1782, "Invalid stream type."],
  [0x1783, "Mock token mint amount is too large."],
]);

export function friendlyError(raw: string): string {
  const customError = raw.match(/custom program error: 0x([0-9a-f]+)/i);
  if (customError) {
    const code = Number.parseInt(customError[1], 16);
    const message = ANCHOR_ERROR_MESSAGES.get(code);
    if (message) {
      return message;
    }
  }

  if (/invalid public key/i.test(raw)) {
    return "One of the addresses you entered is not a valid wallet address. Check the Recipient wallet and Token contract address fields.";
  }
  if (/user rejected/i.test(raw) || /rejected/i.test(raw)) {
    return "You cancelled the transaction in your wallet. No tokens were moved.";
  }
  if (
    /NO_DEVNET_SOL/i.test(raw) ||
    /Attempt to debit an account but found no record of a prior credit/i.test(raw)
  ) {
    return "This wallet needs devnet SOL before it can mint mock tokens. Fund the wallet from a Solana devnet faucet, then try again.";
  }
  if (
    /NO_CREATOR_TOKEN_ACCOUNT/i.test(raw) ||
    (/(AccountNotInitialized|3012)/i.test(raw) && /creator_token_account/i.test(raw))
  ) {
    return "You don't have a token account for this token. You need to hold some of this token in your wallet before you can stream it. If you're testing, use the Devnet testing tools to mint mock tokens first.";
  }
  if (/AccountNotInitialized|3012/i.test(raw)) {
    return "A required account hasn't been set up yet. Make sure the token exists on devnet and you hold a balance of it.";
  }
  if (/insufficient/i.test(raw)) {
    return "Your wallet does not have enough tokens to fund this agreement.";
  }
  if (/429|too many requests|rate.?limit/i.test(raw)) {
    return "The Solana RPC is rate-limiting requests. Use a dedicated devnet RPC endpoint in NEXT_PUBLIC_RPC_URL, then redeploy.";
  }
  if (/fallback/i.test(raw) || /instruction.*not.*found/i.test(raw)) {
    return "Mint mock token is not available on the deployed program yet. Run pnpm run upgrade:devnet from contracts, then refresh this page.";
  }
  if (/Transaction failed/i.test(raw)) {
    return "The transaction did not go through. Check your inputs and try again.";
  }
  return raw;
}
