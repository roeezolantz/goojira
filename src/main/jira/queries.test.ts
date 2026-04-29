import { describe, it, expect } from 'vitest';
import { queries, type QueryContext } from './queries';

const baseCtx: QueryContext = {
  projectKeys: ['ABC'],
  recentlyDoneWindowDays: 7,
  mentionedWindowDays: 7,
};

describe('queries.inProgress', () => {
  it('builds JQL for a single project', () => {
    expect(queries.inProgress(baseCtx)).toBe(
      'project in ("ABC") AND assignee = currentUser() AND statusCategory = "In Progress" AND sprint in openSprints() ORDER BY updated DESC',
    );
  });

  it('omits project clause when projectKeys is empty', () => {
    expect(queries.inProgress({ ...baseCtx, projectKeys: [] })).toBe(
      'assignee = currentUser() AND statusCategory = "In Progress" AND sprint in openSprints() ORDER BY updated DESC',
    );
  });

  it('joins multiple projects with commas', () => {
    expect(queries.inProgress({ ...baseCtx, projectKeys: ['ABC', 'XYZ'] })).toBe(
      'project in ("ABC", "XYZ") AND assignee = currentUser() AND statusCategory = "In Progress" AND sprint in openSprints() ORDER BY updated DESC',
    );
  });

  it('escapes embedded quotes in project keys', () => {
    expect(queries.inProgress({ ...baseCtx, projectKeys: ['A"B'] })).toBe(
      'project in ("A\\"B") AND assignee = currentUser() AND statusCategory = "In Progress" AND sprint in openSprints() ORDER BY updated DESC',
    );
  });
});

describe('queries.todo', () => {
  it('builds JQL ordered by priority then updated', () => {
    expect(queries.todo(baseCtx)).toBe(
      'project in ("ABC") AND assignee = currentUser() AND statusCategory = "To Do" AND sprint in openSprints() ORDER BY priority DESC, updated DESC',
    );
  });

  it('omits project clause when empty', () => {
    expect(queries.todo({ ...baseCtx, projectKeys: [] })).toBe(
      'assignee = currentUser() AND statusCategory = "To Do" AND sprint in openSprints() ORDER BY priority DESC, updated DESC',
    );
  });
});

describe('queries.awaitingReview', () => {
  it('builds JQL for reporter-driven review queue', () => {
    expect(queries.awaitingReview(baseCtx)).toBe(
      'project in ("ABC") AND reporter = currentUser() AND (status in ("In Review", "Code Review", "Review", "QA", "Awaiting Review") OR statusCategory = "In Progress") AND assignee != currentUser() AND statusCategory != Done ORDER BY updated DESC',
    );
  });

  it('omits project clause when empty', () => {
    expect(queries.awaitingReview({ ...baseCtx, projectKeys: [] })).toBe(
      'reporter = currentUser() AND (status in ("In Review", "Code Review", "Review", "QA", "Awaiting Review") OR statusCategory = "In Progress") AND assignee != currentUser() AND statusCategory != Done ORDER BY updated DESC',
    );
  });
});

describe('queries.availableToTake', () => {
  it('builds JQL for unassigned in-sprint tickets', () => {
    expect(queries.availableToTake(baseCtx)).toBe(
      'project in ("ABC") AND assignee is EMPTY AND sprint in openSprints() AND statusCategory != Done ORDER BY priority DESC, updated DESC',
    );
  });

  it('handles multi-project lists', () => {
    expect(
      queries.availableToTake({ ...baseCtx, projectKeys: ['ABC', 'XYZ'] }),
    ).toBe(
      'project in ("ABC", "XYZ") AND assignee is EMPTY AND sprint in openSprints() AND statusCategory != Done ORDER BY priority DESC, updated DESC',
    );
  });
});

describe('queries.backlog', () => {
  it('builds JQL excluding epics, sprintless, mine-or-unassigned', () => {
    expect(queries.backlog(baseCtx)).toBe(
      'project in ("ABC") AND (assignee = currentUser() OR assignee is EMPTY) AND sprint is EMPTY AND statusCategory != Done AND issuetype != Epic ORDER BY priority DESC, rank ASC',
    );
  });

  it('omits project clause when empty', () => {
    expect(queries.backlog({ ...baseCtx, projectKeys: [] })).toBe(
      '(assignee = currentUser() OR assignee is EMPTY) AND sprint is EMPTY AND statusCategory != Done AND issuetype != Epic ORDER BY priority DESC, rank ASC',
    );
  });
});

describe('queries.blocked', () => {
  it('builds JQL combining label and status conditions', () => {
    expect(queries.blocked(baseCtx)).toBe(
      'project in ("ABC") AND assignee = currentUser() AND (labels in (blocked, Blocked, BLOCKED) OR status in ("Blocked", "Impediment")) AND statusCategory != Done ORDER BY updated DESC',
    );
  });
});

describe('queries.recentlyDone', () => {
  it('builds JQL with the configured resolved-window', () => {
    expect(queries.recentlyDone(baseCtx)).toBe(
      'project in ("ABC") AND assignee = currentUser() AND statusCategory = Done AND resolved >= -7d ORDER BY resolved DESC',
    );
  });

  it('clamps non-positive window to a minimum of 1 day', () => {
    expect(
      queries.recentlyDone({ ...baseCtx, recentlyDoneWindowDays: 0 }),
    ).toBe(
      'project in ("ABC") AND assignee = currentUser() AND statusCategory = Done AND resolved >= -1d ORDER BY resolved DESC',
    );
  });

  it('honours larger windows verbatim', () => {
    expect(
      queries.recentlyDone({ ...baseCtx, recentlyDoneWindowDays: 30 }),
    ).toBe(
      'project in ("ABC") AND assignee = currentUser() AND statusCategory = Done AND resolved >= -30d ORDER BY resolved DESC',
    );
  });
});

describe('queries.mentioned', () => {
  it('builds JQL for comments and watching', () => {
    expect(queries.mentioned(baseCtx)).toBe(
      'project in ("ABC") AND (comment ~ currentUser() OR watcher = currentUser()) AND updated >= -7d AND assignee != currentUser() AND statusCategory != Done ORDER BY updated DESC',
    );
  });

  it('clamps non-positive window to a minimum of 1 day', () => {
    expect(queries.mentioned({ ...baseCtx, mentionedWindowDays: 0 })).toBe(
      'project in ("ABC") AND (comment ~ currentUser() OR watcher = currentUser()) AND updated >= -1d AND assignee != currentUser() AND statusCategory != Done ORDER BY updated DESC',
    );
  });
});
