# Vestra User Guide

> Everything you need to send tokens on autopilot — no crypto experience required.

---

## Table of Contents

1. [What is Vestra?](#1-what-is-vestra)
2. [Step 1 — Connect a Wallet](#2-step-1--connect-a-wallet)
3. [Step 2 — The Agreements Page](#3-step-2--the-agreements-page)
4. [Step 3 — Open the Create Form](#4-step-3--open-the-create-form)
5. [Form Field Reference](#5-form-field-reference)
6. [Devnet Testing Tools](#6-devnet-testing-tools)
7. [Review & Submit](#7-review--submit)
8. [Managing Existing Agreements](#8-managing-existing-agreements)
9. [FAQ](#9-faq)

---

## 1. What is Vestra?

Vestra is a tool for **automated token distribution on the Solana blockchain**. Think of it like setting up a standing bank transfer — you define who gets paid, how many tokens, and on what schedule, and Vestra handles the rest automatically.

**Common use cases:**

| Use case | Example |
|---|---|
| Team vesting | Release tokens to co-founders over 4 years |
| Investor payouts | Distribute tokens after a 1-year cliff period |
| Milestone-based grants | Unlock tokens only when a goal is verified |
| Recurring payments | Pay contributors weekly or monthly |

> **Note:** Vestra runs on **Solana Devnet** — a test network where tokens have no real value. It's safe to experiment freely.

---

## 2. Step 1 — Connect a Wallet

A **wallet** is your identity on the blockchain — it's like a bank account address that only you control. You need one to use Vestra.

Look for the **Connect Wallet** button in the top-right corner. It has a pulsing orange dot to make it easy to find.

Click **Connect Wallet**. A small menu appears with two options:

### Option A — Continue with Email *(recommended for beginners)*

The easiest option — no extra software needed.

1. Click **Connect Wallet** → **Continue with Email**
2. A dialog appears — type your email and press **Continue**
3. Check your inbox for a 6-digit code and paste it into the dialog
4. The dialog closes and the button now shows your email address with a green dot

You are connected. Vestra automatically created a Solana wallet for you behind the scenes — you own it completely.

### Option B — Phantom / Solflare

For users who already have a Solana browser-extension wallet installed. Click this to open the wallet's own connection dialog. If you don't know what this is, use **Email** instead.

> **You know you're connected when** the button shows your email or a shortened wallet address (e.g. `7xKX...gT3u`) with a green dot.

---

## 3. Step 2 — The Agreements Page

Navigate to `/streams` from the home page. This is your dashboard for all active distribution agreements.

### Header buttons

| Button | What it does |
|---|---|
| **New agreement** | Opens the form to create a new token distribution agreement |
| **Connect Wallet** *(amber)* | Visible when you are not yet logged in — connects your wallet |

### Empty state

If you haven't connected your wallet yet, the page shows a *"Connect your wallet to continue"* card with a second **Connect Wallet** button. Click either one — they do the same thing.

### Agreement list

Once connected, each row shows:

- **Recipient** — the shortened wallet address receiving tokens
- **Token** — the token being distributed
- **Amount** — total tokens locked in the agreement
- **Status** — Active, Completed, or Cancelled
- **Action buttons** — Withdraw, Verify milestone, Cancel (see [Managing Agreements](#8-managing-existing-agreements))

---

## 4. Step 3 — Open the Create Form

Click **New agreement** from the Agreements page, or go directly to `/streams/create`.

### Before you start

- The **Connect Wallet** button is in the top-right of the form page
- The **Review agreement** button at the bottom stays greyed out until your wallet is connected
- You must hold the token you want to stream in your wallet

### Walkthrough

**Step 1 — Connect your wallet**
Click the amber **Connect Wallet** button if you haven't already.

**Step 2 — Take the guided tour (optional but recommended)**
Click **How to use this form?** (the info button below the page title). A step-by-step overlay highlights each field. Use **Next**, **Back**, or **Skip** at any time.

**Step 3 — Fill in the form**
See [Form Field Reference](#5-form-field-reference) below for a detailed explanation of every input.

**Step 4 — Click "Review agreement"**
A summary card replaces the form. Read it carefully before confirming.

**Step 5 — Click "Confirm and send"**
Your wallet asks you to approve the transaction. Click **Approve** in the wallet prompt. The tokens are locked into the agreement immediately.

---

## 5. Form Field Reference

### Recipient wallet *(required)*

The Solana wallet address of the person or account that will *receive* the tokens. It looks like a random string of letters and numbers, e.g. `7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU`.

Ask the recipient for their **public** wallet address — it is safe to share. **Never paste a private key here.**

---

### Token *(required)*

The token you want to distribute. Type a token name (e.g. `USDC`) or ticker in the search box and select from the dropdown. You can also paste a full token contract address directly.

Only tokens you actually hold in your wallet can be streamed. For testing, use the **Devnet testing tools** to mint free mock tokens first.

---

### Amount *(required)*

The **total** number of tokens to lock into this agreement. This full amount is moved from your wallet into escrow immediately when you confirm. It is then released to the recipient according to the payout schedule.

---

### Agreement ID *(required)*

A unique number to identify this agreement. It is **auto-generated** — leave it as-is unless you need a specific ID for your records. Each ID must be unique per wallet.

---

### Start date *(required)*

When the payout schedule begins. Tokens start accumulating for the recipient from this moment. The recipient cannot claim anything before this date. Defaults to right now.

---

### Lock until *(optional)*

Also called a **cliff**. Tokens accrue from the Start date but the recipient *cannot withdraw* anything until this date passes.

Leave blank if you want the recipient to be able to withdraw from the Start date onwards.

**Example:** A 1-year cliff means no tokens can be claimed for the first year — even though time is ticking and tokens are building up.

---

### End date *(required)*

When the final payout occurs. The payout schedule runs from Start date to End date. All tokens will have been released by this point.

---

### Payout schedule *(required)*

How tokens are released over time. Choose one:

| Option | How it works | Best for |
|---|---|---|
| **Even payouts over time** | Tokens drip continuously and evenly from Start to End date | Salaries, subscriptions, contributor payments |
| **Locked period, then even payouts** | Nothing claimable until Lock until date; then tokens release evenly until End date | Investor / team vesting with a cliff |
| **Release when goals are completed** | Tokens divided into milestones; each unlocks only when a verifier approves it | Grants, bounties, project-based contracts |

---

### Allow cancellation of unreleased tokens *(checkbox)*

When **ticked**: you (the sender) can cancel the agreement at any time and reclaim tokens not yet earned by the recipient.

When **un-ticked**: the agreement is permanent — even you cannot stop it.

> Tokens already claimable by the recipient at the time of cancellation are always theirs, regardless of this setting.

---

## 6. Devnet Testing Tools

At the top of the Create form there is a collapsed section called **Devnet testing tools**. Click it to expand. This section only exists for testing — it gives you free fake tokens to try the form without spending real assets.

### Buttons

| Button | What it does |
|---|---|
| **Check balance** | Fetches your current mock token balance |
| **Mint mock tokens** | Sends 10,000 free mock tokens to your wallet |

### Quick testing workflow

1. Connect your wallet
2. Expand **Devnet testing tools**
3. Click **Mint mock tokens** — approve the transaction in your wallet
4. Click **Check balance** to confirm you received 10,000 tokens
5. The Token field is pre-filled with the mock token address
6. Fill in the rest of the form and submit

---

## 7. Review & Submit

Once all required fields are filled and you click **Review agreement**, a summary screen appears.

### What to check

- **Recipient** — confirm the address is correct. Sending to the wrong address cannot be reversed
- **Token and amount** — match what you intended
- **Dates** — double-check Start, Lock until, and End
- **Payout schedule** — correct type selected

### Buttons on the summary screen

| Button | What it does |
|---|---|
| **Back to edit** | Returns you to the form — nothing has been sent yet |
| **Confirm and send** | Signs and broadcasts the transaction — approve in your wallet to complete |

> **Warning:** Once confirmed, the tokens are locked. The agreement is on-chain and cannot be edited. If you enabled cancellation, you can cancel it later — but you cannot change dates or amounts.

### After submission

A success message appears with a transaction signature (a long hash). You can click it to view the transaction on Solana Explorer. The new agreement appears on the Agreements page.

---

## 8. Managing Existing Agreements

Go to **Agreements** (`/streams`) to see all agreements where your wallet is the creator or recipient.

### Withdraw *(recipient only)*

If tokens have accumulated since your last claim, a **Withdraw** button appears. Click it to transfer all currently claimable tokens to your wallet. You can withdraw as many times as you like — there is no penalty for claiming early or late.

### Verify milestone *(milestone agreements only)*

If the agreement uses *Release when goals are completed*, a designated verifier must approve each milestone before tokens unlock. Click **Verify milestone** and approve in your wallet. The recipient can then withdraw that portion.

### Cancel *(creator only, if cancellation was enabled)*

Click **Cancel** next to an agreement. Tokens the recipient has already earned up to this moment remain available for them to withdraw. Tokens not yet earned are returned to your wallet immediately.

> If you did *not* enable cancellation when creating the agreement, the Cancel button will not appear. The agreement runs to completion regardless.

### Disconnect

Click the button in the top-right showing your email or wallet address, then click **Disconnect**. Your agreements are not deleted — they exist on-chain permanently. Reconnect any time to access them again.

---

## 9. FAQ

**Do I need cryptocurrency to use Vestra?**
On devnet (the test environment), no. Click *Mint mock tokens* in the Devnet testing tools to get 10,000 free test tokens. In a production deployment on mainnet you would need real tokens to distribute.

**What happens if I lose access to my email?**
Your wallet is tied to the Privy account created during email login. Use Privy's account recovery flow. Your on-chain agreements are separate from your login and will always exist on the blockchain.

**Can the recipient see the agreement before accepting it?**
Yes. All agreements are public on the Solana blockchain. No acceptance is needed — the recipient visits the Agreements page with their own wallet to see and withdraw from agreements made for them.

**Can I send tokens to multiple people in one agreement?**
No — each agreement has exactly one recipient. Create separate agreements for each person.

**What does "on-chain" mean?**
The agreement is stored on the Solana network — a global, public, tamper-proof database — not on Vestra's servers. Even if Vestra's website went offline, the agreement would still exist and the recipient could still withdraw.

**What is a wallet address?**
A unique identifier for a blockchain account, like a bank account number. It is safe to share publicly. Example: `7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU`

**What is a transaction signature?**
A unique ID for a specific on-chain action, like a receipt. You can paste it into [Solana Explorer](https://explorer.solana.com/?cluster=devnet) to see the full details of what happened.
