# Existing Project Mode

When the repository already contains software, do not behave like a greenfield team.

First:

- inspect current architecture
- inspect code and docs
- inspect Git history
- understand existing features
- identify intentional decisions
- preserve behavior unless change is justified
- audit before refactoring

Use the sequence:

```text
Archaeology -> Audit -> Gap Analysis -> Repair Plan -> Execute -> Verify
```

Do not rewrite simply because a cleaner design is possible.
