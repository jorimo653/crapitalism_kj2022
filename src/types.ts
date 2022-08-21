export type EntityType = "planet" | "ship";

export interface State {
  planets: Record<string, Planet>;
  ships: Record<string, Ship>;
  routes: Record<string, Route>;
  money: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface Planet {
  id: string;
  name: string;
  position: Position;
  capacity: number;
  radius: number;
  population: number;
  waste: number;
  growingPop: number;
  growingWaste: number;
  orbitCenter: Position;
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number; // radius per second
}

export interface Ship {
  id: string;
  name: string;
  type: ShipType;
  position: Position;

  direction: number; // in radians
  currentSpeed: number;
  waste: number;
  assignedRoute?: string | null;
  destinationNodeIndex?: number | null;
}

export interface ShipType {
  name: string;
  capacity: number;
  maxSpeed: number;
  acceleration: number;
  upkeepCost: number;
  buildCost: number;
}

export interface Route {
  id: string;
  nodes: RouteNode[];
}

export type Action = "LOAD_WASTE" | "DUMP_WASTE";

export interface RouteNode {
  planet: string;
  action: Action;
}
