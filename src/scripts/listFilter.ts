/**
 * Instant client-side filtering for lists that are already on the page
 * (requests, tasks). The text query is mirrored to ?q= so it survives a
 * reload and can be shared. The server applies the same filter on load.
 *
 *   <input data-filter-input>
 *   <li data-filter-item data-filter-text="…">
 *   <div data-filter-empty hidden>…no matches…</div>
 *   <div data-filter-hide-when-empty>…table…</div>
 */
import { matchesQuery } from '@/lib/utils';

export function initListFilters(): void {
  document.querySelectorAll<HTMLInputElement>('[data-filter-input]').forEach((input) => {
    const scope = input.closest('[data-filter-scope]') ?? document;

    const apply = () => {
      const query = input.value;
      let visible = 0;
      scope.querySelectorAll<HTMLElement>('[data-filter-item]').forEach((item) => {
        const match = matchesQuery(item.dataset.filterText ?? item.textContent ?? '', query);
        item.hidden = !match;
        if (match) visible += 1;
      });
      scope.querySelectorAll<HTMLElement>('[data-filter-empty]').forEach((element) => (element.hidden = visible > 0));
      scope
        .querySelectorAll<HTMLElement>('[data-filter-hide-when-empty]')
        .forEach((element) => (element.hidden = visible === 0));
      scope.querySelectorAll('[data-filter-query]').forEach((element) => (element.textContent = query));

      const url = new URL(window.location.href);
      if (query.trim()) url.searchParams.set('q', query.trim());
      else url.searchParams.delete('q');
      history.replaceState(history.state, '', url);
    };

    input.addEventListener('input', apply);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && input.value) {
        event.preventDefault();
        input.value = '';
        apply();
      }
    });

    scope.querySelectorAll('[data-filter-clear]').forEach((button) =>
      button.addEventListener('click', () => {
        input.value = '';
        apply();
        input.focus();
      }),
    );
  });
}
