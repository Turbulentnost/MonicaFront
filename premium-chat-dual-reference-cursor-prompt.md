# Cursor Context Prompt: Monica Chat Redesign with Default and Secret Favorites References

## How to use this file

Use this file as **context** in Cursor, not as a huge pasted chat message.

Recommended project structure:

```txt
.cursor/context/premium-chat-dual-reference-cursor-prompt.md

design-references/chat/chats.png
design-references/chat/chats-special.png
```

In Cursor Chat / Agent attach this context file and both visual references:

```txt
@.cursor/context/premium-chat-dual-reference-cursor-prompt.md
@design-references/chat/chats.png
@design-references/chat/chats-special.png
```

Also attach the real chat implementation files after Cursor finds them, for example:

```txt
@src/pages/ChatPage.tsx
@src/components/chat
@src/styles
```

If you do not know where the chat files are, first ask Cursor:

```md
Find the current chat page implementation, conversation list components, message bubble components, chat header, composer/input components, right panel if it exists, routing, state management, keyboard shortcut handling and related styles.

Do not edit files yet.

Report:
1. which files control the chat UI;
2. which files control chat logic;
3. which files control keyboard shortcuts, if any;
4. which components can be safely redesigned visually;
5. which logic must not be touched.
```

After Cursor reports the files, attach the relevant files and run the main task below.

---

# Main Task

You are working on the Monica application.

I attached two visual references:

1. `chats.png` — the **default chat page reference**.
2. `chats-special.png` — the **secret special Favorites view reference**.

Your task is to redesign the current Monica chat page into a premium strict dark desktop messenger UI and implement a hidden special Favorites view.

This is **not** an auth page. Do not use login/register layout, auth card structure, email/password fields, registration progress, or auth-specific text.

This must not be a small cosmetic update. This must be a full premium desktop messenger redesign while preserving all existing chat logic.

---

## 1. Critical Reference Mapping

### 1.1 Default state

`chats.png` is the source of truth for the normal chat page.

The default page must render according to `chats.png` when the user simply opens the chat page.

Use `chats.png` for:

- default layout;
- default sidebar;
- default chat list;
- default selected chat view;
- default message timeline;
- default composer;
- default right/details panel if shown;
- default hover/focus/active states;
- default empty/loading states, adapted to the same style.

### 1.2 Special Favorites state

`chats-special.png` is the source of truth only for the special Favorites mode.

This special version must open **only** after the user enters the exact secret keyboard sequence:

```txt
Ctrl + Shift held down while pressing, in order:
F, then R, then O, then N, then T
```

The exact sequence is:

```txt
Ctrl+Shift+F → Ctrl+Shift+R → Ctrl+Shift+O → Ctrl+Shift+N → Ctrl+Shift+T
```

This condition is mandatory.

The special Favorites view must not open by default.
It must not open from a normal visible button.
It must not open from a normal route.
It must not open from a query parameter.
It must not open from localStorage by default.
It must not open when the user presses only `F R O N T` without both Ctrl and Shift held.
It must not open when the letters are typed in the wrong order.
It must not open when only Ctrl is held.
It must not open when only Shift is held.
It must not open when Ctrl+Shift is held for only part of the sequence.

The special version must be available **only** through this exact sequence.

---

## 2. Secret Favorites Keyboard Sequence: Exact Implementation Requirements

Implement a safe, local, app-level keyboard sequence detector for the chat page.

### 2.1 Required behavior

The detector must listen for this exact sequence:

```ts
['KeyF', 'KeyR', 'KeyO', 'KeyN', 'KeyT']
```

Every keydown event in the sequence must satisfy:

```ts
event.ctrlKey === true
&& event.shiftKey === true
```

Use `event.code` as the primary signal so the sequence still works reliably with different keyboard layouts.
Optionally also support `event.key.toUpperCase()` as fallback, but do not weaken the Ctrl+Shift requirement.

### 2.2 Sequence rules

- Start at index 0.
- If the next correct key is pressed while Ctrl+Shift are held, advance the sequence.
- If all five keys are entered correctly, activate/open the special Favorites view.
- If the wrong non-modifier key is pressed, reset the sequence to 0.
- If Ctrl or Shift is not held for a sequence key, reset the sequence to 0.
- Ignore standalone modifier key events such as `Control`, `Shift`, `Alt`, `Meta`.
- Prevent default only for the matching Ctrl+Shift sequence keys to avoid browser/app shortcut conflicts.
- Do not block unrelated keyboard shortcuts.
- Add cleanup for event listeners on component unmount.
- Avoid memory leaks.

### 2.3 Persistence rules

By default, the special Favorites mode must be session-only.

Do not persist it to localStorage, cookies, database, URL query, route params or backend unless explicitly requested later.

After a full page refresh, the default view should return to `chats.png`.

### 2.4 Accessibility and UX rules

Do not show this shortcut in the visible UI.
Do not add a visible button for this special mode.
Do not add a menu item for this special mode.
Do not expose it in the default chat navigation.

After successful activation, the view may:

- switch to the Favorites/Special mode immediately;
- display a subtle non-intrusive transition;
- update the active filter/state to Favorites if such filter exists.

Optional: allow `Escape` to close the special Favorites view and return to the default `chats.png` layout, but do not make Escape required for activation.

### 2.5 Suggested React-style implementation idea

Use this as guidance, not necessarily exact code if the project uses another stack:

```ts
const SECRET_SEQUENCE = ['KeyF', 'KeyR', 'KeyO', 'KeyN', 'KeyT'];

function useSecretFavoritesShortcut(onUnlock: () => void) {
  const indexRef = useRef(0);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isModifierOnly = ['Control', 'Shift', 'Alt', 'Meta'].includes(event.key);
      if (isModifierOnly) return;

      const expectedCode = SECRET_SEQUENCE[indexRef.current];
      const isExpected = event.code === expectedCode;
      const hasRequiredModifiers = event.ctrlKey && event.shiftKey;

      if (hasRequiredModifiers && isExpected) {
        event.preventDefault();
        event.stopPropagation();
        indexRef.current += 1;

        if (indexRef.current === SECRET_SEQUENCE.length) {
          indexRef.current = 0;
          onUnlock();
        }

        return;
      }

      indexRef.current = 0;
    }

    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [onUnlock]);
}
```

Adjust to the actual framework and project conventions.

---

## 3. Design Goal

Transform the current chat page into a high-end desktop messenger interface similar in quality to:

- Linear;
- Raycast;
- Arc;
- Cursor;
- premium SaaS desktop apps;
- high-end macOS-style productivity tools.

The final UI must feel:

- premium;
- strict;
- mature;
- dark;
- glass-like;
- layered;
- polished;
- spacious;
- professional;
- futuristic but usable;
- visually rich but not cluttered.

Use `chats.png` as the visual source of truth for the default page.
Use `chats-special.png` as the visual source of truth only for the secret Favorites state.

Do not make it childish. Avoid toy-like colors, excessive roundness, oversized bubbly elements, playful gradients, and cartoon-like cards.

The interface should feel more like a serious desktop product than a casual social messenger.

---

## 4. Important Visual Direction

The new style must be **strict premium dark UI**.

Use:

- restrained glassmorphism;
- deep dark navy background;
- subtle blue/violet glow;
- thin borders;
- precise spacing;
- strong visual hierarchy;
- premium typography;
- controlled gradients;
- clean surfaces;
- polished component states.

Avoid:

- too many large round corners;
- overly soft pill-shaped everything;
- childish colors;
- random neon everywhere;
- too much glow;
- too many gradients inside small components;
- flat default-looking UI;
- bulky message bubbles;
- huge avatars;
- inconsistent icon sizes;
- inconsistent border radii;
- clutter.

Corners should be modern but stricter:

```css
--radius-xs: 6px;
--radius-sm: 8px;
--radius-md: 10px;
--radius-lg: 12px;
--radius-xl: 16px;
```

Use large radii only where the reference clearly requires it, such as avatars or circular icon buttons.

---

## 5. Preserve Existing Functionality

This redesign is primarily visual.

Do not break:

- chat routing;
- selected chat logic;
- message loading;
- message sending;
- private chat logic;
- online status;
- read status;
- search behavior;
- notifications;
- logout behavior;
- attachments logic;
- code/snippet button logic;
- emoji logic if it exists;
- favorites logic if it already exists;
- file upload logic if it exists;
- API calls;
- state management;
- existing data structures.

Do not change backend contracts.
Do not rewrite unrelated pages.
Do not remove existing features.

If a visual feature from the reference does not exist in the current app, implement it only as a safe UI shell if it does not break logic.

If a feature from the reference does not exist in the app data model, create only a safe visual placeholder or skip it. Do not invent backend logic.

---

## 6. Required Default Layout: `chats.png`

Rebuild the default chat page into a premium desktop messenger shell matching `chats.png`.

### 6.1 Left Icon Rail

Create a narrow vertical rail on the far left.

It should contain:

- compact Monica logo or main chat icon;
- navigation icons;
- notification/activity icon if available;
- settings icon;
- current user avatar with online indicator at the bottom.

Style:

- dark glass panel;
- thin border;
- selected icon with restrained blue/violet accent;
- icon hover states;
- consistent icon size;
- professional spacing;
- no cartoon-style glowing blocks.

Preferred appearance:

- rail width around 72-88px depending on existing layout;
- selected item radius around 10-12px;
- subtle active indicator line or compact active surface;
- no excessive huge glowing rounded square.

### 6.2 Conversations Panel

The conversations panel should contain:

- title: `Messages` or `Чаты` depending on existing localization;
- new chat / compose button if supported;
- premium search field;
- filters/tabs: All / Unread / Mentions / Favorites or Russian equivalents if localization uses Russian;
- chat list cards.

Chat cards must support:

- default state;
- hover state;
- active/selected state;
- unread badge;
- online indicator;
- avatar;
- title;
- last message preview;
- timestamp.

The active chat must look premium:

- subtle blue/violet gradient border;
- dark glass background;
- controlled glow;
- no harsh flat highlight;
- no childish saturated pill background.

Preferred appearance:

- card radius around 10-12px;
- compact but readable height;
- clear text hierarchy;
- muted preview text;
- small unread badge;
- restrained active border.

### 6.3 Main Chat Area

The main area must contain:

- polished chat header;
- avatar;
- chat name;
- subtitle/status;
- header actions: search, call, video, menu if the current app supports them;
- message timeline;
- date separator;
- incoming messages;
- outgoing messages;
- reactions if supported;
- reply/quote/file card if supported;
- read status and timestamp.

The message timeline should have depth:

- subtle background gradient;
- optional soft bottom glow;
- clean vertical rhythm;
- consistent message grouping;
- enough empty space without looking empty or broken.

### 6.4 Message Bubbles

Outgoing messages:

- strict blue/periwinkle gradient;
- readable white text;
- subtle inner highlight;
- subtle shadow/glow;
- not too saturated;
- not oversized;
- radius around 12-16px, not huge pill bubbles;
- timestamp/read state aligned cleanly.

Incoming messages:

- dark elevated glass surface;
- subtle border;
- readable text;
- muted sender/timestamp;
- same radius system as outgoing messages.

General bubble rules:

- Do not make bubbles too wide.
- Use consistent max-width.
- Group consecutive messages elegantly.
- Keep message spacing consistent.
- Do not make bubbles look randomly positioned.
- Do not over-round message blocks.

### 6.5 Composer

The bottom composer must look like a premium command/input bar.

It should include:

- attachment button;
- code/snippet button if current logic supports it;
- message input;
- emoji button if supported;
- microphone button if supported;
- send button.

Style:

- glass surface;
- thin border;
- focus glow;
- icons aligned optically;
- send button as premium gradient button;
- disabled state when message is empty;
- no layout jump.

Preserve current Enter/send behavior.

Preferred appearance:

- composer radius around 12-14px;
- send button radius around 10-12px or circular if the current design uses circular controls;
- compact but comfortable height;
- strong alignment of icons and input baseline.

### 6.6 Right Details Panel

Add or redesign a right-side details panel if the app structure allows it.

It should contain:

- Details title;
- close button if panel can close;
- avatar / group logo;
- chat name;
- subtitle;
- participants preview if data exists;
- tabs: Info / Files / Media / Links / Pinned;
- files list;
- media grid.

If the current application does not have real files/media data:

- create a safe placeholder component;
- do not invent backend logic;
- do not break the page;
- keep the panel visually ready for future data.

If adding a right panel would break the existing layout or logic, implement it behind a non-breaking layout container or keep it as a visual shell.

Right panel style:

- strict glass panel;
- thin divider;
- smaller radii than playful mockups;
- compact cards;
- clear tabs;
- no toy-like rounded tiles.

---

## 7. Required Special Favorites Layout: `chats-special.png`

Implement the special Favorites view using `chats-special.png` as the visual source of truth.

This view must be shown only after successful entry of the secret sequence:

```txt
Ctrl+Shift+F → Ctrl+Shift+R → Ctrl+Shift+O → Ctrl+Shift+N → Ctrl+Shift+T
```

### 7.1 How special view relates to Favorites

The special view is the special visual state for Favorites.

If the application already has a Favorites filter/tab:

- do not show the `chats-special.png` version when the user simply clicks Favorites;
- after the secret sequence is completed, open or switch to the special Favorites state;
- the visual result must follow `chats-special.png`;
- keep actual favorites data if it exists;
- if no favorites data exists, use safe placeholder states without inventing backend logic.

If the application does not have a Favorites filter/tab:

- implement the special Favorites view as an internal UI state of the chat page;
- do not add a visible public button for it;
- activate it only through the secret keyboard sequence;
- use `chats-special.png` as the visual reference.

### 7.2 Special view restrictions

The special Favorites view must not be accessible by:

- default page load;
- normal navigation;
- visible button;
- visible tab alone;
- URL route;
- query parameter;
- localStorage flag;
- developer-only obvious toggle in the UI.

It must only open after the exact Ctrl+Shift + F R O N T sequence.

### 7.3 Special view behavior

After activation:

- switch the chat page to the special Favorites view;
- render the layout according to `chats-special.png`;
- keep the app functional;
- preserve message sending if the special view includes a conversation;
- preserve selected chat logic where applicable;
- preserve search and composer behavior where applicable;
- do not make fake API calls;
- do not mutate backend data just because the special view is opened.

Optional but allowed:

- use a local component state such as `isSpecialFavoritesOpen`;
- close the special view with `Escape`;
- reset to default view on page refresh;
- show a subtle transition when switching.

Do not persist the special state unless explicitly requested later.

---

## 8. Visual Tokens

Use a premium dark visual system.

Suggested tokens:

```css
:root {
  --bg-primary: #070A12;
  --bg-secondary: #0A0F1D;
  --bg-tertiary: #0F1424;

  --surface-primary: rgba(14, 19, 34, 0.78);
  --surface-secondary: rgba(18, 24, 43, 0.68);
  --surface-elevated: rgba(24, 31, 54, 0.72);

  --border-subtle: rgba(135, 153, 190, 0.12);
  --border-default: rgba(135, 153, 190, 0.18);
  --border-hover: rgba(135, 153, 190, 0.28);
  --border-active: rgba(91, 124, 255, 0.62);

  --text-primary: #F6F8FF;
  --text-secondary: #AAB4D4;
  --text-muted: #737D99;

  --accent-primary: #5B7CFF;
  --accent-strong: #3F6BFF;
  --accent-violet: #7A5CFF;
  --accent-cyan: #38BDF8;

  --success: #45D69A;
  --warning: #F5B84B;
  --danger: #FF5F7A;

  --radius-xs: 6px;
  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  --shadow-panel: 0 24px 80px rgba(0, 0, 0, 0.38);
  --shadow-soft: 0 12px 32px rgba(0, 0, 0, 0.28);
  --shadow-accent: 0 0 0 1px rgba(91, 124, 255, 0.22), 0 12px 34px rgba(63, 107, 255, 0.18);

  --transition-fast: 140ms ease;
  --transition-base: 180ms ease;
}
```

Use existing project tokens if they exist.
If tokens do not exist, create reusable CSS variables or theme constants.
Do not scatter repeated hardcoded colors.

Tune token values visually against `chats.png` and `chats-special.png`.

---

## 9. Background Requirements

Do not use either reference screenshot as a full-page image.

Recreate the background through code:

- CSS linear gradients;
- radial glows;
- subtle star/noise effect if lightweight;
- bottom blue/violet glow similar to the references;
- glass panels on top.

The background must be responsive and not tied to one fixed screenshot size.

Recommended direction:

```css
background:
  radial-gradient(circle at 12% 90%, rgba(65, 105, 255, 0.24), transparent 30%),
  radial-gradient(circle at 82% 94%, rgba(124, 92, 255, 0.22), transparent 32%),
  radial-gradient(circle at 50% 120%, rgba(56, 189, 248, 0.16), transparent 38%),
  linear-gradient(135deg, #070A12 0%, #0A0F1D 48%, #080B14 100%);
```

Keep the glow restrained. The UI must look premium, not childish.

---

## 10. Icon Requirements

Use one consistent icon system.

Recommended:

- Lucide;
- Heroicons;
- existing project icon set.

Do not mix random icon styles.

Icon-only buttons must have `aria-label`.

Icon style:

- thin-to-medium stroke;
- consistent optical size;
- muted default color;
- accent color only for active or meaningful state;
- no over-bright neon icons everywhere.

---

## 11. Interaction Requirements

Add polished states where useful.

### Navigation icons

- hover;
- active;
- focus-visible.

### Chat cards

- hover;
- selected;
- unread;
- online;
- favorites if the app supports favorites.

### Header actions

- hover;
- active;
- focus-visible.

### Message bubbles

- subtle hover actions if current app supports message menu;
- do not make messages jump;
- no distracting message hover effects.

### Composer buttons

- hover;
- active;
- disabled;
- focus-visible.

### Send button

- default gradient;
- hover glow;
- active press;
- disabled muted state.

### Inputs

- hover;
- focus;
- disabled;
- autofill handling if applicable.

Animations must be premium but restrained.
No excessive bouncing.
No distracting motion.
Respect `prefers-reduced-motion`.

Example reduced-motion rule:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 12. Accessibility

Ensure:

- buttons are semantic;
- icon-only buttons have `aria-label`;
- tab order is logical;
- focus-visible states are clear;
- contrast is readable;
- message input is keyboard accessible;
- send action remains keyboard accessible;
- right panel close button is accessible if present;
- no important action is mouse-only.

The hidden shortcut must not break accessibility or normal keyboard navigation.
Do not trap keyboard focus.
Do not block common shortcuts except the exact matching Ctrl+Shift sequence keys while the sequence is being entered.

---

## 13. Responsive Behavior

Desktop is the priority.

Test at:

- 1920x1080;
- 1440x900;
- 1366x768;
- 1280x720.

The layout must:

- not overflow horizontally;
- keep sidebar usable;
- keep composer visible;
- keep message bubbles readable;
- allow details panel to collapse or become optional on smaller widths if needed.

If mobile support exists, preserve it.

Both `chats.png` default view and `chats-special.png` special Favorites view must remain usable at desktop widths.

---

## 14. Implementation Workflow

Before editing:

1. Identify chat page files.
2. Identify current chat logic.
3. Identify components that render sidebar, chat header, messages, composer and optional details panel.
4. Identify existing favorites logic, if any.
5. Identify current keyboard shortcut handling, if any.
6. Identify current styling system.
7. Create a short implementation plan.

Then implement:

1. Add/update shared design tokens.
2. Build or refine layout shell for `chats.png` default view.
3. Redesign left rail.
4. Redesign conversations panel.
5. Redesign chat header.
6. Redesign message timeline and bubbles.
7. Redesign composer.
8. Add right details panel if safe.
9. Implement secret Favorites state for `chats-special.png`.
10. Implement exact Ctrl+Shift + F R O N T sequence detector.
11. Add interaction states.
12. Add responsive behavior.
13. Test all existing chat functionality.
14. Test the secret Favorites activation and negative cases.

---

## 15. Strict Restrictions

Do not:

- use `chats.png` as a static UI image;
- use `chats-special.png` as a static UI image;
- use either reference screenshot as background;
- show the special Favorites view by default;
- show the special Favorites view from a visible button;
- show the special Favorites view from a route/query/localStorage flag;
- show the special Favorites view from an incomplete shortcut;
- show the special Favorites view if Ctrl and Shift were not held for every letter;
- break chat logic;
- break favorites logic if it exists;
- change API contracts;
- remove existing features;
- add auth-specific UI;
- introduce heavy UI frameworks;
- add unnecessary animation libraries;
- mix icon libraries;
- hardcode repeated colors everywhere;
- redesign unrelated pages;
- leave dead duplicated CSS;
- make the UI childish;
- overuse border-radius;
- overuse glow;
- create toy-like chat bubbles;
- make every component a pill.

---

## 16. Secret Shortcut QA Checklist

After implementation, verify:

- default page load shows `chats.png` style, not special style;
- pressing `F R O N T` without Ctrl+Shift does nothing;
- pressing Ctrl+F or Shift+F alone does nothing;
- pressing Ctrl+Shift+F alone does not open special view;
- pressing Ctrl+Shift+F, Ctrl+Shift+R, Ctrl+Shift+O, Ctrl+Shift+N does not open special view yet;
- pressing exact `Ctrl+Shift+F → R → O → N → T` opens the special Favorites view;
- pressing the letters in the wrong order does not open special view;
- releasing Ctrl or Shift during the sequence prevents activation;
- wrong non-modifier key resets the sequence;
- no visible UI element exposes the secret mode;
- refresh returns to default view unless explicitly requested otherwise later;
- event listeners are cleaned up;
- unrelated keyboard shortcuts still work.

---

## 17. Visual QA Checklist

After implementation, compare against both references.

### Default view: compare with `chats.png`

Fix:

- layout proportions;
- panel borders;
- glass opacity;
- gradients;
- shadows;
- typography;
- icon alignment;
- message bubble width;
- message spacing;
- composer height;
- sidebar active state;
- right panel spacing;
- hover states;
- focus states;
- active states;
- disabled states;
- scrollbars;
- border radii;
- color saturation;
- overall premium feel.

### Special Favorites view: compare with `chats-special.png`

Fix:

- special layout composition;
- special favorites state;
- panel treatment;
- special accents;
- spacing;
- typography;
- cards;
- icons;
- empty or data-backed favorites state;
- transitions from default to special view.

The result must not look like a template or a toy messenger.
It must look like a serious production-grade desktop messenger made by a senior frontend team.

---

## 18. Final Report

When done, report:

1. Changed files.
2. Created or updated components.
3. Preserved chat logic.
4. Preserved or safely handled favorites logic.
5. Secret Ctrl+Shift + F R O N T sequence implementation details.
6. Interaction states added.
7. Responsive behavior.
8. How to run and verify.
9. How to test the default view against `chats.png`.
10. How to test the special Favorites view against `chats-special.png`.
11. Assumptions or limitations.

---

# Second Pass Prompt

Use this after the first implementation if the UI is not polished enough:

```md
Now do a senior frontend polish pass.

Do not change business logic.

Compare the current implementation against both references again:

- `chats.png` for the default chat page;
- `chats-special.png` for the secret Favorites view.

Improve only visual quality, UX polish and the exact secret Favorites behavior.

Focus on:
- stricter, more mature premium style;
- less childish roundness;
- better panel depth;
- cleaner sidebar spacing;
- stronger but tasteful active chat state;
- more elegant message bubbles;
- better composer alignment;
- better right details panel;
- better special Favorites layout;
- better typography hierarchy;
- consistent icon sizes;
- consistent radii;
- subtle shadows;
- subtle blue/violet glow;
- custom dark scrollbar;
- hover/focus/active states;
- reduced visual clutter.

Verify again that the special Favorites view opens only after the exact sequence:
Ctrl+Shift+F → Ctrl+Shift+R → Ctrl+Shift+O → Ctrl+Shift+N → Ctrl+Shift+T.

Do not use auth layout.
Do not use either reference screenshot as an image.
Do not break existing chat functionality.
```

---

# Third Pass Prompt

Use this if the result is still too average:

```md
The result is still not premium enough.

Perform a pixel-level visual refinement pass.

Default view must match `chats.png`.
Secret Favorites view must match `chats-special.png` and must open only through the exact Ctrl+Shift + F R O N T sequence.

Improve:
- exact spacing rhythm;
- optical alignment;
- message grouping;
- panel border opacity;
- background glow balance;
- chat list card density;
- selected chat card treatment;
- favorites/special state treatment;
- composer proportions;
- send button shape and glow;
- header action spacing;
- right details panel hierarchy;
- stricter corner radius system;
- less playful color usage;
- more professional desktop-app feeling.

Remove anything that looks default, flat, random, childish, overly rounded, or unfinished.

Keep the implementation maintainable and do not change logic.
```
