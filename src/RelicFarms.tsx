import { findActiveFissureForMission, type FissureMission } from "./domain/fissures";
import type { WishlistRelicFarm } from "./domain/dropTables";
import { rotationSortValue } from "./utils";

interface MissionRelicFarmGroup {
  missionSourceId: string;
  missionName: string;
  rotationGroups: RotationRelicFarmGroup[];
}

interface RotationRelicFarmGroup {
  rotation: string;
  farms: WishlistRelicFarm[];
}

export function RelicFarmsView({
  activeFissures = [],
  relicFarms,
  wishlist
}: {
  activeFissures?: FissureMission[];
  relicFarms: WishlistRelicFarm[];
  wishlist: string[];
}) {
  if (wishlist.length === 0) {
    return (
      <section className="empty-state">
        <h2>Add prime parts to your wishlist to see relic farm missions.</h2>
      </section>
    );
  }

  if (relicFarms.length === 0) {
    return (
      <section className="empty-state">
        <h2>No mission relic farms found for your wishlist.</h2>
      </section>
    );
  }

  const missionGroups = groupRelicFarmsByMission(relicFarms);

  return (
    <section className="results-stack" aria-label="Relic farm missions">
      {missionGroups.map((missionGroup) => (
        <RelicFarmMissionCard
          activeFissure={findActiveFissureForMission(missionGroup.missionName, activeFissures)}
          key={missionGroup.missionSourceId}
          missionGroup={missionGroup}
        />
      ))}
    </section>
  );
}

function RelicFarmMissionCard({
  activeFissure,
  missionGroup
}: {
  activeFissure?: FissureMission;
  missionGroup: MissionRelicFarmGroup;
}) {
  return (
    <article className={activeFissure ? "mission-card active-fissure-card" : "mission-card"}>
      <div className="mission-card-header">
        <p className="category">{activeFissure ? "Active fissure" : "Mission relic farm"}</p>
        <h2>{missionGroup.missionName}</h2>
        {activeFissure ? (
          <div className="fissure-badges" aria-label={`Active fissure for ${missionGroup.missionName}`}>
            <span>Active {activeFissure.tier} Fissure</span>
            {activeFissure.isHard ? <span>Steel Path</span> : null}
            {activeFissure.isStorm ? <span>Void Storm</span> : null}
            <span>Expires {formatFissureExpiry(activeFissure.expiry)}</span>
          </div>
        ) : null}
      </div>
      <div className="rotation-stack">
        {missionGroup.rotationGroups.map((group) => (
          <section
            className="rotation-section"
            key={group.rotation}
            aria-label={`${formatRotationLabel(group.rotation)} relic farms`}
          >
            <h3>{formatRotationLabel(group.rotation)}</h3>
            <div className="table-scroll">
              <table className="drop-table relic-farm-table">
                <thead>
                  <tr>
                    <th scope="col">Relic</th>
                    <th scope="col">Relic Rarity</th>
                    <th scope="col">Mission Chance</th>
                    <th scope="col">Wishlist Part</th>
                    <th scope="col">Part Rarity</th>
                    <th scope="col">Relic Chance</th>
                  </tr>
                </thead>
                <tbody>
                  {group.farms.flatMap((farm, farmIndex) =>
                    farm.wishedParts.map((part, partIndex) => (
                      <tr
                        key={`${farmIndex}-${partIndex}-${farm.relicName}-${part.itemName}-${part.rarity}-${part.chance}`}
                      >
                        <td>{farm.relicName}</td>
                        <td>{farm.relicDropRarity}</td>
                        <td>{farm.relicDropChance.toFixed(2)}%</td>
                        <td>{part.itemName}</td>
                        <td>{part.rarity}</td>
                        <td>{part.chance.toFixed(2)}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}

function groupRelicFarmsByMission(relicFarms: WishlistRelicFarm[]): MissionRelicFarmGroup[] {
  const missions = new Map<
    string,
    {
      missionSourceId: string;
      missionName: string;
      farms: WishlistRelicFarm[];
    }
  >();

  for (const farm of relicFarms) {
    const mission = missions.get(farm.missionSourceId);
    if (mission) {
      mission.farms.push(farm);
    } else {
      missions.set(farm.missionSourceId, {
        missionSourceId: farm.missionSourceId,
        missionName: farm.missionName,
        farms: [farm]
      });
    }
  }

  return [...missions.values()]
    .map((mission) => ({
      missionSourceId: mission.missionSourceId,
      missionName: mission.missionName,
      rotationGroups: groupRelicFarmsByRotation(mission.farms)
    }))
    .sort(
      (left, right) =>
        totalMissionChance(right) - totalMissionChance(left) || left.missionName.localeCompare(right.missionName)
    );
}

function groupRelicFarmsByRotation(relicFarms: WishlistRelicFarm[]): RotationRelicFarmGroup[] {
  const groups = new Map<string, WishlistRelicFarm[]>();

  for (const farm of relicFarms) {
    const rotation = farm.rotation ?? "Base";
    groups.set(rotation, [...(groups.get(rotation) ?? []), farm]);
  }

  return [...groups.entries()]
    .sort(([leftRotation], [rightRotation]) => rotationSortValue(leftRotation) - rotationSortValue(rightRotation))
    .map(([rotation, farms]) => ({
      rotation,
      farms
    }));
}

function formatRotationLabel(rotation: string): string {
  return rotation === "Base" ? "Base Drops" : `Rotation ${rotation}`;
}

function totalMissionChance(group: MissionRelicFarmGroup): number {
  return group.rotationGroups.reduce(
    (groupTotal, rotationGroup) =>
      groupTotal + rotationGroup.farms.reduce((rotationTotal, farm) => rotationTotal + farm.relicDropChance, 0),
    0
  );
}

function formatFissureExpiry(expiry: string): string {
  const expiryDate = new Date(expiry);
  if (Number.isNaN(expiryDate.getTime())) {
    return "soon";
  }

  return expiryDate.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}
