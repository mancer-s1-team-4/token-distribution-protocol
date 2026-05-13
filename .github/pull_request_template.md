## Description

<!--
Explain the problem, user need, and solution in reviewer-friendly language.
Link issues, specs, tickets, or design docs when applicable.
-->

## Context

<!--
What background does a reviewer need before reading the diff?
Example:
- Week 4 scope is core token vesting logic.
- The creator funds a stream, tokens are held by a PDA-owned escrow, and the recipient withdraws vested tokens over time.
- This PR intentionally does not include cancellation / milestone vesting / devnet deployment.
-->

## What Changed

<!--
List the main implementation changes. Prefer behavior-oriented bullets over file-only bullets.
Example:
- Added create_stream validation for amount, time range, cliff range, stream type, and self-vesting.
- Initialized StreamData with creator, recipient, mint, escrow, schedule, and bump metadata.
- Added withdraw coverage for 0%, 25%, 50%, 100%, partial, full, and unauthorized claims.
-->

- 

## Key Design Decisions

<!--
Call out choices that affect architecture, security, future maintenance, or reviewer expectations.
Example:
- Escrow authority is the StreamData PDA so neither creator nor recipient can directly move locked funds.
- Stream PDA seeds include creator, recipient, and stream_id to support multiple streams between the same pair.
- Linear vesting uses u128 intermediate math to avoid overflow before casting back to u64.
- Tests set start_time in the past instead of mutating validator time.
-->

- Decision:
  - Why:
  - Tradeoff:

## Alternatives Considered

<!--
Mention important options you did not choose and why.
Example:
- Used PDA-owned token account instead of creator-owned ATA to prevent creator clawback.
- Used one test file per instruction to keep acceptance criteria easier to locate.
-->

- 

## Changelog

<!-- Use concise, reviewer-friendly bullets. -->

- Added:
- Changed:
- Fixed:
- Removed:

## Testing

<!--
Describe exact commands run and results. Include failing/blocking output when relevant.
For on-chain changes, include both automated and manual test evidence where possible.
-->

- [ ] `rtk anchor build`
- [ ] `rtk anchor test`
- [ ] Manual localnet test:
- [ ] Manual devnet test:

## Test Coverage Notes

<!--
Map tests to behavior, especially for acceptance criteria and failure cases.
Example:
- create_stream: initializes StreamData and locks the full amount in escrow.
- withdraw: validates 0%, 25%, 50%, and 100% linear unlock.
- withdraw: rejects unauthorized signer and nothing-to-claim cases.
-->

- 

## Screenshots / Logs

<!-- Optional. Add screenshots, transaction signatures, explorer links, or relevant logs. -->

## Security / Account Model

<!--
Explain authorization, PDA ownership, token movement, and account constraints.
Example:
- Who must sign each instruction?
- Which accounts are PDAs and what are their seeds?
- Which token accounts can transfer funds?
- What prevents unauthorized withdrawal or creator clawback?
-->

- 

## Risk Notes

- [ ] Changes on-chain account layout
- [ ] Changes instruction account constraints
- [ ] Changes token transfer behavior
- [ ] Changes PDA seeds
- [ ] Changes custom errors / IDL
- [ ] Requires program redeploy
- [ ] Requires migration or state reset

## Deployment / Operations Notes

<!--
Include deployment requirements, program ID changes, upgrade authority notes, migrations, or manual verification steps.
Example:
- Program ID unchanged.
- Requires redeploy because instruction account schema changed.
- Devnet transaction signatures:
-->

- 

## Reviewer Checklist

- [ ] Scope is clear and limited to the PR goal
- [ ] Key design decisions and tradeoffs are explained
- [ ] Tests cover success and failure cases
- [ ] Error messages are clear for expected failures
- [ ] Account constraints enforce expected authorization
- [ ] Token transfers cannot be triggered by unauthorized signers
- [ ] Program IDs and Anchor.toml are unchanged or intentionally updated
- [ ] No unrelated refactors or generated churn
