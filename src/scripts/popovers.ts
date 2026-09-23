/**
 * Menus and panels built on the native Popover API.
 *
 * The browser already handles opening (popovertarget), light dismiss and
 * Escape. This module adds:
 *   - positioning next to the button that opened it (with flipping)
 *   - arrow-key navigation, Home/End, and focus return on close
 *   - aria-expanded on the trigger
 */

const GAP = 6;
const VIEWPORT_MARGIN = 8;

/** Remember which button opened each popover (a menu can have several). */
const invokers = new WeakMap<HTMLElement, HTMLElement>();
let openedWithKeyboard = false;

function invokerFor(popover: HTMLElement): HTMLElement | null {
  return invokers.get(popover) ?? document.querySelector<HTMLElement>(`[popovertarget="${popover.id}"]`);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function position(popover: HTMLElement): void {
  const invoker = invokerFor(popover);
  if (!invoker) return;
  const anchor = invoker.getBoundingClientRect();
  const width = popover.offsetWidth;
  const height = popover.offsetHeight;
  const [side, align] = (popover.dataset.placement ?? 'bottom-end').split('-');

  let top: number;
  let left: number;

  if (side === 'right') {
    left = anchor.right + GAP;
    top = align === 'end' ? anchor.bottom - height : anchor.top;
  } else {
    left = align === 'end' ? anchor.right - width : anchor.left;
    top = side === 'top' ? anchor.top - height - GAP : anchor.bottom + GAP;
    // Flip when there isn't room on the preferred side.
    const fitsBelow = anchor.bottom + GAP + height <= window.innerHeight - VIEWPORT_MARGIN;
    const fitsAbove = anchor.top - GAP - height >= VIEWPORT_MARGIN;
    if (side === 'bottom' && !fitsBelow && fitsAbove) top = anchor.top - height - GAP;
    if (side === 'top' && !fitsAbove && fitsBelow) top = anchor.bottom + GAP;
  }

  popover.style.left = `${clamp(left, VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN)}px`;
  popover.style.top = `${clamp(top, VIEWPORT_MARGIN, window.innerHeight - height - VIEWPORT_MARGIN)}px`;
}

function focusableItems(popover: HTMLElement): HTMLElement[] {
  return [...popover.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), [role^="menuitem"]:not([aria-disabled="true"])')].filter(
    (element, index, list) => list.indexOf(element) === index && element.offsetParent !== null,
  );
}

function openPopovers(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-menu]:popover-open')];
}

export function initPopovers(): void {
  // Track the trigger and whether the keyboard was used to open.
  document.addEventListener(
    'click',
    (event) => {
      const trigger = (event.target as Element).closest<HTMLElement>('[popovertarget]');
      if (!trigger) return;
      const popover = document.getElementById(trigger.getAttribute('popovertarget') ?? '');
      if (popover) invokers.set(popover, trigger);
      openedWithKeyboard = (event as MouseEvent).detail === 0;
    },
    true,
  );

  document.querySelectorAll<HTMLElement>('[data-menu]').forEach((popover) => {
    popover.addEventListener('beforetoggle', (event) => {
      const opening = (event as ToggleEvent).newState === 'open';
      if (opening) requestAnimationFrame(() => position(popover));
    });

    popover.addEventListener('toggle', (event) => {
      const open = (event as ToggleEvent).newState === 'open';
      const invoker = invokerFor(popover);
      invoker?.setAttribute('aria-expanded', String(open));

      if (open) {
        if (openedWithKeyboard) {
          const checked = popover.querySelector<HTMLElement>('[aria-checked="true"]');
          (checked ?? focusableItems(popover)[0])?.focus();
        }
      } else if (popover.contains(document.activeElement) || document.activeElement === document.body) {
        invoker?.focus({ preventScroll: true });
      }
    });

    popover.addEventListener('keydown', (event) => {
      const items = focusableItems(popover);
      if (!items.length) return;
      const index = items.indexOf(document.activeElement as HTMLElement);
      const move = (next: number) => {
        event.preventDefault();
        items[(next + items.length) % items.length].focus();
      };
      if (event.key === 'ArrowDown') move(index + 1);
      else if (event.key === 'ArrowUp') move(index <= 0 ? items.length - 1 : index - 1);
      else if (event.key === 'Home') move(0);
      else if (event.key === 'End') move(items.length - 1);
      else if (event.key === 'Tab' && popover.getAttribute('role') === 'menu') popover.hidePopover();
    });

    // Picking an item closes the menu.
    popover.addEventListener('click', (event) => {
      const item = (event.target as Element).closest('[role^="menuitem"]');
      if (item && !item.hasAttribute('data-keep-open')) popover.hidePopover();
    });
  });

  let frame = 0;
  const reposition = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => openPopovers().forEach(position));
  };
  window.addEventListener('resize', reposition, { passive: true });
  window.addEventListener('scroll', reposition, { passive: true, capture: true });
}
