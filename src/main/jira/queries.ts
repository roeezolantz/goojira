// JQL builders for the various sections.

const escapeJql = (s: string) => s.replace(/"/g, '\\"');

const projectClause = (projectKeys: string[]): string =>
  projectKeys.length === 0 ? '' : `project in (${projectKeys.map((k) => `"${escapeJql(k)}"`).join(', ')})`;

const join = (...clauses: (string | false | null | undefined)[]) =>
  clauses
    .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    .join(' AND ');

export interface QueryContext {
  projectKeys: string[];
  recentlyDoneWindowDays: number;
  mentionedWindowDays: number;
}

export const queries = {
  inProgress: (ctx: QueryContext) =>
    join(
      projectClause(ctx.projectKeys),
      'assignee = currentUser()',
      'statusCategory = "In Progress"',
      'sprint in openSprints()',
    ) + ' ORDER BY updated DESC',

  todo: (ctx: QueryContext) =>
    join(
      projectClause(ctx.projectKeys),
      'assignee = currentUser()',
      'statusCategory = "To Do"',
      'sprint in openSprints()',
    ) + ' ORDER BY priority DESC, updated DESC',

  // "Awaiting review": tickets reported by me that are now in code review / QA / similar.
  awaitingReview: (ctx: QueryContext) =>
    join(
      projectClause(ctx.projectKeys),
      'reporter = currentUser()',
      '(status in ("In Review", "Code Review", "Review", "QA", "Awaiting Review") OR statusCategory = "In Progress")',
      'assignee != currentUser()',
      'statusCategory != Done',
    ) + ' ORDER BY updated DESC',

  // Unassigned in current sprint — anyone could grab it.
  availableToTake: (ctx: QueryContext) =>
    join(
      projectClause(ctx.projectKeys),
      'assignee is EMPTY',
      'sprint in openSprints()',
      'statusCategory != Done',
    ) + ' ORDER BY priority DESC, updated DESC',

  // Backlog: assigned-to-me OR unassigned, not in any sprint, not done. We'll split into two
  // subgroups in the renderer.
  backlog: (ctx: QueryContext) =>
    join(
      projectClause(ctx.projectKeys),
      '(assignee = currentUser() OR assignee is EMPTY)',
      'sprint is EMPTY',
      'statusCategory != Done',
      'issuetype != Epic',
    ) + ' ORDER BY priority DESC, rank ASC',

  // Blocked items assigned to me (label or status).
  blocked: (ctx: QueryContext) =>
    join(
      projectClause(ctx.projectKeys),
      'assignee = currentUser()',
      '(labels in (blocked, Blocked, BLOCKED) OR status in ("Blocked", "Impediment"))',
      'statusCategory != Done',
    ) + ' ORDER BY updated DESC',

  recentlyDone: (ctx: QueryContext) =>
    join(
      projectClause(ctx.projectKeys),
      'assignee = currentUser()',
      'statusCategory = Done',
      `resolved >= -${Math.max(1, ctx.recentlyDoneWindowDays)}d`,
    ) + ' ORDER BY resolved DESC',

  mentioned: (ctx: QueryContext) =>
    join(
      projectClause(ctx.projectKeys),
      `(comment ~ currentUser() OR watcher = currentUser())`,
      `updated >= -${Math.max(1, ctx.mentionedWindowDays)}d`,
      'assignee != currentUser()',
      'statusCategory != Done',
    ) + ' ORDER BY updated DESC',
};
