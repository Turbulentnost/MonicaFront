# Cursor Context Prompt: Premium Monica Chat Redesign

## How to use this file

Use this file as **context**, not as a pasted chat wall.

Recommended workflow in Cursor:

1. Put this file into the project, for example:

```txt
.cursor/context/premium-chat-redesign-cursor-prompt.md
```

or:

```txt
docs/prompts/premium-chat-redesign-cursor-prompt.md
```

2. Put the visual references into the project, for example:

```txt
design-references/chat/current-chat.png
design-references/chat/premium-chat-reference.png
```

3. In Cursor Chat / Agent attach this file and the references:

```txt
@.cursor/context/premium-chat-redesign-cursor-prompt.md
@design-references/chat/current-chat.png
@design-references/chat/premium-chat-reference.png
```

4. Also attach the actual chat UI files after Cursor finds them, for example:

```txt
@src/pages/ChatPage.tsx
@src/components/chat
@src/styles
```

If you do not know where the chat files are, first ask Cursor:

```md
Find the current chat page implementation, conversation list components, message bubble components, chat header, composer/input components, right panel if it exists, routing, state management and related styles.

Do not edit files yet.

Report:
1. which files control the chat UI;
2. which files control chat logic;
3. which components can be safely redesigned visually;
4. which logic must not be touched.
```

After Cursor reports the files, attach the relevant files and run the main task below.

---

# Main Task

You are working on the Monica application.

I attached:

- the current chat screen screenshot;
- the premium chat UI reference;
- reusable design rules or design context if available;
- current chat implementation files.

Your task is to redesign the current Monica chat page into a **top-tier premium desktop messenger UI** inspired by the attached premium reference.

This is **not** an auth page. Do not use login/register layout, auth card structure, email/password fields, registration progress, or auth-specific text.

This must not be a small cosmetic update. This must be a full premium desktop messenger redesign while preserving all existing logic.

---

## 1. Design Goal

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

Use the premium chat reference as the visual direction.

Do not make it childish. Avoid toy-like colors, excessive roundness, oversized bubbly elements, playful gradients, and cartoon-like cards.

The interface should feel more like a serious desktop product than a casual social messenger.

---

## 2. Important Visual Direction

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

## 3. Preserve Existing Functionality

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

## 4. Required New Layout

Rebuild the chat page into a premium desktop messenger shell.

### 4.1 Left Icon Rail

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

### 4.2 Conversations Panel

The conversations panel should contain:

- title: `Messages` or `Чаты` depending on existing localization;
- new chat / compose button if supported;
- premium search field;
- filters/tabs: All / Unread / Mentions or Russian equivalents if localization uses Russian;
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

### 4.3 Main Chat Area

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

### 4.4 Message Bubbles

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

### 4.5 Composer

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

### 4.6 Right Details Panel

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
- smaller radii than the earlier playful mockups;
- compact cards;
- clear tabs;
- no toy-like rounded tiles.

---

## 5. Visual Tokens

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

Tune token values visually against the attached reference.

---

## 6. Background Requirements

Do not use the reference screenshot as a full-page image.

Recreate the background through code:

- CSS linear gradients;
- radial glows;
- subtle star/noise effect if lightweight;
- bottom blue/violet glow similar to the reference;
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

## 7. Icon Requirements

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

## 8. Interaction Requirements

Add polished states where useful.

### Navigation icons

- hover;
- active;
- focus-visible.

### Chat cards

- hover;
- selected;
- unread;
- online.

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

## 9. Accessibility

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

---

## 10. Responsive Behavior

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

---

## 11. Implementation Workflow

Before editing:

1. Identify chat page files.
2. Identify current chat logic.
3. Identify components that render sidebar, chat header, messages, composer and optional details panel.
4. Identify current styling system.
5. Create a short implementation plan.

Then implement:

1. Add/update shared design tokens.
2. Build or refine layout shell.
3. Redesign left rail.
4. Redesign conversations panel.
5. Redesign chat header.
6. Redesign message timeline and bubbles.
7. Redesign composer.
8. Add right details panel if safe.
9. Add interaction states.
10. Add responsive behavior.
11. Test all existing chat functionality.

---

## 12. Strict Restrictions

Do not:

- use the reference as a static UI image;
- use the reference screenshot as background;
- break chat logic;
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

## 13. Visual QA Checklist

After implementation, compare against the premium reference and fix:

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

The result must not look like a template or a toy messenger.
It must look like a serious production-grade desktop messenger made by a senior frontend team.

---

## 14. Final Report

When done, report:

1. Changed files.
2. Created or updated components.
3. Preserved chat logic.
4. Interaction states added.
5. Responsive behavior.
6. How to run and verify.
7. Assumptions or limitations.

---

# Second Pass Prompt

Use this after the first implementation if the UI is not polished enough:

```md
Now do a senior frontend polish pass.

Do not change business logic.

Compare the current implementation against the premium chat reference again and improve only visual quality and UX polish.

Focus on:
- stricter, more mature premium style;
- less childish roundness;
- better panel depth;
- cleaner sidebar spacing;
- stronger but tasteful active chat state;
- more elegant message bubbles;
- better composer alignment;
- better right details panel;
- better typography hierarchy;
- consistent icon sizes;
- consistent radii;
- subtle shadows;
- subtle blue/violet glow;
- custom dark scrollbar;
- hover/focus/active states;
- reduced visual clutter.

Make it look like a production-grade desktop messenger made by a top-tier frontend team.

Do not use auth layout.
Do not use the reference screenshot as an image.
Do not break existing chat functionality.
```

---

# Third Pass Prompt

Use this if the result is still too average:

```md
The result is still not premium enough.

Perform a pixel-level visual refinement pass.

Improve:
- exact spacing rhythm;
- optical alignment;
- message grouping;
- panel border opacity;
- background glow balance;
- chat list card density;
- selected chat card treatment;
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
