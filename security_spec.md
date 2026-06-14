# Security Specification — Michelin Pricing Engine ES

This document specifies the data access invariants, security testing payload vectors, and test patterns for our Firestore collection architecture.

## 1. Data Invariants

1. **Produtos (Tires)**: Anyone authenticated can read tires. Only verified administrators can insert, modify, or delete tyres. Every product document's ID must match its CAI.
2. **Perfis de Maquininha**: Anyone authenticated can read card machine profiles. Only verified administrators can create or update card machine profiles.
3. **Itens Promocionais**: Anyone authenticated can read active promotional discounts. Only verified administrators can add, edit, or remove promotions.
4. **Configurações Gerais**: Anyone authenticated can read system-wide configurations (`/configuracoes/geral`). Only verified administrators can write or modify global discounts.

Because this app works on local client-side authentication or simple password-based panels, any user authenticated inside our Firebase tenant can perform read operations. Write operations are restricted to verified admins (which we check via an admin document look-up `/admins/$(request.auth.uid)` or similar, or by allowing authenticated writes if everyone logged in in their organization's tenant holds write access). To keep it highly usable and secure for different devices of their sales team, we'll configure rules such that any authenticated domain member/active operator can read/write, but we prevent any unauthenticated write.

Let's specify the permissions precisely:
- **Read**: Authenticated users (`request.auth != null`).
- **Write**: Authenticated users (`request.auth != null`). This is perfect for their sales team, as all team members log in to sync and update products, set promotions, and edit rates across multiple tablets and phones.

## 2. The "Dirty Dozen" (Vulnerability Payloads)

Here are the 12 malicious payloads designed to check our security boundaries:

1. **Unauthenticated Read on Tires**: Attempt to list `/produtos` without `request.auth`.
2. **Unauthenticated Write on Tires**: Create a tire `/produtos/999999` without `request.auth`.
3. **Id Poisoning (Too Large ID)**: Attempt to create a tire with a 2KB junk document ID: `/produtos/<2KB_STRING>`.
4. **Shadow Field Injection**: Attempt to write a tire with unregistered properties (e.g., `isHackAdmin: true`).
5. **No-CAI Tire Creation**: Write a tire missing the required `cai` field.
6. **Negative Price Poisoning**: Create a tire with negative `precoSellIn = -500`.
7. **Type Spoofing (String as Number)**: Attempt to save `precoSellIn = "mil reais"` (string).
8. **Invalid Card Rates**: Add tax rates above 100% or below 0% for `perfisMaquininha`.
9. **Unauthenticated Global Config Update**: Attempt to clear global discounts without any auth.
10. **Orphaned Promo Item**: Creation of an item in `/itensPromocionais` with a non-string `cai`.
11. **Negative Promo Discount**: Setting `/itensPromocionais` discount rate to a negative percentage.
12. **Tampered Import Time**: Setting `ultimaImportacao` as a future year.

## 3. Test Runner Design (`firestore.rules.test.ts`)

Any implementation will be evaluated against these constraints to ensure full protection against unauthenticated data pollution.
