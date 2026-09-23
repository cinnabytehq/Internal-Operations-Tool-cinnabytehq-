/**
 * Command palette (⌘K / Ctrl+K).
 *
 * - Empty query: quick actions + navigation (rendered by the server).
 * - Typing: filters those, and searches requests/projects/tasks through
 *   the `search` action (→ services/search.ts → mock store / REST API).
 * - Keyboard: ↑/↓ to move, Enter to open, Esc to close.
 */
import { actions } from 'astro:actions';
import type { SearchResult } from '@/types';
import { openDialog } from './dialogs';
import { toggleTheme } from './theme';

const GROUP_LABELS: Record<SearchResult['type'], string> = {
  request: 'Requests',
  project: 'Projects',
  task: 'Tasks',
};

export function initCommandPalette(): void {
  const dialog = document.getElementById('command-palette') as HTMLDialogElement | null;
  const input = document.getElementById('palette-input') as HTMLInputElement | null;
  if (!dialog || !input) return;

  const list = dialog.querySelector<HTMLElement>('#palette-list')!;
  const resultsEl = dialog.querySelector<HTMLElement>('[data-palette-results]')!;
  const staticEl = dialog.querySelector<HTMLElement>('[data-palette-static]')!;
  const loadingEl = dialog.querySelector<HTMLElement>('[data-palette-loading]')!;
  const emptyEl = dialog.querySelector<HTMLElement>('[data-palette-empty]')!;

  let activeIndex = 0;
  let searchTimer = 0;
  let latestQuery = '';
  let optionCount = 0;

  const visibleOptions = () =>
    [...list.querySelectorAll<HTMLElement>('[data-palette-item]')].filter(
      (option) => !option.hidden && !option.closest('[hidden]'),
    );

  function setActive(index: number) {
    const options = visibleOptions();
    options.forEach((option) => option.setAttribute('aria-selected', 'false'));
    if (!options.length) {
      input!.removeAttribute('aria-activedescendant');
      return;
    }
    activeIndex = (index + options.length) % options.length;
    const option = options[activeIndex];
    option.setAttribute('aria-selected', 'true');
    if (!option.id) option.id = `palette-option-${++optionCount}`;
    input!.setAttribute('aria-activedescendant', option.id);
    option.scrollIntoView({ block: 'nearest' });
  }

  /** Show/hide the built-in actions and pages that match the query. */
  function filterStatic(query: string) {
    const q = query.trim().toLowerCase();
    staticEl.querySelectorAll<HTMLElement>('[data-palette-item]').forEach((option) => {
      const text = `${option.textContent} ${option.dataset.keywords ?? ''}`.toLowerCase();
      option.hidden = q !== '' && !q.split(/\s+/).every((word) => text.includes(word));
    });
    staticEl.querySelectorAll<HTMLElement>('[data-palette-group]').forEach((group) => {
      group.hidden = !group.querySelector('[data-palette-item]:not([hidden])');
    });
  }

  function renderResults(results: SearchResult[]) {
    resultsEl.replaceChildren();
    const groupTemplate = document.getElementById('palette-group-template') as HTMLTemplateElement;
    const optionTemplate = document.getElementById('palette-option-template') as HTMLTemplateElement;

    (Object.keys(GROUP_LABELS) as SearchResult['type'][]).forEach((type) => {
      const matches = results.filter((result) => result.type === type);
      if (!matches.length) return;
      const group = groupTemplate.content.firstElementChild!.cloneNode(true) as HTMLElement;
      group.querySelector('[data-group-label]')!.textContent = GROUP_LABELS[type];
      const icon = (document.getElementById(`palette-icon-${type}`) as HTMLTemplateElement).content;

      for (const result of matches) {
        const option = optionTemplate.content.firstElementChild!.cloneNode(true) as HTMLAnchorElement;
        option.href = result.href;
        option.querySelector('[data-option-icon]')!.append(icon.cloneNode(true));
        option.querySelector('[data-option-title]')!.textContent = result.title;
        option.querySelector('[data-option-subtitle]')!.textContent = result.subtitle;
        group.append(option);
      }
      resultsEl.append(group);
    });
  }

  async function search(query: string) {
    latestQuery = query;
    if (!query.trim()) {
      resultsEl.replaceChildren();
      loadingEl.hidden = true;
      emptyEl.hidden = true;
      setActive(0);
      return;
    }

    loadingEl.hidden = resultsEl.childElementCount > 0;
    const { data, error } = await actions.search({ query });
    if (query !== latestQuery) return; // a newer search is in flight

    loadingEl.hidden = true;
    renderResults(error ? [] : data);
    const nothing = visibleOptions().length === 0;
    emptyEl.hidden = !nothing;
    emptyEl.querySelector('[data-palette-query]')!.textContent = query;
    setActive(0);
  }

  function reset() {
    input!.value = '';
    latestQuery = '';
    resultsEl.replaceChildren();
    loadingEl.hidden = true;
    emptyEl.hidden = true;
    filterStatic('');
    setActive(0);
  }

  function runCommand(option: HTMLElement) {
    const command = option.dataset.paletteCommand;
    if (!command) {
      option.click();
      dialog!.close();
      return;
    }
    dialog!.close();
    if (command === 'new-request') openDialog('create-request');
    if (command === 'toggle-theme') toggleTheme();
    if (command === 'shortcuts') openDialog('shortcuts-dialog');
  }

  input.addEventListener('input', () => {
    const query = input.value;
    filterStatic(query);
    setActive(0);
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => search(query), 140);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(activeIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(activeIndex - 1);
    } else if (event.key === 'Enter') {
      const option = visibleOptions()[activeIndex];
      if (option) {
        event.preventDefault();
        runCommand(option);
      }
    }
  });

  list.addEventListener('mousemove', (event) => {
    const option = (event.target as Element).closest<HTMLElement>('[data-palette-item]');
    if (option) setActive(visibleOptions().indexOf(option));
  });

  list.addEventListener('click', (event) => {
    const option = (event.target as Element).closest<HTMLElement>('[data-palette-command]');
    if (option) runCommand(option);
  });

  dialog.addEventListener('close', reset);

  document.addEventListener('click', (event) => {
    if ((event.target as Element).closest('[data-palette-open]')) openPalette();
  });

  reset();
}

export function openPalette(): void {
  openDialog('command-palette');
  (document.getElementById('palette-input') as HTMLInputElement | null)?.focus();
}

export function togglePalette(): void {
  const dialog = document.getElementById('command-palette') as HTMLDialogElement | null;
  if (dialog?.open) dialog.close();
  else openPalette();
}
