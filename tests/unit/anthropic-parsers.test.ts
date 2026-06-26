import { describe, expect, it } from "vitest";
import {
  parseCoachingJson,
  parseMappingJson,
  parseMonthlyJson,
  parseRetroJson,
} from "@/lib/anthropic";

describe("parseCoachingJson", () => {
  it("parses a clean object", () => {
    const r = parseCoachingJson(
      JSON.stringify({
        phase: "framing",
        tags: ["delegation"],
        coaching: "Hand it back.",
        title: "Letting go",
      }),
    );
    expect(r?.phase).toBe("framing");
  });
  it("parses JSON wrapped in a code fence and prose", () => {
    const raw = 'Sure!\n```json\n{"phase":"foundation","tags":[],"coaching":"x","title":"y"}\n```';
    expect(parseCoachingJson(raw)?.phase).toBe("foundation");
  });
  it("returns null on invalid phase or shape", () => {
    expect(
      parseCoachingJson('{"phase":"nope","tags":[],"coaching":"x","title":"y"}'),
    ).toBeNull();
    expect(parseCoachingJson("not json at all")).toBeNull();
  });
});

describe("parseRetroJson / parseMonthlyJson", () => {
  it("parse valid synthesis/summary", () => {
    expect(
      parseRetroJson('{"synthesis":"x","framework_focus":"framing"}')
        ?.framework_focus,
    ).toBe("framing");
    expect(
      parseMonthlyJson('{"summary":"x","framework_focus":"finishing"}')
        ?.framework_focus,
    ).toBe("finishing");
  });
  it("reject bad focus values", () => {
    expect(parseRetroJson('{"synthesis":"x","framework_focus":"bad"}')).toBeNull();
  });
});

describe("parseMappingJson (cannot invent principles)", () => {
  it("keeps only known principles and layers", () => {
    const raw = JSON.stringify({
      mappings: [
        { principle: "foundation", layer: "foundation", rationale: "a" },
        { principle: "integrity", layer: "frame", rationale: "b" },
        // bogus principle — must be dropped
        { principle: "leadership", layer: "frame", rationale: "c" },
        // bogus layer — must be dropped
        { principle: "patience", layer: "finishing", rationale: "d" },
      ],
    });
    const out = parseMappingJson(raw);
    expect(out).not.toBeNull();
    expect(out!.map((m) => m.principle)).toEqual(["foundation", "integrity"]);
  });

  it("dedupes repeated principles", () => {
    const raw = JSON.stringify({
      mappings: [
        { principle: "belief", layer: "foundation", rationale: "a" },
        { principle: "belief", layer: "frame", rationale: "b" },
      ],
    });
    expect(parseMappingJson(raw)!).toHaveLength(1);
  });

  it("returns null when there is no mappings array", () => {
    expect(parseMappingJson('{"foo":1}')).toBeNull();
    expect(parseMappingJson("garbage")).toBeNull();
  });
});
