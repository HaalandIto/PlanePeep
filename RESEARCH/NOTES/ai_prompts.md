# Agile AI Prompting

Information in this help markdown file is largely based on the [Agile AI tutorial lecture](https://canvas.wisc.edu/courses/500438/pages/tutorial-ai-tools-with-scrum?module_item_id=9505814).

## General Structure

Role + Context + Task + Constraints

### Definitions

1. The Role: "Act as a [Job Title/Identity]."
2. The Context: "You are working on a [Project Type] for a [Target Audience]."
3. The Task: "Your goal is to [Specific Action]."
4. The Constraints: "Speak in a [Tone] and do not include [Excluded items]."

## Example Prompts

```
Act as a Senior Agile Coach and Full-Stack Developer,
I am a student in university working on a [Project Name] using [Tech Stack],
Review my Sprint 1 Goal [Insert Your Current Sprint 1 Goal]
Our requirement is to show a functional frontend-to-backend increment by March 2.
Critique this goal using the SMART (Specific, Measurable, Achievable, Relevant, Time-bound)
framework. Is it too broad? Does it clearly state the technical integration? Suggest 2 improved
versions
```

```
Act as a Senior Developer.
Review these tasks for our User Story: [Insert Story & Tasks].
Identify any 'Missing Middle' tasks needed to connect the UI to the Database.
Ensure no task is larger than 4 SP (2 hours).
```

```
Act as a Senior [Insert Language/Framework] Developer and an expert Agile Coach.
I am a student in CS/ECE 506. We are reviewing Sprint 1 Planning Phase II.
Our goal is to deliver a functional "Vertical Slice" (Frontend-to-Backend-to-Database) by March 2nd. I am a beginner/familiar/expect with this tech stack.
Audit the following: [Insert Task Description, User Story, or SP Estimate].
1. In this course, 1 SP (Story Point) = 30 minutes of work.
2. All tasks must align with our Definition of Done (code formatted, logic tested, peer-reviewed).
3. Provide a rationale for your feedback
```

```
I estimated [Insert your task – For instance, 'Setup Database Schema'] at 2 SP (1 hour). For a
beginner/expert in [Tool/Framework], is this realistic?
```

```
What are common roadblocks when implementing [Your Task] in [Your Tech Stack]?"
```

```
This task is too complex for 1 hour. Break it into subtasks that are 1 or 2 SP each
```

```
Act as a Senior Quality Assurance (QA) Engineer and Agile Coach specializing in [Insert your
Tech Stack, e.g., Java/Spring Boot].
```

```
I am a student in CS/ECE 506. I have self-assigned the following task for the next 72 hours
of Sprint 1: "[Insert Your Task Description/Issue ID]". Our goal is to have a functional "Vertical Slice" (Frontend-to-Backend) ready for a demo.
Help me refine the Acceptance Criteria and Definition of Done for this specific task to ensure
it is "demo-ready."
1. The code must be sanitized/vetted (linted) and follow professional style guidelines.
2. The logic must be verified by unit tests.
3. The task must be small enough to fit within [Insert your Est. SP] (Reminder: 1 SP = 30 mins).
4. Suggest 3 specific "Test Cases" (including one edge case) I should check before moving this to "Done."
```

Additions are welcome.
