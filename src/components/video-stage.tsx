"use client";

import { useEffect, useRef } from "react";
import type { VideoSourceInfo } from "@/lib/videos";

export type StageApi = {
  getTime: () => number;
  seek: (t: number) => void;
  play: () => void;
  pause: () => void;
  duration: () => number;
  paused: () => boolean;
  setRate: (r: number) => void;
  setMuted: (m: boolean) => void;
};

/* ---------- API YouTube (chargée une seule fois) ---------- */
type YTPlayer = {
  destroy: () => void;
  getCurrentTime: () => number;
  seekTo: (t: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  getDuration: () => number;
  getPlayerState: () => number;
  setPlaybackRate: (r: number) => void;
  mute: () => void;
  unMute: () => void;
};
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      width: string;
      height: string;
      playerVars: Record<string, string | number>;
      events: { onStateChange: (e: { data: number }) => void; onReady?: () => void };
    },
  ) => YTPlayer;
  PlayerState: { ENDED: number };
};
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytPromise: Promise<YTNamespace> | null = null;
function loadYouTube(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!ytPromise) {
    ytPromise = new Promise((resolve) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve(window.YT as YTNamespace);
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    });
  }
  return ytPromise;
}

function YouTubeStage({
  ytId,
  start,
  end,
  autoplay,
  onEnded,
  apiRef,
}: {
  ytId: string;
  start: number;
  end: number | null;
  autoplay: boolean;
  onEnded?: () => void;
  apiRef?: React.MutableRefObject<StageApi | null>;
}) {
  const box = useRef<HTMLDivElement>(null);
  const endedRef = useRef(onEnded);

  useEffect(() => {
    endedRef.current = onEnded;
  });

  useEffect(() => {
    let player: YTPlayer | null = null;
    let dead = false;
    const container = box.current;
    loadYouTube().then((YT) => {
      if (dead || !container) return;
      const el = document.createElement("div");
      container.appendChild(el);
      player = new YT.Player(el, {
        videoId: ytId,
        width: "100%",
        height: "100%",
        playerVars: {
          rel: 0,
          playsinline: 1,
          autoplay: autoplay ? 1 : 0,
          start,
          ...(end !== null ? { end } : {}),
        },
        events: {
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.ENDED) endedRef.current?.();
          },
        },
      });
      if (apiRef)
        apiRef.current = {
          getTime: () => player?.getCurrentTime() ?? 0,
          seek: (t) => player?.seekTo(t, true),
          play: () => player?.playVideo(),
          pause: () => player?.pauseVideo(),
          duration: () => player?.getDuration?.() ?? 0,
          paused: () => player?.getPlayerState?.() !== 1,
          setRate: (r) => player?.setPlaybackRate?.(r),
          setMuted: (m) => (m ? player?.mute?.() : player?.unMute?.()),
        };
    });
    return () => {
      dead = true;
      player?.destroy();
      if (container) container.innerHTML = "";
      if (apiRef) apiRef.current = null;
    };
  }, [ytId, start, end, autoplay, apiRef]);

  return <div ref={box} className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full" />;
}

function FileStage({
  url,
  start,
  end,
  autoplay,
  onEnded,
  apiRef,
  controls = true,
}: {
  controls?: boolean;
  url: string;
  start: number;
  end: number | null;
  autoplay: boolean;
  onEnded?: () => void;
  apiRef?: React.MutableRefObject<StageApi | null>;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const done = useRef(false);

  useEffect(() => {
    const v = ref.current;
    if (!v || !apiRef) return;
    apiRef.current = {
      getTime: () => v.currentTime,
      seek: (t) => {
        v.currentTime = t;
      },
      play: () => void v.play(),
      pause: () => v.pause(),
      duration: () => (Number.isFinite(v.duration) ? v.duration : 0),
      paused: () => v.paused,
      setRate: (r) => {
        v.playbackRate = r;
      },
      setMuted: (m) => {
        v.muted = m;
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef]);

  const frag = `#t=${start}${end !== null ? `,${end}` : ""}`;
  return (
    <video
      ref={ref}
      className="absolute inset-0 h-full w-full bg-black"
      src={url.split("#")[0] + frag}
      controls={controls}
      preload="auto"
      playsInline
      autoPlay={autoplay}
      onTimeUpdate={(e) => {
        const v = e.currentTarget;
        if (end !== null && v.currentTime >= end && !done.current) {
          done.current = true;
          v.pause();
          onEnded?.();
        }
      }}
      onEnded={() => {
        if (!done.current) {
          done.current = true;
          onEnded?.();
        }
      }}
    />
  );
}

/** Lecteur 16:9 : YouTube (API) ou vidéo directe, avec début/fin optionnels. */
export function VideoStage({
  source,
  start = 0,
  end = null,
  autoplay = false,
  onEnded,
  apiRef,
  controls = true,
}: {
  controls?: boolean;
  source: VideoSourceInfo;
  start?: number;
  end?: number | null;
  autoplay?: boolean;
  onEnded?: () => void;
  apiRef?: React.MutableRefObject<StageApi | null>;
}) {
  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ aspectRatio: "16 / 9" }}>
      {source.kind === "youtube" && source.ytId ? (
        <YouTubeStage ytId={source.ytId} start={start} end={end} autoplay={autoplay} onEnded={onEnded} apiRef={apiRef} />
      ) : source.kind === "file" && source.url ? (
        <FileStage url={source.url} start={start} end={end} autoplay={autoplay} onEnded={onEnded} apiRef={apiRef} controls={controls} />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-white/80">
          <p>Cette vidéo ne peut pas être lue ici.</p>
          {source.url && (
            <a className="underline" href={source.url} target="_blank" rel="noreferrer">
              Ouvrir le lien
            </a>
          )}
        </div>
      )}
    </div>
  );
}
