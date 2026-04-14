"use client";

import { useState, useEffect } from "react";
import { SGT_TIMEZONE } from "@/lib/constants";

export function LiveClock() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    function tick() {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-SG", {
          timeZone: SGT_TIMEZONE,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
      setDate(
        now.toLocaleDateString("en-SG", {
          timeZone: SGT_TIMEZONE,
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center">
      <p className="text-4xl font-bold tabular-nums tracking-tight">{time || "--:--:--"}</p>
      <p className="text-sm text-muted-foreground mt-1">{date || "Loading..."}</p>
      <p className="text-xs text-muted-foreground">Singapore Time (SGT)</p>
    </div>
  );
}
