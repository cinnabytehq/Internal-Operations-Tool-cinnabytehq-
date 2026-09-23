/**
 * Requests page: loads the list from GET /api/requests and renders it with
 * the <template>s in RequestList.astro.
 *
 * - First load shows a skeleton; later refreshes keep the current rows
 *   (dimmed) so nothing jumps around.
 * - View tabs, status/priority filters and search update the URL and
 *   refetch; search is debounced.
 * - A request created from the dialog appears at the top, highlighted.
 */
import type { Profile, RequestListMeta, RequestQuery, RequestView, RequestWithRelations } from '@/types';
import { api } from '@/lib/api/browser';
import { formatDateTime, formatRelative } from '@/lib/dates';
import { CATEGORY_META, isPriority, isRequestStatus, isRequestView, requestRef } from '@/lib/meta';
import { avatarColor, cn, initials, pluralize } from '@/lib/utils';
import { REQUEST_CREATED_EVENT } from './createRequest';

type ListState = 'loading' | 'ready' | 'empty' | 'no-results' | 'error';

const app = document.querySelector<HTMLElement>('[data-requests-app]');

if (app) {
  const list = app.querySelector<HTMLElement>('[data-request-list]')!;
  const rows = list.querySelector<HTMLElement>('[data-request-rows]')!;
  const cards = list.querySelector<HTMLElement>('[data-request-cards]')!;
  const summary = list.querySelector<HTMLElement>('[data-result-summary]')!;
  const search = app.querySelector<HTMLInputElement>('[data-filter-input]')!;
  const filters = [...app.querySelectorAll<HTMLSelectElement>('select[data-request-filter]')];
  const clearButtons = [...app.querySelectorAll<HTMLElement>('[data-clear-filters]')];

  const rowTemplate = document.getElementById('request-row-template') as HTMLTemplateElement;
  const cardTemplate = document.getElementById('request-card-template') as HTMLTemplateElement;
  const glyphs = (document.getElementById('request-glyphs') as HTMLTemplateElement).content;

  /* ─── State ⇄ URL ─── */

  const params = new URLSearchParams(window.location.search);
  const state: Required<Pick<RequestQuery, 'view'>> & Omit<RequestQuery, 'view'> = {
    view: isRequestView(params.get('view')) ? (params.get('view') as RequestView) : 'all',
    status: isRequestStatus(params.get('status')) ? params.get('status')! as RequestQuery['status'] : undefined,
    priority: isPriority(params.get('priority')) ? params.get('priority')! as RequestQuery['priority'] : undefined,
    q: params.get('q') ?? undefined,
  };

  function syncUrl() {
    const url = new URL(window.location.href);
    url.search = '';
    if (state.view !== 'all') url.searchParams.set('view', state.view);
    if (state.status) url.searchParams.set('status', state.status);
    if (state.priority) url.searchParams.set('priority', state.priority);
    if (state.q?.trim()) url.searchParams.set('q', state.q.trim());
    history.replaceState(history.state, '', url);

    app!.querySelectorAll<HTMLAnchorElement>('[data-tab]').forEach((tab) => {
      if (tab.dataset.tab === state.view) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    });
    const filtered = Boolean(state.status || state.priority || state.q?.trim());
    clearButtons.forEach((button) => {
      if (!button.closest('[data-show]')) button.hidden = !filtered;
    });
  }

  /* ─── Rendering helpers ─── */

  const glyph = (key: string) => glyphs.querySelector(`[data-glyph="${key}"]`)!.firstElementChild!.cloneNode(true);
  const slot = (root: ParentNode, name: string) => root.querySelector<HTMLElement>(`[data-slot="${name}"]`)!;

  function avatar(person: Profile, size: 'xs' | 'sm' = 'sm'): HTMLElement {
    const sizeClass = size === 'xs' ? 'size-5 text-[9px]' : 'size-6 text-[10px]';
    if (person.avatar_url) {
      const img = document.createElement('img');
      img.src = person.avatar_url;
      img.alt = '';
      img.className = cn('shrink-0 rounded-full object-cover', sizeClass);
      return img;
    }
    const span = document.createElement('span');
    span.className = cn('avatar inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-wide', sizeClass);
    span.dataset.color = avatarColor(person.id);
    span.setAttribute('aria-hidden', 'true');
    span.textContent = initials(person.full_name);
    return span;
  }

  function person(personData: Profile, withTeam: boolean): HTMLElement {
    const wrapper = document.createElement('span');
    wrapper.className = 'flex items-center gap-2';
    const text = document.createElement('span');
    text.className = 'min-w-0';
    const name = document.createElement('span');
    name.className = 'block truncate text-fg';
    name.textContent = personData.full_name;
    text.append(name);
    if (withTeam && personData.team) {
      const team = document.createElement('span');
      team.className = 'block truncate text-xs text-fg-subtle';
      team.textContent = personData.team;
      text.append(team);
    }
    wrapper.append(avatar(personData), text);
    return wrapper;
  }

  function renderRow(request: RequestWithRelations): Node {
    const row = rowTemplate.content.firstElementChild!.cloneNode(true) as HTMLElement;
    const href = `/requests/${request.id}`;
    row.dataset.rowHref = href;
    row.dataset.id = request.id;
    const title = slot(row, 'title') as HTMLAnchorElement;
    title.href = href;
    title.textContent = request.title;
    slot(row, 'ref').textContent = requestRef(request.number);
    slot(row, 'category').textContent = CATEGORY_META[request.category].label;
    slot(row, 'category-icon').append(glyph(`category:${request.category}`));
    slot(row, 'requester').append(person(request.requester, false));
    const assignee = slot(row, 'assignee');
    if (request.assignee) assignee.append(person(request.assignee, true));
    else assignee.innerHTML = '<span class="text-fg-subtle">Unassigned</span>';
    slot(row, 'priority').append(glyph(`priority:${request.priority}`));
    slot(row, 'status').append(glyph(`status:${request.status}`));
    slot(row, 'approval').hidden = request.approval?.status !== 'pending';
    const updated = slot(row, 'updated');
    updated.setAttribute('datetime', request.updated_at);
    updated.title = formatDateTime(request.updated_at, Intl.DateTimeFormat().resolvedOptions().timeZone);
    updated.textContent = formatRelative(request.updated_at);
    return row;
  }

  function renderCard(request: RequestWithRelations): Node {
    const card = cardTemplate.content.firstElementChild!.cloneNode(true) as HTMLElement;
    card.dataset.id = request.id;
    (slot(card, 'link') as HTMLAnchorElement).href = `/requests/${request.id}`;
    slot(card, 'category-icon').append(glyph(`category:${request.category}`));
    slot(card, 'ref').textContent = requestRef(request.number);
    slot(card, 'status').append(glyph(`status:${request.status}`));
    slot(card, 'title').textContent = request.title;
    slot(card, 'priority').append(glyph(`priority:${request.priority}`));
    const requester = slot(card, 'requester');
    requester.append(avatar(request.requester, 'xs'), request.requester.full_name.split(' ')[0]);
    slot(card, 'updated').textContent = formatRelative(request.updated_at);
    return card;
  }

  function setState(next: ListState, message?: string) {
    list.dataset.state = next;
    list.querySelectorAll<HTMLElement>('[data-show]').forEach((section) => {
      section.hidden = section.dataset.show !== next;
    });
    if (next === 'error' && message) {
      const description = list.querySelector('[data-show="error"] [role="alert"] p:nth-of-type(2)');
      if (description) description.textContent = message;
    }
  }

  function updateCounts(meta: RequestListMeta) {
    for (const [view, count] of Object.entries(meta.counts)) {
      app!.querySelectorAll(`[data-count="${view}"]`).forEach((badge) => (badge.textContent = String(count)));
    }
  }

  /* ─── Loading ─── */

  let requestSeq = 0;
  let loadedOnce = false;

  async function load(highlightId?: string) {
    const seq = ++requestSeq;
    syncUrl();
    if (loadedOnce) list.dataset.busy = '';
    else setState('loading');
    list.setAttribute('aria-busy', 'true');

    try {
      const { data, meta } = await api.getRequests({ ...state, q: state.q?.trim() || undefined });
      if (seq !== requestSeq) return; // a newer request is on its way

      rows.replaceChildren(...data.map(renderRow));
      cards.replaceChildren(...data.map(renderCard));
      updateCounts(meta);
      summary.textContent = `Showing ${pluralize(data.length, 'request')}`;

      const filtered = Boolean(state.status || state.priority || state.q?.trim());
      setState(data.length ? 'ready' : filtered ? 'no-results' : 'empty');
      loadedOnce = true;

      if (highlightId) {
        list.querySelectorAll<HTMLElement>(`[data-id="${highlightId}"]`).forEach((element) => {
          element.classList.add('animate-[target-flash_2.4s_var(--ease-out-soft)]');
          if (element.offsetParent) element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
      }
    } catch (error) {
      if (seq !== requestSeq) return;
      setState('error', error instanceof Error ? error.message : undefined);
    } finally {
      if (seq === requestSeq) {
        delete list.dataset.busy;
        list.removeAttribute('aria-busy');
      }
    }
  }

  /* ─── Controls ─── */

  app.addEventListener('click', (event) => {
    const tab = (event.target as Element).closest<HTMLAnchorElement>('[data-tab]');
    if (tab && !(event as MouseEvent).metaKey && !(event as MouseEvent).ctrlKey) {
      event.preventDefault();
      state.view = tab.dataset.tab as RequestView;
      load();
      return;
    }
    if ((event.target as Element).closest('[data-clear-filters]')) {
      state.status = undefined;
      state.priority = undefined;
      state.q = undefined;
      search.value = '';
      filters.forEach((select) => (select.value = ''));
      load();
    }
  });

  filters.forEach((select) =>
    select.addEventListener('change', () => {
      Object.assign(state, { [select.name]: select.value || undefined });
      load();
    }),
  );

  let searchTimer = 0;
  search.addEventListener('input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      state.q = search.value;
      load();
    }, 250);
  });
  search.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && search.value) {
      search.value = '';
      state.q = undefined;
      load();
    }
  });

  document.addEventListener(REQUEST_CREATED_EVENT, (event) => {
    const created = (event as CustomEvent<RequestWithRelations>).detail;
    // Show everything so the new request is guaranteed to be visible.
    Object.assign(state, { view: 'all', status: undefined, priority: undefined, q: undefined });
    search.value = '';
    filters.forEach((select) => (select.value = ''));
    load(created.id);
  });

  load();
}
