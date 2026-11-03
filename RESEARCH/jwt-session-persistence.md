# Research Report

## JWT Session Persistence

### Summary of Work

This research examined how JWT-based login sessions can persist across page refreshes in a React frontend with a Spring Boot backend. The main focus was understanding how a backend can issue a token during login, how the frontend can store that token in browser storage, how the application can restore the logged-in user after refresh by calling an authentication endpoint such as `/api/auth/me`, and how protected routes can prevent unauthenticated access to sensitive pages.

### Motivation

This research was necessary because the project requires a smoother authentication experience for returning users. If login state is lost every time the page refreshes, the application becomes inconvenient and does not meet the expected user experience. Since the backend already supports JWT-based authentication, it was useful to research how frontend session persistence is commonly implemented so that the API design and future frontend integration remain aligned.

### Time Spent

About 1.5 hours were spent on this research. Time was divided between reviewing JWT basics, reading React documentation on context-based state sharing, examining how route protection works with React Router, and comparing token storage approaches in the browser. Additional time was spent connecting those ideas back to the current PlanePeep authentication flow and identifying how `/api/auth/login` and `/api/auth/me` support persistent sessions.

### Results

JWT supports stateless authentication by allowing the backend to issue a signed token after successful login.[^1] That token can then be stored in browser storage and reused on later requests. For this project, the most practical frontend flow is: log in, store the returned token in `localStorage`, and on refresh read the stored token and call `/api/auth/me` to restore the authenticated user.[^4]

React Context is a suitable way to store global authentication state because it allows multiple components to access the current user and login status without passing props through many layers.[^2] This is useful for shared UI features such as conditional navigation, logout behavior, and protected pages.

React Router can be used to implement a protected route pattern where unauthenticated users are redirected away from restricted pages such as the aircraft map or favorites view.[^3] This means session persistence is not only about keeping a token in storage, but also about restoring user state before protected content is displayed.

Another important result is that authentication headers should be attached consistently to later API requests. A fetch wrapper or axios interceptor can automatically include the `Authorization: Bearer <token>` header so that frontend code stays clean and authenticated endpoints are easier to call.[^3]

Overall, the main lesson is that persistent login depends on three connected steps: storing the token, restoring the session after reload, and guarding protected routes. This creates a smoother user experience and fits well with a React frontend and Spring Boot backend using JWT authentication.[^1][^2]

### Sources

- JWT Introduction[^1]
- React `useContext` Reference[^2]
- React Router Documentation[^3]
- MDN Web Docs: `localStorage`[^4]

[^1]: https://jwt.io/introduction

[^2]: https://react.dev/reference/react/useContext

[^3]: https://reactrouter.com/en/main/start/tutorial

[^4]: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
