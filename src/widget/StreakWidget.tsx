import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import { computeStreak, doneToday, type Habit } from "@/lib/habits";

const BG = "#000000";
const INK = "#FAFAFA";
const MUTED = "#9A9AA1";
const DIM = "#5E5E66";
const LINE = "#26262B";

/**
 * Home-screen widget. Pure black like the app: a header with today's progress, then a row per
 * habit — tap the circle to check in (build habits), tap anywhere else to open Streaky.
 */
export function StreakWidget({ habits, height }: { habits: Habit[]; width: number; height: number }) {
  const today = new Date();
  const rowH = 44;
  const room = Math.max(1, Math.floor((height - 64) / rowH));
  const rows = habits.slice(0, Math.min(room, 4));
  const doneCount = habits.filter((h) => doneToday(h, today)).length;
  const best = habits.reduce((m, h) => Math.max(m, computeStreak(h, today)), 0);

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: BG,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: LINE,
        padding: 14,
        flexDirection: "column",
        justifyContent: "flex-start",
      }}
    >
      <FlexWidget
        style={{ width: "match_parent", flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}
      >
        <TextWidget text="Streaky" style={{ color: INK, fontSize: 17, fontFamily: "Geist_700Bold" }} />
        <TextWidget
          text={habits.length ? `${doneCount}/${habits.length} today  ·  🔥 ${best}` : "No habits yet"}
          style={{ color: MUTED, fontSize: 12.5 }}
        />
      </FlexWidget>

      {rows.length === 0 ? (
        <TextWidget text="Open Streaky to add your first habit" style={{ color: DIM, fontSize: 13, marginTop: 12 }} />
      ) : (
        rows.map((h) => {
          const streak = computeStreak(h, today);
          const done = doneToday(h, today);
          const build = h.type === "build";
          return (
            <FlexWidget
              key={h.id}
              style={{ width: "match_parent", height: rowH, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
            >
              <FlexWidget style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <FlexWidget
                  clickAction={build ? "TOGGLE" : "OPEN_APP"}
                  clickActionData={{ id: h.id }}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: done ? INK : BG,
                    borderWidth: done ? 0 : 2,
                    borderColor: DIM,
                    marginRight: 12,
                  }}
                >
                  <TextWidget
                    text={done ? (build ? "✓" : "🔥") : " "}
                    style={{ color: "#000000", fontSize: build ? 16 : 14, fontFamily: "Geist_700Bold" }}
                  />
                </FlexWidget>
                <FlexWidget style={{ flex: 1 }}>
                  <TextWidget text={h.title} maxLines={1} truncate="END" style={{ color: INK, fontSize: 15, fontFamily: "Geist_600SemiBold" }} />
                  <TextWidget
                    text={build ? (done ? "Done today" : "Tap the circle to check in") : "Staying clean"}
                    maxLines={1}
                    truncate="END"
                    style={{ color: MUTED, fontSize: 11.5 }}
                  />
                </FlexWidget>
              </FlexWidget>
              <TextWidget text={`🔥 ${streak}`} style={{ color: INK, fontSize: 17, fontFamily: "Geist_700Bold", marginLeft: 8 }} />
            </FlexWidget>
          );
        })
      )}
    </FlexWidget>
  );
}
