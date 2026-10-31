# Wiring the architecture visuals into the page

Three files, no build step, no network. `assets/arch-vis.js` is a classic script that defines
`window.renderArchVisuals(root, data)` and returns `{ destroy: function }`; `assets/arch-vis.css`
styles it; below are the only edits the page needs.

## 0. What is already in this tree

All of steps 1-3 are **already applied** in `assets/app.js` and `index.html`. Check before editing,
so the visuals are not mounted twice:

```
grep -n "arch-vis\|renderArchVisuals\|__archVis" index.html assets/app.js
```

Expected: `arch-vis.css` on line 8, `arch-vis.js` on line 56 of `index.html`; `<div id="archvis"></div>`
in `viewArch`'s `h` array; the mount block after `main.innerHTML = h.join("");`; the `destroy` block at
the top of `route()`. If those are present, skip to step 4. Steps 1-3 are written for a pristine copy.

## 1. index.html - two tags

After the existing stylesheet link (line 7):

```html
<link rel="stylesheet" href="assets/style.css">
<link rel="stylesheet" href="assets/arch-vis.css">
```

After the architecture data script, i.e. before `assets/app.js` - `viewArch` calls into it on the
first render of `#/arch`, so it has to be defined by then:

```html
<script src="content/architecture.js"></script>
<script src="assets/arch-vis.js"></script>
```

## 2. assets/app.js - the mount, inside `function viewArch()`

Directly after `main.innerHTML = h.join("");` (4 lines, 4-space indent, inside the function):

```js
    if (window.__archVis) window.__archVis.destroy();
    var oldStack = main.querySelector(".archstack"), vroot = document.createElement("div");
    if (oldStack) { oldStack.parentNode.insertBefore(vroot, oldStack); oldStack.style.display = "none"; }
    if (window.renderArchVisuals) window.__archVis = window.renderArchVisuals(vroot, A);
```

The third line is the one judgement call in the patch: it hides the old prose stack, whose five
sections carry exactly the text the new detail panel now shows. Delete `oldStack.style.display = "none";`
to keep it - the page then reads the same five layers twice, once as cards and once as prose.

## 3. assets/app.js - the cleanup, at the top of `function route()`

Before the `var h = (location.hash || "#/home")...` line (3 lines):

```js
    if (window.__archVis && typeof window.__archVis.destroy === "function") {
      try { window.__archVis.destroy(); } catch (e) {}
    }
    window.__archVis = null;
```

`destroy()` clears the walk-through timer, disconnects the IntersectionObserver, removes the
`visibilitychange` and `resize` listeners and empties the mount point. It is safe to call twice.

## 4. Only change not yet applied: hide the duplicated prose stack

The current integration mounts the visuals above `.archstack` and leaves the stack visible, so the
five layers appear twice. One line, after the mount block in step 2:

```js
    main.querySelector(".archstack").style.display = "none";
```

Nothing is deleted - removing the line brings the prose back.

## 5. Verify

```
node --check assets/arch-vis.js
```

Then open `index.html` from the filesystem and go to `#/arch`: five cards, kernel at the bottom,
Applications selected, a detail panel under them. Tab to a card, press Down, Up, Enter; leave the
page and come back - the timers must stop (no dot moving while you are elsewhere) and exactly one
copy of the block must be present. With the system set to reduce motion the walk-through starts on
step 1 and does not autoplay.
