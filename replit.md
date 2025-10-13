# Nimbus Flow - Project Management Tool

## Overview

Nimbus Flow is a comprehensive project management application for architects, featuring NYC Building Code compliance tracking, automated inspection triggers, consultant engagement management with proposal phases, and document/phase management. The system provides Kitchen vs. Kitchenette classification (≥80 sq ft threshold), real-time compliance validation with code references, and consultant-to-inspection assignment capabilities. The application aims to streamline project workflows, enhance data quality, and provide robust compliance and risk assessment capabilities for NYC-based projects.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

**UI/UX Decisions:**
The application utilizes React 18 with TypeScript for the frontend, employing Vite for fast development and optimized builds. Wouter handles client-side routing, while TanStack Query manages server state. Styling is achieved with Tailwind CSS, Radix UI, and Shadcn/ui for consistent, accessible, and customizable components. The UI is fully mobile-responsive, with adaptive navigation, compact progress indicators, card-based layouts, and enlarged touch targets.

**Technical Implementations:**
The backend is built with Express.js and TypeScript, featuring a RESTful API with structured endpoints. A modular service architecture facilitates integration with external APIs. PostgreSQL with Drizzle ORM serves as the database, hosted on Neon for serverless capabilities, and Drizzle Kit manages migrations. Zod is used for schema validation. The application employs session-based authentication with bcrypt for password hashing and a PostgreSQL session store.

**Recent Updates (December 2025):**
- Enhanced room modeling with hasWindows boolean and doorsCount fields for accurate interior room specifications
- Upgraded window system with 16 operation types (SINGLE_HUNG through EGRESS) and status tracking (REPLACE/FURNISH/REMOVE)  
- Added asbestos contingency alerts to lead-time calculations with visual warnings for MODERATE/HIGH risk levels
- Implemented comprehensive auto-grouping service for window types based on operation, aspect ratio, assembly, and glazing
- Implemented borrowed light/air feature allowing interior rooms to count window area from adjacent spaces for NYC Building Code compliance
- Added room shopping lists with 10 categories, vendor lead-time integration, and quick-add buttons for common items
- Implemented room status workflow (Draft/Needs Review/Complete) with flagging capability for attention tracking
- **Enhanced Consultant Management:** Complete milestone timeline (estimate→proposal→authorization→onboarding→kickoff→files), inline editing with checkboxes/dropdowns/date pickers, contact info management, inspection assignment tracking, and unassigned inspection quick-assign feature
- **Unified Compliance Overview:** Building characteristics display with plain-language explanations, compliance trigger cards (pre-1987 building, landmark status), filterable inspection lists, asbestos buffer visualization (3-5 weeks), and compliance readiness metrics
- **Actionable Shopping Lists:** Room-based procurement tracking with vendor lead-times, auto-calculated quantities (flooring by area, cabinetry by perimeter), quick-add buttons, and integrated vendor lead-time badges
- **Budget Management:** SD/DD phase budget tracking with category allowances, real-time variance calculations, overage alerts, and phase toggle for deferred purchases
- **Granular Client Orientation System:** Expanded from 7 standard phases to 25 detailed phases covering entire project lifecycle, with comprehensive client guidance content and 74 automated email templates for phase transitions

**Feature Specifications:**
- **Project Creation Wizard:** Step-by-step interface for project setup, including selection of phases and tasks with start/end date assignment.
- **NYC Open Data Integration:** Lookup and integration of zoning, permit, inspection, and asbestos risk data from NYC Open Data.
- **Compliance & Risk Assessment:** Systems for Tenant Protection Plan (TPP), Life Safety, OSHA, and Asbestos risk assessment with auto-detection of requirements.
- **Documentation Generation:** Template-based specification engine using Handlebars, Pre-Design Dossier PDF generation (Budget, Specs, Light & Air), and Google Sheets export for schedules.
- **Outline Specifications:** Auto-generated construction specifications with 37+ templates, conditional logic based on project characteristics, token replacement for project details, and CSV export functionality.
- **Materials Tracking (Nimbus Flow):** Comprehensive CRUD operations for materials, risk detection, warehousing management, and budget tracking.
- **NYC DOB Inspection Reference:** Database of 72+ DOB inspection types with applicability matrix based on project characteristics.
- **CRM & Communications:** Database schema for contacts, notes, tasks, and thread tracking, with email intake service and UI for project-related communications.
- **Survey Automation:** Trackable form/survey assignments with unique tokens, lifecycle tracking (created → sent → opened → submitted), automated reminder detection for overdue responses, and Typeform integration with webhook completion tracking.
- **Data Quality:** Field alias service for data consistency, validation checks (e.g., windows without tags), and smart suggestions for compliance.
- **Enhanced Room Modeling:** Interior/No Exposure option for rooms without exterior walls, dimensional entry (L×W×H) with automatic area/volume calculation, TBD flag system for incomplete numeric data, window Type management (A, B, C...) with unique tags (W-001, W-002...), professional Window Schedule with CSV export, and smart NYC Building Code validation for interior spaces.
- **High-End Design System:** Refined color palette with cream/off-white backgrounds, deep charcoal text (#1A1A1A), and metallic/jewel tone accents (muted gold, bronze, deep emerald). Glassmorphism effects with translucent cards (20-40% opacity, 20-40px blur), gradient borders, and soft shadows. Sophisticated typography with generous spacing for luxury aesthetic.
- **Settings Page:** User profile management (firstName, lastName, email display), password change with validation and strength indicator, application preferences section (placeholder), danger zone with account deletion (disabled with "Coming Soon" badge), glassmorphism design consistent with application theme.
- **Project Deletion:** Delete project functionality in project details dropdown menu, confirmation dialog with warning message about permanent deletion, successful deletion redirects to dashboard, proper cascade deletion of all related project data.
- **Lead-Time Engine:** Critical path calculation with vendor-specific rules, room-specific duration overrides, global project baselines (8-12 weeks for kitchens), asbestos contingency buffers (2 weeks MODERATE, 4 weeks HIGH), and lead_time_rules table for flexible configuration.
- **Enhanced Window Management:** 16 operation types (SINGLE_HUNG, DOUBLE_HUNG, CASEMENT, AWNING, SLIDER, FIXED, BAY, BOW, HOPPER, TRANSOM, GARDEN, PIVOT, JALOUSIE, SKYLIGHT, ARCHED, EGRESS), auto-grouping by aspect ratio and operation type, status tracking (REPLACE/FURNISH/REMOVE), and dimensional data support.
- **Borrowed Light/Air Compliance:** Multi-room source selection via MultiSelect component, NYC Building Code calculations (10% glazing, 5% openable), aggregated area calculations from source rooms, detailed compliance reporting with specific shortfalls, and room_light_air_borrow table for relationship tracking.
- **Room Shopping Lists:** Per-room item tracking with categories (Flooring, Cabinetry, Countertop, Backsplash, Appliance, PlumbingFixture, PlumbingAccessory, InsertAccessory, Furniture, Other), units (SF/LF/EA), vendor integration with automatic lead-time lookup from lead_time_rules, cost calculations, quick-add buttons for Flooring (auto-calculates area) and Cabinetry (auto-calculates perimeter), and room_shopping_items table with proper indexes.
- **Lead-Time Engine (Advanced):** Comprehensive critical path calculation system with project-wide and room-aware rules. Supports vendor-specific rules (Lefroy Brooks, Rohl, Waterworks), item categories (Cabinetry, Plumbing, Appliance, Stone, Tile, Lighting, Custom), kitchen baseline (8-12 weeks), asbestos contingency buffers (2 weeks MODERATE, 4 weeks HIGH). Includes API endpoints for rule management, glassmorphism UI card displaying critical path duration with detailed breakdown, and lead_time_rules table with flexible scope-based configuration.
- **Client Orientation System:** Complete phase guide management with educational content for 22 granular project phases (5 pre-design: intake, existing_conditions, discovery_prep, proposal_foundations, onboarding; 5 schematic design: sd_intro, sd_kitchen_bath, sd_materials, sd_budget, sd_wrapup; 3 design development: dd_intro, dd_systems, dd_wrapup; 3 construction documents: cd_intro, cd_detailing, cd_specs_notes; 2 permitting: permitting_intro, permitting_submission; 1 bidding: bidding_pricing; 4 construction admin: ca_intro, ca_submittals_shopdrawings, ca_site_visits_rfis, ca_changes_budget; 2 closeout: closeout_intro, closeout_wrap). Features include: client_phase_guides and project_phase_progress tables for tracking engagement, email_templates with variable substitution for automated communications, admin UI at /settings/phase-guides for content management, client-facing PhaseOverview component on project details page showing phase intro/commitments/responsibilities/action items, phase transition API with automatic email notifications, client acknowledgment tracking with timestamps, seed data script with professional phase content, phase-specific progress records preventing history corruption, and backward compatibility with legacy phase names.

**System Design Choices:**
- Full-stack TypeScript for type safety and consistency.
- Modular architecture for maintainability and scalability.
- Server-side rendering for improved performance.
- Relational data model with Drizzle ORM for type-safe database interactions.
- Environment variable configuration for sensitive data.

## External Dependencies

**Database Services:**
- Neon PostgreSQL (serverless database hosting)

**Third-Party APIs:**
- NYC Open Data (Socrata API for zoning, permits, building class, landmark, inspection, and asbestos data)
- Google OAuth (for Google Sheets integration)

**UI Component Libraries:**
- Radix UI (accessible, unstyled components)
- Shadcn/ui (pre-built, customizable UI components)
- Lucide React (iconography)

**Development Tools:**
- Vite (frontend build tool)
- Drizzle ORM (type-safe ORM for PostgreSQL)
- Zod (schema validation)
- TanStack Query (server state management)
- Tailwind CSS (CSS framework)
- React Hook Form (form validation)
- Date-fns (date manipulation)
- pdfkit (PDF generation)
- Handlebars (templating)
- bcrypt (password hashing)
- Passport.js (authentication)