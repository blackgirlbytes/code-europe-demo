# Booth Experience — WAD San Jose

Self-paced learning experience for the Entire booth at WeAreDevelopers San Jose. Participants walk through Entire's three layers and create their first Trail.

Everything lives in one file: `index.html`. No installation, no build step, no internet needed — the Entire typefaces, the Marvin artwork and the logo are all embedded inside it, so it looks right even with the conference wifi down.

`assets/` holds the original brand files those embedded copies came from, plus `marvin-cutout.py`, the script that lifted Marvin off Entire's social card. Nothing loads them at runtime; they are there so a developer can redo the work if the artwork changes.

## Open it

Double-click `index.html` and it opens in your browser. That's it.

If you don't have the file yet, go to [the repo on GitHub](https://github.com/entirehq/wad-san-jose-booth-experience), click the green **Code** button → **Download ZIP**, unzip it, and double-click `index.html` inside.

Move through the screens with the **Start** and **Back**/**Next** buttons, or the ← and → arrow keys. Step 1 is a welcome screen, so it has no bar along the bottom — the progress bar appears from step 2 onwards, and there is no step counter anywhere.

If nobody touches anything for ten seconds, the button they are meant to press next gives a small pulse, to draw a passing visitor's eye back to it.

## Change the text

1. Right-click `index.html` → **Open With** → **TextEdit** (Mac) or **Notepad** (Windows). Not Word.
2. Use **⌘F** / **Ctrl+F** to search for the words you want to change — search for the text exactly as you see it on screen.
3. Type your new wording over the old, then save with **⌘S** / **Ctrl+S**.
4. Go back to your browser and refresh the page (**⌘R** / **Ctrl+R**) to see it.

### The one rule

Only change words. Leave anything inside angle brackets alone.

```
<h1>Gates on Trails</h1>
    ↑              ↑
    don't touch these — edit only the words in between
```

So `<h1>Gates on Trails</h1>` can safely become `<h1>How gates work</h1>`. If you accidentally delete a bracket and the page looks broken, close the file without saving and start again — or ask anyone on the team to undo it.

### Finding the right screen

The screens sit in the file in the same order the visitor sees them, 1 to 14, each under a banner. Search for the step number to jump straight to it:

```
<!-- ==================================================================
     STEP 12 of 14 — Gates on Trails
     ================================================================== -->
```

| Screen | What's on it |
|---|---|
| 1 | Name entry, headline, estimated time, and the Start button |
| 2 | Welcome + what Entire is |
| 3 · 7 · 10 | The three layers, shown three times. Edit the wording under **STEP 3** — steps 7 and 10 copy it automatically |
| 4 | Semantic Layer |
| 5 · 6 | Checkpoints · Using the CLI |
| 8 · 9 | Distribution Layer · Speed comparison |
| 11 | Code Review Layer |
| 12 | Gates on Trails |
| 13 | Build your first Trail — the checklist and its hints |
| 14 | Thanks, the three CTAs, and the Finish button |

Text still waiting to be written is marked **Placeholder** — search for that word to find every spot that needs real copy.

### What not to edit

Near the top of the file is a `<style>` section, and near the bottom a `<script>` section. Those control the look and the Back/Next behaviour — leave both alone unless you write code.

The very top of the file also has two enormous unreadable lines of letters and numbers. That is the embedded Entire Headline and Entire Mono type. Scroll straight past it — searching for your text still works normally.

## Marvin

Marvin appears on the screens with the dusk background: he is already drifting around on step 1, walks in from the left to meet the visitor on step 2, comes back down from above on step 14, and sways beside "Happy trails!" after Finish. Steps 3 to 13 are the near-black website look, with no Marvin, so nothing competes with the teaching.

He moves slowly — a single move takes twelve to sixteen seconds, and he waits fifteen to twenty seconds before choosing somewhere new. The movement is stepped rather than smooth so it reads as servo movement rather than floating. Anyone who has motion sensitivity turned on in their operating system sees him standing still instead.

Where he is allowed to go is worked out in JavaScript from the size of the window and the width of the text column, so he keeps to the empty margins beside the words and the band above the footer, and never drifts up into the top of the screen. On a narrow window he stays low and central. That is why his movement is not written as fixed CSS keyframes.

The artwork is the whole robot — head, antenna, neck and body — cut out of Entire's social card, which is the only place the full Marvin is published. He is shown at his natural 340px. His body is cropped at the bottom in the original, so he is always parked low enough that the cut sits off the bottom of the screen. A proper Marvin render would be worth having if he is going on a big screen.

## Videos

Every video is a placeholder box at the moment. Dropping real videos in needs a developer, so send them the file and say which screen.
