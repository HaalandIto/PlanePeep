# SKELETON.md — Plane Peep

## 1. Project Overview

**Plane Peep** is a full-stack web application that allows users to look up a flight and view its position on a 2D map. Users can create an account and store their favorite flights for quick access.

The system integrates with an external flight data API and provides a clean frontend interface backed by a RESTful backend and MySQL database.

Core features:

- Flight search by identifier or keyword
- Flight position display on a 2D map
- User account creation and login
- Save and manage favorite flights

---

## 2. Target Users

- Aviation enthusiasts tracking specific flights
- Travelers monitoring flight status
- Users picking up passengers who want quick flight location lookup

---

## 3. High-Level Architecture

This project uses a standard three-tier full-stack architecture.

Frontend → Backend REST API → Database  
             ↘ External Flight API

- Frontend communicates only with our backend
- Backend handles all business logic and data access
- Backend calls the external Flight API
- Database stores only user and favorite data (not raw live flight streams)

---

## 4. Required Framework Stack (Course Required)

Frontend:

- React
- TypeScript
- VSCode

Backend:

- Java
- Spring Boot
- JUnit

Infrastructure:

- GitLab
- Ubuntu Linux VM
- Docker
- MySQL
- Postman (API testing)

---

## 5. Component Responsibilities

### Frontend (React + TypeScript)

- Flight search UI
- Map display UI
- Favorites list UI
- Account login/register UI
- Calls backend REST endpoints

### Backend (Spring Boot)

- REST API endpoints
- Business logic
- External Flight API integration
- Database access layer
- Authentication handling

### Database (MySQL)

Stores:

- User accounts
- Favorite flights
- Optional cached flight lookups

### External API

- FlightAware (or equivalent flight data provider)
- Accessed only by backend service

---

## 6. Draft Data Model

### User

- id (PK)
- email (unique)
- password_hash
- created_at

### FavoriteFlight

- id (PK)
- user_id (FK → User.id)
- flight_id (string from external API)
- saved_at

Optional:

### FlightCache

- id (PK)
- flight_id
- response_json
- fetched_at

---

## 7. Backend REST API (Draft Design)

All endpoints are served by our backend under `/api`.

Flights (external data via backend proxy):

- GET /api/flights/search?query=value
- GET /api/flights/{flightId}

Authentication:

- POST /api/auth/register
- POST /api/auth/login

Favorites (stored in MySQL):

- GET /api/favorites
- POST /api/favorites
- DELETE /api/favorites/{favoriteId}

The frontend never calls the external Flight API directly.

---

## 8. Development Environment

Local development setup:

- Backend runs via Spring Boot on Ubuntu VM
- MySQL runs in Docker container
- Frontend runs via React dev server
- API tested with Postman
- Code hosted and reviewed through GitLab merge requests

---

## 9. Team Roles (Sprint 0)

Database:

- Stefan

External API Integration:

- Peter
- Stefan

Frontend App:

- Setrynn
- Vincent

Backend:

- Hunter
- Nikolo

---

## 10. Sprint 0 Deliverables

Completed:

- Repository setup
- Branching and MR workflow defined
- Issue tracking configured
- Architecture draft created
- Tech stack selected
- Skeleton documentation created

Artifacts:

- README.md
- SKELETON.md
- ROLES.md
- STYLE.md
- LOGO.png
- .gitignore

---

## 11. Sprint 1 MVP Plan (Draft)

- Implement flight search endpoint
- Integrate external flight API
- Implement favorites CRUD endpoints
- Create basic React search page
- Create favorites page
- Connect frontend to backend
- Initialize MySQL schema

---

## 12. Risks and Open Questions

- External Flight API access limits or API key restrictions
- Flight identifier format consistency
- Map library selection and integration
- Authentication scope (full auth vs minimal demo login)

---

## 13. Testing Strategy (Draft)

- Backend unit tests using JUnit
- Endpoint testing using Postman
- Manual frontend integration testing
- Database schema validation tests

---

## 14. Coding and Git Workflow Rules

- No direct commits to main
- All changes via named branches
- Merge Requests required
- No force push (only --force-with-lease if necessary)
- Issues must include labels, assignees, and iteration
- Pair programming commits include Co-authored-by footer

---
