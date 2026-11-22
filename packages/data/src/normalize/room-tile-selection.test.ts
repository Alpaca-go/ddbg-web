import { expect, it } from "vitest";
import rooms from "../../normalized/corebox/room.json";
import catalog from "../../normalized/corebox/room_tile_geometry.json";
import { selectRoomTile } from "./room-tile-selection";

const card = (id: string) => rooms.cards.find((c) => c.id === id)!;

it("Ritual与完成禁疗运行时的Torture均可参战（R-067）", () => {
  const before = structuredClone(catalog);
  const result = selectRoomTile(card("room:ruins:01"), catalog);
  expect(result.status).toBe("matched");
  if (result.status !== "matched") throw new Error(result.reason);
  expect(result.tile).toMatchObject({
    roomId: "room:ruins:01",
    location: "ruins",
    number: 1,
    source: { face: "front" },
  });
  expect(result.deployment.heroes.support).toBe("C");
  const blocked = selectRoomTile(card("room:ruins:02"), catalog);
  expect(blocked.status).toBe("matched");
  if (blocked.status !== "matched") throw new Error(blocked.reason);
  expect(blocked.deployment.heroes.support).toBe("H");
  expect(catalog).toEqual(before);
});

it("同编号的最暗地牢、Boss与其他待审核面不按页码或名称兜底；Fountain独立获批", () => {
  expect(selectRoomTile(card("room:ruins:03"), catalog).status).toBe("matched");
  expect(selectRoomTile(card("room:ruins:07"), catalog).status).toBe("matched");
  expect(selectRoomTile(card("room:darkest:01"), catalog).status).toBe("matched");
  expect(selectRoomTile(card("room:darkest:02"), catalog).status).toBe("matched");
  for (const id of ["room:ruins:10"])
    expect(selectRoomTile(card(id), catalog).status).toBe("refused");
  expect(selectRoomTile(card("room:darkest:03"), catalog).status).toBe("matched");
  expect(selectRoomTile(card("room:darkest:04"), catalog).status).toBe("matched");
  expect(selectRoomTile(card("room:darkest:05"), catalog).status).toBe("matched");
  expect(selectRoomTile(card("room:darkest:06"), catalog).status).toBe("matched");
  expect(
    selectRoomTile({ ...card("room:darkest:01"), name: "Ritual Chamber" }, catalog).status,
  ).toBe("refused");
  expect(
    selectRoomTile({ ...card("room:ruins:01"), name: "Torture Chamber" }, catalog).status,
  ).toBe("refused");
});

it("活动板块身份漂移原子拒绝；重复目录和篡改Torture可用标志均不能绕过", () => {
  expect(selectRoomTile(card("room:ruins:01"), catalog, "room_tile:ruins:02").status).toBe(
    "refused",
  );
  expect(
    selectRoomTile(card("room:ruins:01"), {
      ...catalog,
      tiles: [...catalog.tiles, catalog.tiles[0]],
    }).status,
  ).toBe("refused");
  expect(
    selectRoomTile(card("room:ruins:02"), {
      ...catalog,
      tiles: catalog.tiles.map((t) =>
        t.id === "room_tile:ruins:02" ? { ...t, usable: false } : t,
      ),
    }).status,
  ).toBe("refused");
  expect(
    selectRoomTile(card("room:ruins:01"), {
      ...catalog,
      tiles: catalog.tiles.map((t) =>
        t.id === "room_tile:ruins:01"
          ? { ...t, roomId: "room:darkest:01", location: "darkestDungeon" }
          : t,
      ),
    }).status,
  ).toBe("refused");
});
