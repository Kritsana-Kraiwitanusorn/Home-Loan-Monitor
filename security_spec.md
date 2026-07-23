# Security Specification - Home Loan Installment Monitor

This specification outlines the data invariants, possible malicious attack payloads (the "Dirty Dozen"), and the validation structure required to secure user financial data.

## 1. Data Invariants
- **Contracts**:
  - A contract must belong to an authenticated user (`userId` must match `request.auth.uid`).
  - Total loan amount must be positive.
  - The status must be a valid enum: Active, Closed, Refinanced.
  - Due day must be a valid day of the month (1 to 31).
- **Payments**:
  - A payment record must match an authenticated user's ID (`userId` must match `request.auth.uid`).
  - The `contractId` must exist and be valid.
  - The installmentIndex must be positive.
  - Total paid must be equal to or greater than zero, representing `scheduledAmount` + `extraAmount`.

## 2. The "Dirty Dozen" Attack Payloads
We guard against:
1. Identity Spoofing on Contracts (attempting to write with a different `userId`).
2. Identity Spoofing on Payments (attempting to write with a different `userId`).
3. Out-of-bounds dueDay (e.g., dueDay = 99).
4. Negative loanAmount (e.g., loanAmount = -1500000).
5. Unsupported Contract Status (e.g., status = "ActiveMalicious").
6. Invalid payment dates (e.g., malformed string).
7. Negative Payment amounts.
8. Modifying a completed/closed contract's history by unauthorized users.
9. Privilege Escalation (setting arbitrary roles or properties).
10. System-generated fields modification (such as altering the `createdAt` timestamp).
11. Large/junk document ID values (ID poisoning).
12. Blanket listing without a proper `where` query matching `userId`.

## 3. Security Rules Outline
The rules are generated in `/firestore.rules` and verify ownership of each document based on `request.auth.uid == resource.data.userId` for existing documents, and `request.auth.uid == request.resource.data.userId` for incoming writes.
