"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });
const Quote = dynamic(() => import("./Quote"), { ssr: false });

const CATS_SLEEPING = ["/lottie/sleeping.json"];
const CATS_PLAYING = ["/lottie/loading.json", "/lottie/mark-loading.json"];
const CATS_HAPPY = ["/lottie/love.json", "/lottie/crying.json"];

function pickHourly(arr: string[]): string {
  const seed = new Date().getHours() * 31 + new Date().getDate();
  return arr[seed % arr.length];
}

export default function CatLottie({
  isPunchedIn,
  pct,
  isCompleted,
}: {
  isPunchedIn: boolean;
  pct: number;
  isCompleted: boolean;
}) {
  const [animData, setAnimData] = useState<object | null>(null);
  const loadedUrlRef = useRef("");

  const pool =
    isCompleted || !isPunchedIn
      ? CATS_SLEEPING
      : pct >= 50
        ? CATS_HAPPY
        : CATS_PLAYING;
  const url = pickHourly(pool);

  useEffect(() => {
    if (loadedUrlRef.current === url) return;
    loadedUrlRef.current = url;
    setAnimData(null);
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data?.layers) {
          data.layers = data.layers.filter(
            (l: { ty: number; sc?: string }) =>
              !(l.ty === 1 && l.sc?.toLowerCase() === "#ffffff"),
          );
        }
        setAnimData(data);
      })
      .catch(() => {
        loadedUrlRef.current = "";
      });
  }, [url]);

  return (
    <div className="flex flex-col items-center">
      <div className="w-36 h-36">
        {animData ? (
          <Lottie
            animationData={animData}
            loop
            autoplay
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
          </div>
        )}
      </div>
      <div className="mt-2 text-xs text-zinc-500 text-center italic px-4">
        <Quote />
      </div>
    </div>
  );
}
