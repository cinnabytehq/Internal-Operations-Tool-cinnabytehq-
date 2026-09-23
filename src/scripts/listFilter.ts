/**
 * Instant client-side filtering for lists already on the page (tasks).
 * Text search and select filters combine; the text query is mirrored to
 * ?q= so it survives a reload.
 *
 *   <input data-filter-input>                          text search
 *   <select data-filter-select="priority">             matches data-priority
 *   <li data-filter-item data-filter-text="…" data-priority="high">
 *   <div data-filter-empty hidden>…no matches…</div>
 *   <div data-filter-hide-when-empty>…list…</div>
 *
 * Inputs marked data-filter-remote are handled by their page instead
 * (the Requests page queries the API).
 */
import { matchesQuery } from '@/lib/utils';

export function initListFilters(): void {
  document.querySelectorAll<HTMLInputElement>('[data-filter-input]:not([data-filter-remote])').forEach((input) => {
    const scope = input.closest('[data-filter-scope]') ?? document;
    const selects = [...scope.querySelectorAll<HTMLSelectElement>('select[data-filter-select]')];

    const apply = () => {
      const query = input.value;
      let visible = 0;
      scope.querySelectorAll<HTMLElement>('[data-filter-item]').forEach((item) => {
        const match =
          matchesQuery(item.dataset.filterText ?? item.textContent ?? '', query) &&
          selects.every((select) => !select.value || item.dataset[select.dataset.filterSelect!] === select.value);
        item.hidden = !match;
        if (match) visible += 1;
      });
      scope.querySelectorAll<HTMLElement>('[data-filter-empty]').forEach((element) => (element.hidden = visible > 0));
      scope.querySelectorAll<HTMLElement>('[data-filter-hide-when-empty]').forEach((element) => (element.hidden = visible === 0));

      const url = new URL(window.location.href);
      if (query.trim()) url.searchParams.set('q', query.trim());
      else url.searchParams.delete('q');
      for (const select of selects) {
        if (select.value) url.searchParams.set(select.dataset.filterSelect!, select.value);
        else url.searchParams.delete(select.dataset.filterSelect!);
      }
      history.replaceState(history.state, '', url);
    };

    input.addEventListener('input', apply);
    selects.forEach((select) => select.addEventListener('change', apply));
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
        selects.forEach((select) => (select.value = ''));
        apply();
        input.focus();
      }),
    );

    if (input.value || selects.some((select) => select.value)) apply();
  });
}
