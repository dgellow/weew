// weew music - a terminal music player demo
//
// Exercises: Box, Text, Row, Column, Flex, Table (with separators),
// Progress, Spinner, Badge, Divider, ScrollBox (with clipping),
// FocusContainer (with itemHeight), wide-char text, animation

import {
  Badge,
  Box,
  colors,
  Column,
  Divider,
  FocusContainer,
  isKey,
  Keys,
  Progress,
  Row,
  run,
  ScrollBox,
  Spinner,
  Table,
  Text,
} from "../mod.ts";

// ── Data ──────────────────────────────────────────────

interface Track {
  title: string;
  duration: number;
}

interface Album {
  title: string;
  artist: string;
  genre: string;
  tracks: Track[];
}

const ALBUMS: Album[] = [
  {
    title: "Midnight City",
    artist: "Neon Waves",
    genre: "Synthwave",
    tracks: [
      { title: "Midnight Drive", duration: 272 },
      { title: "Neon Lights", duration: 198 },
      { title: "Digital Rain", duration: 301 },
      { title: "Chrome Hearts", duration: 245 },
      { title: "Electric Dreams", duration: 267 },
      { title: "Sunset Boulevard", duration: 312 },
      { title: "Starfall", duration: 198 },
      { title: "Night Run", duration: 223 },
    ],
  },
  {
    title: "東京の夜",
    artist: "宇多田ヒカル",
    genre: "J-Pop",
    tracks: [
      { title: "Tokyo Nights", duration: 234 },
      { title: "Sakura Dreams", duration: 267 },
      { title: "雨の日", duration: 289 },
      { title: "Neon Tokyo", duration: 245 },
      { title: "夜の街", duration: 312 },
      { title: "星空の下", duration: 198 },
    ],
  },
  {
    title: "Lo-fi Beats",
    artist: "Chill Hop",
    genre: "Lo-fi",
    tracks: [
      { title: "Rainy Window", duration: 187 },
      { title: "Coffee Shop", duration: 223 },
      { title: "Study Session", duration: 256 },
      { title: "Late Night Jazz", duration: 312 },
      { title: "Warm Blanket", duration: 198 },
    ],
  },
  {
    title: "Cosmic Drift",
    artist: "Stellar",
    genre: "Ambient",
    tracks: [
      { title: "Event Horizon", duration: 423 },
      { title: "Nebula", duration: 367 },
      { title: "Solar Wind", duration: 298 },
      { title: "Deep Space", duration: 445 },
      { title: "Gravity Well", duration: 312 },
      { title: "Supernova", duration: 256 },
      { title: "Dark Matter", duration: 389 },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const BARS = [" ", "▁", "▂", "▃", "▄", "▅", "▆", "▇"];

function specStr(heights: number[]): string {
  return heights.map((h) => BARS[Math.min(Math.max(h, 0), 7)]).join("");
}

function updateSpec(prev: number[], playing: boolean): number[] {
  if (!playing) return prev.map((h) => Math.max(0, h - 1));
  const next = prev.slice(1);
  const last = prev[prev.length - 1] ?? 4;
  const d = Math.floor(Math.random() * 5) - 2;
  next.push(Math.max(1, Math.min(7, last + d)));
  return next;
}

// ── State ─────────────────────────────────────────────

interface State {
  panel: "library" | "tracks";
  albumIndex: number;
  trackIndex: number;
  trackScroll: number;
  playing: boolean;
  currentAlbum: number;
  currentTrack: number;
  elapsed: number;
  frame: number;
  spec: number[];
  loading: number;
}

const SPEC_WIDTH = 20;

await run<State>({
  initialState: {
    panel: "library",
    albumIndex: 0,
    trackIndex: 0,
    trackScroll: 0,
    playing: false,
    currentAlbum: 0,
    currentTrack: 0,
    elapsed: 0,
    frame: 0,
    spec: Array.from({ length: SPEC_WIDTH }, () => 0),
    loading: 0,
  },

  render: (state) => {
    const album = ALBUMS[state.currentAlbum];
    const track = album.tracks[state.currentTrack];
    const viewAlbum = ALBUMS[state.albumIndex];
    const viewTracks = viewAlbum.tracks;

    // ── Title bar ──

    const titleBar = Row([
      {
        component: Text({
          content: "  weew music",
          style: { fg: colors.fg.cyan, bold: true },
        }),
        flex: 1,
      },
      {
        component: state.playing
          ? Badge({
            text: " PLAYING",
            style: { fg: colors.fg.black, bg: colors.bg.green },
          })
          : Badge({
            text: " PAUSED",
            style: { fg: colors.fg.white, bg: colors.bg.gray },
          }),
        width: state.playing ? 12 : 11,
      },
    ]);

    // ── Sidebar ──

    const sidebarItems = ALBUMS.map((a, i) => ({
      id: String(i),
      component: Column([
        {
          component: Text({
            content: a.title,
            style: {
              fg: i === state.currentAlbum ? colors.fg.green : colors.fg.white,
              bold: i === state.currentAlbum,
            },
          }),
          height: 1,
        },
        {
          component: Text({
            content: a.artist,
            style: { fg: colors.fg.gray, dim: true },
          }),
          height: 1,
        },
      ]),
    }));

    const sidebar = Box({
      border: "single",
      borderColor: state.panel === "library" ? colors.fg.cyan : colors.fg.gray,
      title: " Library ",
      padding: { left: 1, right: 1, top: 0, bottom: 0 },
      child: FocusContainer({
        items: sidebarItems,
        focusedId: String(state.albumIndex),
        focusedStyle: {
          fg: state.panel === "library" ? colors.fg.cyan : colors.fg.gray,
        },
        itemHeight: 2,
        gap: 1,
      }),
    });

    // ── Now Playing ──

    const nowPlaying = Box({
      border: "single",
      borderColor: colors.fg.green,
      title: " Now Playing ",
      padding: { left: 1, right: 1, top: 0, bottom: 0 },
      child: Column([
        {
          component: Text({
            content: `  ${track.title}`,
            style: { fg: colors.fg.white, bold: true },
          }),
          height: 1,
        },
        {
          component: Text({
            content: `${album.artist}  ${album.title}`,
            style: { fg: colors.fg.gray },
          }),
          height: 1,
        },
        {
          component: Row([
            {
              component: Progress({
                value: (state.elapsed / track.duration) * 100,
                filledColor: colors.fg.green,
                emptyColor: colors.fg.gray,
              }),
              flex: 1,
            },
            {
              component: Text({
                content: ` ${fmt(state.elapsed)} / ${fmt(track.duration)}`,
                style: { fg: colors.fg.gray },
              }),
              width: 13,
            },
          ]),
          height: 1,
        },
        {
          component: Text({
            content: specStr(state.spec),
            style: { fg: colors.fg.cyan },
          }),
          height: 1,
        },
        {
          component: Badge({
            text: album.genre,
            style: { fg: colors.fg.black, bg: colors.bg.cyan },
          }),
          height: 1,
        },
      ]),
    });

    // ── Track list ──

    const trackRows = viewTracks.map((t, i) => {
      const isPlaying = state.currentAlbum === state.albumIndex &&
        state.currentTrack === i;
      const isSelected = state.panel === "tracks" && state.trackIndex === i;
      const marker = isPlaying ? "  " : isSelected ? "  " : String(i + 1);
      return [marker, t.title, viewAlbum.artist, fmt(t.duration)];
    });

    const trackContent = state.loading > 0
      ? Row([{
        component: Spinner({
          frame: state.frame,
          label: "Loading album...",
          color: colors.fg.cyan,
        }),
        flex: 1,
      }])
      : Table({
        headers: ["#", "Title", "Artist", "Time"],
        rows: trackRows,
        border: true,
        headerStyle: { fg: colors.fg.gray, bold: true },
      });

    const trackList = ScrollBox({
      scrollY: state.trackScroll,
      contentHeight: state.loading > 0 ? 1 : viewTracks.length + 2,
      border: "single",
      borderColor: state.panel === "tracks" ? colors.fg.cyan : colors.fg.gray,
      title: ` ${viewAlbum.title} `,
      showScrollbar: true,
      child: trackContent,
    });

    // ── Help bar ──

    const help = Text({
      content:
        "  navigate     panel  Space play/pause  n/p track  Enter select  q quit",
      style: { fg: colors.fg.gray },
    });

    // ── Compose ──

    return Box({
      border: "rounded",
      borderColor: colors.fg.cyan,
      padding: { left: 1, right: 1, top: 0, bottom: 0 },
      child: Column([
        { component: titleBar, height: 1 },
        {
          component: Divider({ style: { fg: colors.fg.gray } }),
          height: 1,
        },
        {
          component: Row([
            { component: sidebar, width: 24 },
            {
              component: Column([
                { component: nowPlaying, height: 7 },
                { component: trackList, flex: 1 },
              ]),
              flex: 1,
            },
          ]),
          flex: 1,
        },
        {
          component: Divider({ style: { fg: colors.fg.gray } }),
          height: 1,
        },
        { component: help, height: 1 },
      ]),
    });
  },

  onKey: (event, state, ctx) => {
    if (isKey(event, "q") || isKey(event, "c", { ctrl: true })) {
      ctx.exit();
      return;
    }

    // Panel switching
    if (event.key === Keys.Left || event.key === Keys.Right) {
      return {
        ...state,
        panel: state.panel === "library" ? "tracks" : "library",
      };
    }

    // Navigate
    if (event.key === Keys.Up) {
      if (state.panel === "library") {
        return {
          ...state,
          albumIndex: Math.max(0, state.albumIndex - 1),
        };
      }
      const idx = Math.max(0, state.trackIndex - 1);
      return {
        ...state,
        trackIndex: idx,
        trackScroll: Math.min(state.trackScroll, idx),
      };
    }

    if (event.key === Keys.Down) {
      if (state.panel === "library") {
        return {
          ...state,
          albumIndex: Math.min(ALBUMS.length - 1, state.albumIndex + 1),
        };
      }
      const len = ALBUMS[state.albumIndex].tracks.length;
      const idx = Math.min(len - 1, state.trackIndex + 1);
      return {
        ...state,
        trackIndex: idx,
        trackScroll: Math.max(state.trackScroll, idx - 4),
      };
    }

    // Select (Enter = Ctrl+M in raw mode)
    if (isKey(event, "m", { ctrl: true })) {
      if (state.panel === "library") {
        return {
          ...state,
          currentAlbum: state.albumIndex,
          currentTrack: 0,
          trackIndex: 0,
          trackScroll: 0,
          elapsed: 0,
          playing: true,
          loading: 6,
        };
      }
      return {
        ...state,
        currentAlbum: state.albumIndex,
        currentTrack: state.trackIndex,
        elapsed: 0,
        playing: true,
      };
    }

    // Play / pause
    if (event.key === " ") {
      return { ...state, playing: !state.playing };
    }

    // Next / prev track
    if (isKey(event, "n")) {
      const len = ALBUMS[state.currentAlbum].tracks.length;
      return {
        ...state,
        currentTrack: (state.currentTrack + 1) % len,
        elapsed: 0,
      };
    }
    if (isKey(event, "p")) {
      const len = ALBUMS[state.currentAlbum].tracks.length;
      return {
        ...state,
        currentTrack: (state.currentTrack - 1 + len) % len,
        elapsed: 0,
      };
    }

    return undefined;
  },

  onTick: (state, delta) => {
    const album = ALBUMS[state.currentAlbum];
    const track = album.tracks[state.currentTrack];
    let elapsed = state.elapsed;
    let currentTrack = state.currentTrack;

    if (state.playing && state.loading === 0) {
      elapsed += delta / 1000;
      if (elapsed >= track.duration) {
        currentTrack = (currentTrack + 1) % album.tracks.length;
        elapsed = 0;
      }
    }

    return {
      ...state,
      frame: state.frame + 1,
      elapsed,
      currentTrack,
      spec: updateSpec(state.spec, state.playing && state.loading === 0),
      loading: Math.max(0, state.loading - 1),
    };
  },

  tickInterval: 80,
});
