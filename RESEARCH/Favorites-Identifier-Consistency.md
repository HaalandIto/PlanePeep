# Research Report

## Favorites Identifier Consistency (ICAO24 vs Tail Number)

### Summary of Work

This research focused on updating the favorites feature to use aircraft tail number (registration) instead of ICAO24 identifiers. The work involved modifying both backend and frontend components and ensuring compatibility with existing tests. During implementation, issues were encountered due to backend test dependencies on mock data. The final approach limited changes to the frontend while keeping backend behavior unchanged to ensure CI stability.

### Motivation

The system’s aircraft metadata uses tail number (registration) as the primary identifier, while the favorites feature originally used ICAO24. This inconsistency can lead to mismatched data and unreliable lookups. The goal of this research was to align identifiers across the system and improve data consistency without breaking existing functionality.

### Time Spent

Approximately 2–3 hours were spent on:

- Investigating backend and frontend identifier usage
- Attempting backend implementation and debugging CI failures
- Reverting backend changes to maintain test compatibility
- Implementing frontend-only solution
- Running tests and verifying CI pipeline

### Results

Several key insights were identified during this work:

- Backend tests are tightly coupled to existing mock favorites logic and API behavior. Modifying backend logic without updating tests leads to immediate CI failures.
- The favorites system currently relies on mock data rather than fully persistent database logic, limiting how backend changes can be introduced safely.
- A minimal-change strategy is often required in team projects to ensure CI passes and integration remains stable.
- Frontend-only updates can be used as an interim solution to gradually transition system behavior without breaking existing tests.
- Proper coordination between frontend, backend, and test updates is necessary when changing API contracts.

### Sources

- GitLab CI Pipeline Logs and Test Failures[^1]
- Project Backend Codebase[^2]
- OpenSky Aircraft Metadata Documentation[^3]
- React Frontend Documentation[^4]

[^1]: https://git.doit.wisc.edu

[^2]: https://git.doit.wisc.edu

[^3]: https://opensky-network.org

[^4]: https://react.dev
