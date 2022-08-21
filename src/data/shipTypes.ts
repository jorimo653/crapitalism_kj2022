import { ShipType } from "../types";

type ShipTypeKey = "shuttle" | "freighter";
const shipTypes: Record<ShipTypeKey, ShipType> = {
  shuttle: {
    name: "Shuttle",
    capacity: 10,
    maxSpeed: 8,
    acceleration: 5,
    upkeepCost: 2,
    buildCost: 10,
  },
  freighter: {
    name: "Freighter",
    capacity: 100,
    maxSpeed: 25,
    acceleration: 2,
    upkeepCost: 5,
    buildCost: 50,
  },
};
export default shipTypes;
