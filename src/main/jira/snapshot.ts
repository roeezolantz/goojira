import type {
  Issue,
  ProjectInfo,
  BoardInfo,
  Snapshot,
  Sprint,
  TransitionInfo,
  ConnectionTestResult,
  SectionKey,
} from '@shared/types';
import { getSettings } from '../store/settings';
import { getClients } from './client';
import { queries, type QueryContext } from './queries';

const FIELDS = [
  'summary',
  'status',
  'issuetype',
  'priority',
  'assignee',
  'reporter',
  'project',
  'labels',
  'duedate',
  'updated',
  'customfield_10020', // Sprint (default on Jira Cloud)
  'customfield_10016', // Story points (common default)
];

export function mapIssue(raw: any, baseUrl: string): Issue {
  const f = raw.fields ?? {};
  const sprintField = f.customfield_10020;
  const sprintArr = Array.isArray(sprintField) ? sprintField : [];
  const activeSprint = sprintArr.find((s: any) => s?.state === 'active') ?? sprintArr[0];
  const statusCategoryRaw = f.status?.statusCategory?.key;
  const statusCategory: Issue['statusCategory'] =
    statusCategoryRaw === 'new' || statusCategoryRaw === 'undefined'
      ? 'todo'
      : statusCategoryRaw === 'indeterminate'
        ? 'indeterminate'
        : statusCategoryRaw === 'done'
          ? 'done'
          : 'unknown';

  return {
    key: raw.key,
    url: `${baseUrl.replace(/\/$/, '')}/browse/${raw.key}`,
    summary: f.summary ?? '(no summary)',
    status: f.status?.name ?? 'Unknown',
    statusCategory,
    type: f.issuetype?.name ?? 'Task',
    priority: f.priority?.name,
    storyPoints:
      typeof f.customfield_10016 === 'number'
        ? f.customfield_10016
        : f.customfield_10016 != null
          ? Number(f.customfield_10016)
          : null,
    assignee: f.assignee
      ? {
          accountId: f.assignee.accountId,
          displayName: f.assignee.displayName,
          avatarUrl: f.assignee.avatarUrls?.['24x24'],
        }
      : null,
    reporter: f.reporter
      ? {
          accountId: f.reporter.accountId,
          displayName: f.reporter.displayName,
          avatarUrl: f.reporter.avatarUrls?.['24x24'],
        }
      : null,
    projectKey: f.project?.key ?? raw.key.split('-')[0],
    projectName: f.project?.name ?? f.project?.key ?? 'Unknown',
    sprintId: activeSprint?.id ?? null,
    sprintName: activeSprint?.name ?? null,
    labels: f.labels ?? [],
    dueDate: f.duedate ?? null,
    updated: f.updated,
  };
}

async function searchAll(jql: string, baseUrl: string): Promise<Issue[]> {
  if (!jql.trim()) return [];
  const { v3 } = getClients();
  const out: Issue[] = [];
  // Atlassian deprecated /rest/api/3/search (returns 410) in 2024; the new
  // endpoint is /rest/api/3/search/jql, surfaced by jira.js as
  // searchForIssuesUsingJqlEnhancedSearch. It paginates via nextPageToken.
  let nextPageToken: string | undefined = undefined;
  // Cap iterations so a misconfigured query can't loop forever.
  for (let i = 0; i < 5; i++) {
    const res: any = await v3.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
      jql,
      nextPageToken,
      maxResults: 50,
      fields: FIELDS,
    });
    const issues = (res.issues ?? []).map((raw: any) => mapIssue(raw, baseUrl));
    out.push(...issues);
    nextPageToken = res.nextPageToken ?? undefined;
    if (!nextPageToken) break;
  }
  return out;
}

export async function fetchSnapshot(): Promise<Snapshot> {
  const settings = getSettings();
  const errors: string[] = [];
  const ctx: QueryContext = {
    projectKeys: settings.selectedProjectKeys,
    recentlyDoneWindowDays: settings.recentlyDoneWindowDays,
    mentionedWindowDays: settings.mentionedWindowDays,
  };

  const sectionEntries = (
    [
      'inProgress',
      'todo',
      'awaitingReview',
      'availableToTake',
      'backlog',
      'blocked',
      'recentlyDone',
      'mentioned',
    ] as const
  ).map(async (key) => {
    try {
      const jql = queries[key](ctx);
      return [key, await searchAll(jql, settings.baseUrl)] as const;
    } catch (e) {
      errors.push(`${key}: ${(e as Error).message}`);
      return [key, [] as Issue[]] as const;
    }
  });

  const sectionResults = await Promise.all(sectionEntries);
  const sections = Object.fromEntries(sectionResults) as Record<SectionKey, Issue[]>;

  const activeSprints = await fetchActiveSprints().catch((e) => {
    errors.push(`sprints: ${(e as Error).message}`);
    return [] as Sprint[];
  });

  const user = await fetchCurrentUser().catch(() => null);

  return {
    fetchedAt: new Date().toISOString(),
    user,
    activeSprints,
    sections,
    errors: errors.length ? errors : undefined,
  };
}

async function fetchCurrentUser(): Promise<Snapshot['user']> {
  const { v3 } = getClients();
  const me: any = await v3.myself.getCurrentUser();
  return {
    accountId: me.accountId,
    displayName: me.displayName,
    emailAddress: me.emailAddress,
  };
}

async function fetchActiveSprints(): Promise<Sprint[]> {
  const settings = getSettings();
  if (settings.selectedBoardIds.length === 0) return [];
  const { agile } = getClients();
  const allBoardsRes: any = await agile.board.getAllBoards({ maxResults: 100 });
  const boardNameById = new Map<number, string>();
  for (const b of allBoardsRes.values ?? []) boardNameById.set(b.id, b.name);

  const out: Sprint[] = [];
  for (const boardId of settings.selectedBoardIds) {
    try {
      const res: any = await agile.board.getAllSprints({ boardId, state: 'active' });
      for (const s of res.values ?? []) {
        out.push({
          id: s.id,
          name: s.name,
          state: 'active',
          startDate: s.startDate ?? null,
          endDate: s.endDate ?? null,
          goal: s.goal ?? null,
          boardId,
          boardName: boardNameById.get(boardId) ?? `Board ${boardId}`,
        });
      }
    } catch {
      // skip board
    }
  }
  return out;
}

export async function listProjects(): Promise<ProjectInfo[]> {
  const { v3 } = getClients();
  const seen = new Map<string, ProjectInfo>();

  // Try the modern paginated search first.
  try {
    const res: any = await v3.projects.searchProjects({ maxResults: 100 });
    console.log('[goojira] searchProjects:', {
      total: res.total,
      isLast: res.isLast,
      count: (res.values ?? []).length,
    });
    for (const p of res.values ?? []) {
      seen.set(p.key, { key: p.key, name: p.name, avatarUrl: p.avatarUrls?.['24x24'] });
    }
  } catch (e) {
    console.error('[goojira] searchProjects failed:', (e as Error).message);
  }

  // Fallback: derive from the most recent snapshot. Less complete (only
  // shows projects with currently-visible issues) but always works as long as
  // the user has any tickets.
  if (seen.size === 0) {
    try {
      const snap = await fetchSnapshot();
      for (const arr of Object.values(snap.sections)) {
        for (const i of arr) {
          if (!seen.has(i.projectKey)) {
            seen.set(i.projectKey, { key: i.projectKey, name: i.projectName });
          }
        }
      }
      console.log('[goojira] derived from snapshot:', { count: seen.size });
    } catch (e) {
      console.error('[goojira] snapshot-derived projects failed:', (e as Error).message);
    }
  }

  return [...seen.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export async function listBoards(projectKey?: string | null): Promise<BoardInfo[]> {
  const { agile } = getClients();
  try {
    const res: any = await agile.board.getAllBoards({
      projectKeyOrId: projectKey ?? undefined,
      maxResults: 100,
    });
    console.log('[goojira] getAllBoards:', {
      total: res.total,
      isLast: res.isLast,
      count: (res.values ?? []).length,
    });
    return (res.values ?? []).map((b: any) => ({
      id: b.id,
      name: b.name,
      type: b.type,
      projectKey: b.location?.projectKey,
      projectName: b.location?.projectName,
    }));
  } catch (e) {
    console.error('[goojira] getAllBoards failed:', (e as Error).message);
    throw e;
  }
}

export async function getTransitions(issueKey: string): Promise<TransitionInfo[]> {
  const { v3 } = getClients();
  const res: any = await v3.issues.getTransitions({ issueIdOrKey: issueKey });
  return (res.transitions ?? []).map((t: any) => ({
    id: t.id,
    name: t.name,
    toStatus: t.to?.name ?? 'Unknown',
    toStatusCategory:
      t.to?.statusCategory?.key === 'new'
        ? 'todo'
        : t.to?.statusCategory?.key === 'indeterminate'
          ? 'indeterminate'
          : t.to?.statusCategory?.key === 'done'
            ? 'done'
            : 'unknown',
  }));
}

export async function transition(issueKey: string, transitionId: string): Promise<void> {
  const { v3 } = getClients();
  await v3.issues.doTransition({
    issueIdOrKey: issueKey,
    transition: { id: transitionId },
  });
}

export async function assignToMe(issueKey: string): Promise<void> {
  const { v3 } = getClients();
  const me: any = await v3.myself.getCurrentUser();
  await v3.issues.assignIssue({
    issueIdOrKey: issueKey,
    accountId: me.accountId,
  });
}

export async function addComment(issueKey: string, body: string): Promise<void> {
  const { v3 } = getClients();
  // Jira Cloud expects ADF (Atlassian Document Format) for comment bodies.
  await v3.issueComments.addComment({
    issueIdOrKey: issueKey,
    comment: {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: body }],
        },
      ],
    } as any,
  });
}

export async function logWork(
  issueKey: string,
  timeSpent: string,
  comment?: string,
): Promise<void> {
  const { v3 } = getClients();
  await v3.issueWorklogs.addWorklog({
    issueIdOrKey: issueKey,
    timeSpent,
    comment: comment
      ? ({
          type: 'doc',
          version: 1,
          content: [{ type: 'paragraph', content: [{ type: 'text', text: comment }] }],
        } as any)
      : undefined,
  });
}

export async function createIssue(
  projectKey: string,
  summary: string,
  issueType: string,
): Promise<{ key: string; url: string }> {
  const { v3 } = getClients();
  const res: any = await v3.issues.createIssue({
    fields: {
      project: { key: projectKey },
      summary,
      issuetype: { name: issueType },
    },
  });
  return {
    key: res.key,
    url: `${getSettings().baseUrl.replace(/\/$/, '')}/browse/${res.key}`,
  };
}

export async function listIssueTypes(projectKey: string): Promise<{ id: string; name: string }[]> {
  const { v3 } = getClients();
  const res: any = await v3.projects.getProject({
    projectIdOrKey: projectKey,
    expand: 'issueTypes',
  });
  return (res.issueTypes ?? [])
    .filter((t: any) => !t.subtask)
    .map((t: any) => ({ id: t.id, name: t.name }));
}

export async function testConnection(): Promise<ConnectionTestResult> {
  try {
    const u = await fetchCurrentUser();
    return { ok: true, user: u ?? undefined };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
