# Memory Protocol

At startup:

1. Read every `.project-ai` file.
2. Read all existing project documentation and relevant repository files.
3. Inspect recent Git history.
4. Build a unified project context.
5. Update project memory/state with only durable facts.

During work, write back important requirements, design decisions, architecture decisions, research conclusions, rejected alternatives, risks, lessons, current work, and next work.

Never depend on chat history as the only source of truth.

The goal is persistent project memory that lets another model or future session resume without reconstructing the project from scratch.
