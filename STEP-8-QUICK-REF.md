# Quick Reference: Step 8 Completion Path

## Current State
- ✅ Code: complete & compiled
- ⏳ Execution: blocked by Claude API rate limit (resets ~8pm Europe/Zurich)
- 📍 Live run: AGENTRUN-0004 pending verification

## Commands to Execute (In Order)

### When Rate Limit Resets
```bash
# 1. Run verification
npm run cli -- verify
# Expected: "✓ Verification passed"

# 2. Check status
npm run cli -- status
# Expected: "Pending approvals (1): merge-gate AGENTRUN-0004"

# 3. Approve integration (human gate)
npm run cli -- approve slice SLICE-0001
# Expected: "✓ Approved"

# 4. Verify loop complete
npm run cli -- status
# Expected: "Pending approvals (0)" and "Pending agent runs (0)"

# 5. Commit Step 8
git add -A
git commit -m "Verification agent + CLI (build-sequence step 8)"
```

## What to Verify

After `npm run cli -- verify`:

```bash
# Check verification artifact exists
ls product/tests/VERIF-0001.md

# Check test outcome
cat product/tests/VERIF-0001.md | grep -A 2 "outcome:"
# Expected: outcome: pass

# Check git commit was made
git log --oneline -5
# Expected: newest commit mentions VERIF-0001
```

## If Something Goes Wrong

### Agent execution fails (unlikely):
→ Check AGENTRUN-0004.md for error details
→ Read STEP-8-STATUS.md "Blockers & Risks" section
→ Step 9 (Failure Routing) will handle this case

### Artifact not created:
→ Run `npm run cli -- status` to see the failure
→ Check that SLICE-0001 worktree has test files
→ Verify `.sfai/worktrees/SLICE-0001/fixtures/seed-app/test/notes.test.ts` exists

### Approval doesn't work:
→ Run `npm run cli -- status` to check run state
→ Should show "merge-gate" in pending approvals
→ Try: `npm run cli -- approve slice SLICE-0001`

## Success Indicators

| Checkpoint | Expected Output |
|------------|-----------------|
| After verify | "VerificationResult will be: VERIF-0001" + test results shown |
| VERIF-0001.md | File exists in product/tests/ with outcome: pass |
| After approval | "✓ Integrated" or integration complete message |
| Final status | No pending approvals, no pending agent runs |

## Timeline

- **Now:** Rate limit active, code ready
- **~8pm Europe/Zurich:** Rate limit resets
- **~8pm + 5 min:** Run `npm run cli -- verify` (should succeed)
- **~8pm + 10 min:** Approve and complete loop
- **~8pm + 12 min:** Commit Step 8

---

**See [STEP-8-STATUS.md](STEP-8-STATUS.md) for full details.**
