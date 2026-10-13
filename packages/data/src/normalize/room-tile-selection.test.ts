import { expect, it } from "vitest";
import rooms from "../../normalized/corebox/room.json";
import catalog from "../../normalized/corebox/room_tile_geometry.json";
import { selectRoomTile } from "./room-tile-selection";

const card = (id: string) => rooms.cards.find((c) => c.id === id)!;

it("Ritual与完成禁疗运行时的Torture均可参战（R-067）", () => {
  const before = structuredClone(catalog);
  const result = selectRoomTile(card("room:p001"), catalog);
  expect(result.status).toBe("matched");
  if (result.status !== "matched") throw new Error(result.reason);
  expect(result.tile).toMatchObject({
    roomId: "room:p001",
    location: "ruins",
    number: 1,
    source: { face: "front" },
  });
  expect(result.deployment.heroes.support).toBe("C");
  const blocked = selectRoomTile(card("room:p002"), catalog);
  expect(blocked.status).toBe("matched");
  if (blocked.status !== "matched") throw new Error(blocked.reason);
  expect(blocked.deployment.heroes.support).toBe("H");
  expect(catalog).toEqual(before);
});

it("同编号的最暗地牢、Boss与其他待审核面不按页码或名称兜底；Fountain独立获批", () => {
  expect(selectRoomTile(card("room:p003"), catalog).status).toBe("matched");
  expect(selectRoomTile(card("room:p007"), catalog).status).toBe("matched");
  for (const id of ["room:p004", "room:p010", "room:p014"])
    expect(selectRoomTile(card(id), catalog).status).toBe("refused");
  expect(selectRoomTile({ ...card("room:p014"), name: "Ritual Chamber" }, catalog).status).toBe(
    "refused",
  );
  expect(selectRoomTile({ ...card("room:p001"), name: "Torture Chamber" }, catalog).status).toBe(
    "refused",
  );
});

it("活动板块身份漂移原子拒绝；重复目录和篡改Torture可用标志均不能绕过", () => {
  expect(selectRoomTile(card("room:p001"), catalog, "room_tile:p002:back").status).toBe("refused");
  expect(
    selectRoomTile(card("room:p001"), { ...catalog, tiles: [...catalog.tiles, catalog.tiles[0]] })
      .status,
  ).toBe("refused");
  expect(
    selectRoomTile(card("room:p002"), {
      ...catalog,
      tiles: catalog.tiles.map((t) =>
        t.id === "room_tile:p002:back" ? { ...t, usable: false } : t,
      ),
    }).status,
  ).toBe("refused");
  expect(
    selectRoomTile(card("room:p001"), {
      ...catalog,
      tiles: catalog.tiles.map((t) =>
        t.id === "room_tile:p001" ? { ...t, roomId: "room:p014", location: "darkestDungeon" } : t,
      ),
    }).status,
  ).toBe("refused");
});
