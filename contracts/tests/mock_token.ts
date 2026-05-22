import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
} from "@solana/spl-token";
import { assert } from "chai";
import { TokenDistributionProtocol } from "../target/types/token_distribution_protocol";

function mockMintPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("mock_mint")], programId);
}

describe("mock_token", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace
    .tokenDistributionProtocol as Program<TokenDistributionProtocol>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const minter = provider.wallet as anchor.Wallet;

  it("initializes the mock mint and mints test tokens to the caller", async () => {
    const [mockMint] = mockMintPda(program.programId);
    const minterTokenAccount = getAssociatedTokenAddressSync(
      mockMint,
      minter.publicKey
    );

    await program.methods
      .mintMockTokens(new BN(10_000))
      .accountsPartial({
        minter: minter.publicKey,
        mockMint,
        minterTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const mint = await getMint(provider.connection, mockMint);
    const tokenAccount = await getAccount(
      provider.connection,
      minterTokenAccount
    );

    assert.equal(mint.decimals, 0);
    assert.ok(mint.mintAuthority?.equals(mockMint));
    assert.equal(Number(tokenAccount.amount), 10_000);
  });

  it("rejects mints above the per-transaction faucet limit", async () => {
    const [mockMint] = mockMintPda(program.programId);
    const minterTokenAccount = getAssociatedTokenAddressSync(
      mockMint,
      minter.publicKey
    );

    try {
      await program.methods
        .mintMockTokens(new BN(1_000_001))
        .accountsPartial({
          minter: minter.publicKey,
          mockMint,
          minterTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      assert.fail("Expected MockTokenMintTooLarge");
    } catch (err: any) {
      assert.include(err.message ?? String(err), "MockTokenMintTooLarge");
    }
  });
});
