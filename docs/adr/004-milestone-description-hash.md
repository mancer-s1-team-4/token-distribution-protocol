# ADR-004: Store Milestone Descriptions as SHA-256 Hashes, Not Strings

**Status:** Accepted
**Date:** 2026-06-11

---

## Context

Each milestone needs a human-readable description ("MVP shipped and audited", "10,000 monthly active users", etc.) so that the verifier and recipient can identify what they're confirming. The question is whether to store that text on-chain or off-chain.

Options considered:
1. Store the full description string as a `String` field in `Milestone`.
2. Store a fixed-size 32-byte SHA-256 hash of the description; keep the full text off-chain.

---

## Decision

Store a `[u8; 32]` SHA-256 hash. Full description text lives off-chain.

---

## Reasons

**1. On-chain storage is expensive**

Solana account space costs rent proportional to size. A 200-character description string adds 200 bytes per milestone. With up to 20 milestones per stream, that's 4 KB of additional account space for descriptions alone — roughly 0.03 SOL at current rent rates, just for text.

**2. Variable-length strings make account sizing non-deterministic**

Anchor's `#[account(init, space = ...)]` requires a fixed space value at account creation. A `String` field would require either a worst-case upper bound (wasting rent on short descriptions) or a dynamic reallocation instruction (added complexity and a second transaction).

A `[u8; 32]` is always exactly 32 bytes. Account space is deterministic at creation time.

**3. Content addressing enables off-chain verification**

Any party can verify the full description by hashing it with SHA-256 and comparing to the on-chain value. The hash is a commitment: once `add_milestone` is called, the creator cannot retroactively change what the milestone description says. The hash is as tamper-evident as the description string itself would be, while being 6–10× smaller.

**4. Verifiers operate off-chain anyway**

The milestone verifier receives the description through an off-chain channel (email, legal agreement, dashboard) to assess whether the milestone was met. They do not read the on-chain hash to make their decision — they check real-world outcomes. Storing the hash on-chain confirms the agreed description was set at stream creation; it does not need to be readable by the EVM to have effect.

---

## Tradeoffs

**Readability.** A Solana explorer showing `stream_data` will display 32 opaque bytes for each milestone description. There is no on-chain way to recover the original text.

**Off-chain dependency.** The integration layer (frontend, API) must store the description text and provide it to users alongside the stream data. If that off-chain store is lost, the descriptions become unrecoverable (though the hash remains verifiable if the text is found again).

For a protocol targeting finance ops teams who maintain their own agreement records, the off-chain dependency is acceptable. The on-chain hash is the integrity check; the off-chain text is the human interface.

---

## Consequences

- `add_milestone` accepts `description_hash: [u8; 32]`, not a string.
- Clients must SHA-256-hash the description before calling `add_milestone`.
- The frontend stores description text and associates it with the `(stream_data, milestone_index)` pair.
- `Milestone` account space is fixed and predictable regardless of description length.
