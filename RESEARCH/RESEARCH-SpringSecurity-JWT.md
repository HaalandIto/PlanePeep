{\rtf1\ansi\ansicpg936\cocoartf2867
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 # Research Report\
\

## Spring Security and JWT-Based Authentication\

\

### Summary of Work\

\
This research focused on understanding how to implement secure authentication in a\
Spring Boot backend using Spring Security and JSON Web Tokens (JWT). It explored\
how JWT tokens are generated, signed, and validated, as well as how to integrate a\
custom authentication filter into the request pipeline. It also examined how to\
configure protected endpoints so that only authenticated users with valid tokens can\
access them.\
\

### Motivation\

\
This research was conducted to support the implementation of JWT authentication for\
protected backend endpoints in the project. The system previously did not have a\
token-based authentication mechanism, so it was necessary to understand how Spring\
Security works in a stateless environment and how JWT can be used to securely verify\
user identity across requests.\
\

### Time Spent\

\
Approximately 3-4 hours were spent on this research:\
\

- ~1.5 hours reading Spring Security and JWT documentation\
- ~1 hour reviewing tutorials and implementation examples\
- ~1-1.5 hours testing and applying concepts in the backend code\
  \

### Results\

\
The research resulted in a clear understanding of how JWT-based authentication is\
structured and implemented in a Spring Boot application.\
\
Key takeaways include:\
\

- JWT tokens consist of three parts: header, payload, and signature, which are\
  encoded and signed to ensure integrity[^1].\
- Token generation typically occurs after successful login and includes user-specific\
  claims such as user ID and username.\
- A secret key is used to sign the token, and the same key is required to validate\
  it.\
- Spring Security can be configured to operate in a stateless mode, meaning no\
  session is stored on the server.\
- A custom authentication filter, such as `JwtAuthenticationFilter`, can be used to\
  intercept incoming requests, extract the token from the `Authorization` header, and\
  validate it.\
- The `Authorization` header follows the format `Bearer <token>`.\
- Protected endpoints can be configured to require authentication, while public\
  endpoints such as login and register remain accessible.\
- Invalid or expired tokens should result in a `401 Unauthorized` response.\
  \
  This research directly guided the implementation of:\
  \
- Secure JWT token generation and signing\
- Integration of a custom authentication filter\
- Configuration of protected backend endpoints\
  \

### Sources\

\

- Spring Security Reference Documentation[^1]\
- JWT Introduction and Structure (jwt.io)[^2]\
- Baeldung: Spring Security with JWT Tutorial[^3]\
- JJWT Library Documentation[^4]\
  \
  [^1]: https://docs.spring.io/spring-security/reference/index.html\
  [^2]: https://jwt.io/introduction\
  [^3]: https://www.baeldung.com/spring-security-oauth-jwt\
  [^4]: https://github.com/jwtk/jjwt}
