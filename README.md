# CR AudioViz AI - Centralized Platform SDK

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CRAUDIOVIZAI.COM (Central Hub)                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │  Auth   │  │ Credits │  │Payments │  │   CRM   │            │
│  │  SSO    │  │ System  │  │Stripe/PP│  │  Users  │            │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘            │
│       │            │            │            │                   │
│       └────────────┴────────────┴────────────┘                   │
│                         │                                        │
│              Centralized API Gateway                             │
│                         │                                        │
└─────────────────────────┼───────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   ┌────┴────┐      ┌────┴────┐      ┌────┴────┐
   │CRAVBarrels│    │CardVerse │    │ Games   │
   │ Domain   │    │  Domain  │    │ Domain  │
   │cravbarrels│   │cardverse │    │ games   │
   │  .com    │    │  .com    │    │  .com   │
   └──────────┘    └──────────┘    └──────────┘

## Key Features
- Single Sign-On (SSO) across all apps
- Universal credit system
- Centralized Stripe/PayPal payments
- Cross-app user profiles
- Cross-selling between apps
- Embedded app cards on main site
```

## OAuth Providers
- Google
- GitHub  
- Email/Magic Link
- Apple (future)

## Credit Costs by App
| App | Action | Credits |
|-----|--------|---------|
| Javari AI | Chat message | 1 |
| Javari AI | Code generation | 5 |
| CRAVBarrels | Spirit scan | 2 |
| CardVerse | Card creation | 3 |
| Games | Premium game | 10 |
