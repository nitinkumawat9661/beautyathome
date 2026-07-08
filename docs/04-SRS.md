# 04 SRS

## Software Requirements Specification

## System Overview
BeautyAtHome is a web-based marketplace and PWA that supports customer booking, freelancer onboarding, admin operations, booking lifecycle management, payouts, reviews, and support.

## Functional Requirements
### Authentication
- Users must be able to sign up and log in using mobile OTP
- Guest users must be able to browse without logging in
- Google login is not part of Phase 1

### Customer Module
- Browse services
- View freelancer profiles
- Filter by rating, price, experience, and availability
- Select a freelancer or use best-professional assignment
- Create booking requests
- Pay advance amount
- Track booking status
- Cancel booking within policy rules
- Leave verified reviews
- Rebook same professional
- Raise support tickets

### Freelancer Module
- Register and complete profile
- Submit verification details
- Add services from approved master service list
- Set flexible pricing within allowed limits
- Set availability by time slot
- Accept or decline booking requests
- View earnings and wallet balance
- Request withdrawal after clearance hold
- View reviews and ratings
- Receive commission and payout status

### Admin Module
- Approve or reject freelancer verification
- Manage master services
- Manage bookings
- Manage disputes and tickets
- Track commission and payouts
- Review fraud signals
- Manage rewards, referrals, and coupons
- Monitor platform performance

## Non-Functional Requirements
- Fast loading website and PWA
- Mobile-first responsive UI
- Secure authentication and role-based access
- Scalable backend architecture
- Reliable payment and payout handling
- Data consistency for bookings and wallet balances
- Auditability for admin actions and financial records

## Performance Requirements
- Core pages should load quickly on mobile networks
- Booking flow should be short and efficient
- Search and profile browsing should remain responsive under growth

## Security Requirements
- Encrypted sensitive data at rest where applicable
- Role-based authorization for all modules
- No direct sharing of personal contact details between customers and freelancers
- Audit logs for critical admin operations
- OTP-based completion flow for booking verification

## Data Requirements
- Users, freelancer profiles, services, bookings, reviews, payouts, commissions, and support tickets must be stored in a structured relational schema
- Status history should be preserved for bookings and financial events

## Constraints
- Female professionals only at launch
- Beauty category only at launch
- Sikar pilot city only in Phase 1
- Website + PWA only in Phase 1
- Minimum withdrawal limit of ₹500
- 6-hour payout clearance hold

## Dependencies
- SMS/OTP provider
- Payment gateway
- Cloud storage for images
- Hosting for frontend and backend
- Database hosting for PostgreSQL

## Acceptance Criteria
- All Phase 1 user journeys can be completed without manual code intervention
- Booking, verification, payout, and support flows function correctly
- The system can be extended to new cities and future services without redesign
