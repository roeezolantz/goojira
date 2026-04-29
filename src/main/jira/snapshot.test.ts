import { describe, it, expect } from 'vitest';
import { mapIssue } from './snapshot';

const BASE = 'https://acme.atlassian.net';

function makeRaw(overrides: Record<string, unknown> = {}) {
  return {
    key: 'PROJ-123',
    fields: {
      summary: 'Investigate flaky test',
      status: { name: 'In Progress', statusCategory: { key: 'indeterminate' } },
      issuetype: { name: 'Bug' },
      priority: { name: 'High' },
      project: { key: 'PROJ', name: 'Project' },
      labels: [],
      updated: '2026-04-29T10:00:00.000Z',
      ...overrides,
    },
  };
}

describe('mapIssue', () => {
  it('maps a standard issue with an assignee', () => {
    const raw = makeRaw({
      assignee: {
        accountId: 'a-1',
        displayName: 'Alice',
        avatarUrls: { '24x24': 'https://avatar/alice.png' },
      },
    });

    const issue = mapIssue(raw, BASE);

    expect(issue.key).toBe('PROJ-123');
    expect(issue.url).toBe('https://acme.atlassian.net/browse/PROJ-123');
    expect(issue.summary).toBe('Investigate flaky test');
    expect(issue.status).toBe('In Progress');
    expect(issue.statusCategory).toBe('indeterminate');
    expect(issue.type).toBe('Bug');
    expect(issue.priority).toBe('High');
    expect(issue.assignee).toEqual({
      accountId: 'a-1',
      displayName: 'Alice',
      avatarUrl: 'https://avatar/alice.png',
    });
    expect(issue.projectKey).toBe('PROJ');
    expect(issue.projectName).toBe('Project');
  });

  it('returns assignee = null for an unassigned issue', () => {
    const issue = mapIssue(makeRaw({ assignee: null }), BASE);
    expect(issue.assignee).toBeNull();
  });

  it('reads story points from customfield_10016 when numeric', () => {
    const issue = mapIssue(makeRaw({ customfield_10016: 5 }), BASE);
    expect(issue.storyPoints).toBe(5);
  });

  it('coerces non-numeric story-point values to a number', () => {
    const issue = mapIssue(makeRaw({ customfield_10016: '8' }), BASE);
    expect(issue.storyPoints).toBe(8);
  });

  it('returns storyPoints = null when customfield_10016 is absent', () => {
    const issue = mapIssue(makeRaw(), BASE);
    expect(issue.storyPoints).toBeNull();
  });

  it('extracts the active sprint when multiple sprints are returned', () => {
    const raw = makeRaw({
      customfield_10020: [
        { id: 1, name: 'Sprint 46', state: 'closed' },
        { id: 2, name: 'Sprint 47', state: 'active' },
        { id: 3, name: 'Sprint 48', state: 'future' },
      ],
    });

    const issue = mapIssue(raw, BASE);

    expect(issue.sprintId).toBe(2);
    expect(issue.sprintName).toBe('Sprint 47');
  });

  it('returns sprintId/sprintName = null when the sprint field is empty', () => {
    const issue = mapIssue(makeRaw({ customfield_10020: [] }), BASE);
    expect(issue.sprintId).toBeNull();
    expect(issue.sprintName).toBeNull();
  });

  it('derives projectKey from the issue key when project field is missing', () => {
    const raw = makeRaw({ project: undefined });
    const issue = mapIssue(raw, BASE);
    expect(issue.projectKey).toBe('PROJ');
  });

  it('strips a trailing slash from baseUrl when building the issue URL', () => {
    const issue = mapIssue(makeRaw(), 'https://acme.atlassian.net/');
    expect(issue.url).toBe('https://acme.atlassian.net/browse/PROJ-123');
  });

  it('falls back to the first sprint when none is active', () => {
    const raw = makeRaw({
      customfield_10020: [
        { id: 10, name: 'Sprint 10', state: 'closed' },
        { id: 11, name: 'Sprint 11', state: 'closed' },
      ],
    });
    const issue = mapIssue(raw, BASE);
    expect(issue.sprintId).toBe(10);
    expect(issue.sprintName).toBe('Sprint 10');
  });

  it('maps statusCategory key "new" to "todo"', () => {
    const raw = makeRaw({
      status: { name: 'Open', statusCategory: { key: 'new' } },
    });
    expect(mapIssue(raw, BASE).statusCategory).toBe('todo');
  });

  it('maps an unknown statusCategory to "unknown"', () => {
    const raw = makeRaw({
      status: { name: 'Frozen', statusCategory: { key: 'something-else' } },
    });
    expect(mapIssue(raw, BASE).statusCategory).toBe('unknown');
  });
});
