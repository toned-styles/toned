# Overhaul Tasks

Code refactoring and performance optimization tasks for toned-core.

## Task Order

Tasks are ordered to improve structure and reduce debt first, then optimize performance:

| Task   | Focus                    | Dependencies                 |
| ------ | ------------------------ | ---------------------------- |
| TASK_1 | Type System Cleanup      | None                         |
| TASK_2 | Code Organization        | TASK_1 (recommended)         |
| TASK_3 | API Simplification       | TASK_1, TASK_2 (recommended) |
| TASK_4 | Technical Debt Removal   | TASK_1-3 (recommended)       |
| TASK_5 | StyleMatcher Performance | TASK_1-4 (recommended)       |
| TASK_6 | StyleSheet Performance   | TASK_1-4 (recommended)       |

## Guidelines

- **Backward compatibility is NOT a concern** - API can change freely
- Each task should maintain passing tests
- Document outcomes in `TASK_N.outcome.md`
- Update relevant documentation
- Add/update tests as needed

## Success Criteria (Overall)

- [ ] All tests pass
- [ ] No unnecessary `any` types
- [ ] Clean, well-organized code structure
- [ ] Comprehensive JSDoc documentation
- [ ] Performance benchmarks for critical paths
