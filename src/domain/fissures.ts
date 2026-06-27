export interface FissureMission {
  id: string;
  node: string;
  missionType: string;
  tier: string;
  expiry: string;
  isStorm: boolean;
  isHard: boolean;
}

interface ParsedMission {
  planet: string;
  node: string;
}

export function parseFissureMissions(responseBody: unknown): FissureMission[] {
  if (!Array.isArray(responseBody)) {
    return [];
  }

  return responseBody.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }

    const { id, node, missionType, tier, expiry } = entry;
    if (
      typeof id !== "string" ||
      typeof node !== "string" ||
      typeof missionType !== "string" ||
      typeof tier !== "string" ||
      typeof expiry !== "string"
    ) {
      return [];
    }

    return [
      {
        id,
        node,
        missionType,
        tier,
        expiry,
        isStorm: entry.isStorm === true,
        isHard: entry.isHard === true
      }
    ];
  });
}

export function findActiveFissureForMission(
  missionName: string,
  fissures: FissureMission[],
  now = new Date()
): FissureMission | undefined {
  const mission = parseDropTableMissionName(missionName);
  if (!mission) {
    return undefined;
  }

  const missionKey = toMissionKey(mission);
  return fissures.find((fissure) => {
    const fissureMission = parseFissureMission(fissure);
    return fissureMission && toMissionKey(fissureMission) === missionKey && isFissureActive(fissure, now);
  });
}

function parseDropTableMissionName(missionName: string): ParsedMission | undefined {
  const match = missionName.match(/^([^/]+)\/(.+)\s+\([^()]+\)$/);
  if (!match) {
    return undefined;
  }

  return {
    planet: match[1],
    node: match[2]
  };
}

function parseFissureMission(fissure: FissureMission): ParsedMission | undefined {
  const match = fissure.node.match(/^(.+)\s+\(([^()]+)\)$/);
  if (!match) {
    return undefined;
  }

  return {
    planet: match[2],
    node: match[1]
  };
}

function isFissureActive(fissure: FissureMission, now: Date): boolean {
  return Date.parse(fissure.expiry) > now.getTime();
}

function toMissionKey(mission: ParsedMission): string {
  return [mission.planet, mission.node].map(normalizeMissionValue).join("|");
}

function normalizeMissionValue(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
