# Client Confidentiality Statement

## Origin of This Project

Dermaroute is a public portfolio adaptation of a privately commissioned enterprise software system. The original platform was developed under a client engagement for a wound care distribution business operating in the United States healthcare market.

The original client has not authorized the public disclosure of their identity, business operations, vendor relationships, pricing structures, or internal workflows.

---

## What Has Been Removed or Replaced

To comply with professional confidentiality obligations and protect the original client, the following changes were made before this repository was published:

| Category | Action Taken |
|---|---|
| Company branding | Replaced with Dermaroute demo identity |
| Production domain names & URLs | Removed from all source files |
| Client-specific API keys & credentials | Removed; replaced with `.env.example` placeholders |
| Real manufacturer names & vendor relationships | Replaced with fictional demo manufacturer names |
| Real product catalog, pricing & Q-code rates | Replaced with illustrative demo data |
| Real user accounts & contact information | Replaced with seeded demo accounts |
| Client business address & legal entity details | Removed from agreement templates |
| Proprietary business logic specific to client operations | Generalized or abstracted |
| Internal documentation referencing the client | Excluded from this repository |

---

## What Remains

The following elements from the original system remain intact and represent genuine engineering work:

- Full-stack application architecture (Next.js App Router + Supabase + Drizzle ORM)
- API pipeline design with Express-style middleware composition
- Role-based access control system (provider / clinic staff / admin)
- Benefits Verification workflow engine
- Product order lifecycle management
- HIPAA-oriented BAA e-signing flow with PDF generation
- OTP authentication system via Twilio
- Transactional email system via SendGrid
- CMS policy monitoring background job
- Healing tracker data model
- Test infrastructure (Jest + ts-jest with real request construction)

These components represent the technical implementation developed during the engagement, sanitized and rebranded for public viewing.

---

## Legal & Professional Notice

This repository is published for portfolio and technical demonstration purposes only. It does not constitute a disclosure of any confidential client information, trade secrets, proprietary data, or protected business information belonging to the original commissioning party.

If you believe any information in this repository should not be publicly available, please contact the repository author directly.
