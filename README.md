# Canto → Mando

A local study app for people who grew up speaking Cantonese and want to learn Mandarin, read and write Chinese characters, and get better at Cantonese along the way.

It starts from what a Cantonese speaker already has: the grammar and the sound of thousands of words. Every card ties three things together: the Cantonese you know by ear, the character, and the Mandarin sound.

## Run it

```sh
npm install
npm run dev
```

Then open http://localhost:5173. It needs Node 18 or newer. Audio uses the speech voices your browser offers, so there are no accounts, keys, or costs. Press `M` to hear the current item in Mandarin and `C` in Cantonese, on any page.

In a browser, the app picks the best voice that actually works. Some installed voices report that they are speaking but make no sound (Tingting does this in Chrome on some Macs); the app times every clip, skips a voice that is silent, and falls back to the next one, which may be Chrome's online Google voice. Settings → Audio shows which voice is in use and lets you choose another. For a good offline Mandarin voice on a Mac, download one under System Settings → Accessibility → Spoken Content → System Voice → Manage Voices.

### As a desktop app (Mac)

```sh
npm run app          # build it and open it in its own window
npm run app:build    # package it as release/mac-arm64/Canto.app
```

After `npm run app:build`, drag `Canto.app` into Applications and launch it like any other app; it needs no terminal or server. The app is signed for local use only, so it is meant for the Mac it was built on.

In the desktop app, audio goes through macOS's own speech voices (Tingting for Mandarin, Sinji for Cantonese) and works fully offline. Electron is pinned to version 38, the newest whose installer runs on Node 20.9.

The desktop app keeps its own progress, separate from the browser. To move between them, use Settings → Download backup in one and Restore from backup in the other.

### Where your data lives

Your progress and journal are saved in the browser you study in, or in the desktop app's own storage. They are never written into this repository or sent anywhere. Use Settings → Download backup to move them to another browser or device.

## What is in it

| Tab | What it does |
| --- | --- |
| Today | A short spaced-repetition session sized for a break, plus a progress bar for each track. |
| Library | Every word and sentence with both languages, both scripts, and audio. Study any single unit from here. |
| Sounds | How Cantonese sounds turn into Mandarin sounds, measured over 3,743 common characters, and a guess-the-tone game. |
| Writing | Stroke-by-stroke handwriting practice for every character in the decks. |
| Roots | Questions to ask your parents and grandparents in Cantonese, with a private journal for their answers. |

Each word has two cards. "Say it" shows the Cantonese and asks for the Mandarin aloud. "Read it" shows only the characters. Grade yourself Again, Hard, Good, or Easy; marking a new card Easy skips ahead, so words you already know drop out quickly.

### Tracks

- **Swap words**: everyday words where Mandarin uses a different word (佢 → 他, 係 → 是, 睇 → 看).
- **Free words**: words that are the same in both languages, where only the sound shifts.
- **Where copy-paste breaks**: the few grammar patterns that differ (我高過你 → 我比你高).
- **China travel**: introducing yourself, getting around, eating, shopping.
- **Biotech**: protein design and drug discovery vocabulary, and meeting sentences.
- **Roots**: Cantonese family words, thanks and affection, and sayings. This track teaches Cantonese, with Mandarin alongside.

## Adding or fixing content

Decks are plain text in `content/`, one line per item, written in Traditional characters:

```
Mandarin | Cantonese (blank if it is the same word) | English | note | overrides
```

`npm run data` generates the Simplified forms, pinyin, and jyutping. It runs automatically before `npm run dev` and `npm run build`. Generated readings are occasionally wrong for characters with several pronunciations; fix one with an override such as `jp: 平=peng4` or `py: 長=cháng`, or add the word to the correction tables at the top of `scripts/build-data.mjs`. Run `node scripts/build-data.mjs --review` to print every reading for proofreading.

## Planned

- An AI conversation partner for role-play (a local in Chengdu, a biotech meeting, a call home).
- Cantonese songs: connect a Spotify playlist, study the lyrics, get recommendations.
- Handwriting on paper, checked through a camera.

## Credits

Readings are generated with [pinyin-pro](https://github.com/zh-lx/pinyin-pro) and [to-jyutping](https://github.com/CanCLID/ToJyutping), script conversion with [opencc-js](https://github.com/nk2028/opencc-js), and stroke data and handwriting practice with [Hanzi Writer](https://hanziwriter.org). The idea of teaching Mandarin through Cantonese is inspired by the Canto to Mando Blueprint course; the content and sound-shift statistics here are original.
