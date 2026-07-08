# 03 PRD

## Product Requirements Document

## Product Overview
BeautyAtHome is a web-based and PWA-enabled home beauty booking platform for India, starting with Sikar as the pilot market.

## Product Goals
- Allow customers to discover and book verified female beauty professionals
- Allow freelancers to register, get verified, and receive bookings
- Support a managed marketplace model with hybrid booking
- Reduce trust and bypass issues through platform rules and booking controls
- Enable future expansion across cities and services

## Product Scope for Phase 1
### In Scope
- Website and PWA
- Mobile OTP login
- Guest browsing
- Customer booking flow
- Freelancer profiles
- Freelancer verification
- Booking status management
- Advance payment handling
- Payout request flow
- Reviews and ratings
- Referrals, rewards, and rebooking reminders
- Admin dashboard and support tools

### Out of Scope
- Native mobile apps
- Male professionals
- Non-beauty services
- Live GPS tracking
- AI automation beyond simple recommendations
- Microservices architecture

## Primary User Journeys
### Customer Journey
1. Browse services
2. View freelancer profiles
3. Select freelancer or assign best professional
4. Enter location and slot
5. Pay advance
6. Receive booking confirmation
7. OTP-based service completion
8. Leave review
9. Rebook same professional later

### Freelancer Journey
1. Sign up with mobile OTP
2. Complete profile
3. Submit verification details
4. Add services and price within limits
5. Set availability
6. Receive booking request
7. Accept or decline
8. Complete service and receive payout status
9. Withdraw available balance after hold period

### Admin Journey
1. Review freelancer applications
2. Approve or reject verification
3. Monitor bookings
4. Resolve disputes
5. Manage commissions, payouts, and support tickets
6. Track performance and fraud signals

## Product Features
- Guest browse without login
- Mobile OTP authentication
- Advanced freelancer profiles
- Customer selection or best-professional assignment
- Flexible pricing with platform limits
- Dynamic commission engine
- 6-hour payout clearance hold
- Minimum withdrawal limit of ₹500
- Verified booking-based reviews
- WhatsApp and ticket support
- Referral and rewards system
- Auto rebooking reminder system
- Hidden internal score for freelancers and customers

## Product Constraints
- Female professionals only at launch
- Beauty category only at launch
- Sikar pilot before any broader rollout
- Simple and understandable wallet UI
- No feature that unnecessarily increases operational complexity

## Acceptance Criteria
- A customer can complete a booking end-to-end on web/PWA
- A freelancer can register, verify, and receive bookings
- Admin can manage the full lifecycle of users, bookings, support, and payouts
- The system can be expanded city by city without redesigning the core platform
