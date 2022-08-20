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
  position: Position;
  capacity: number;
  population: number;
  waste: number;
  growingPop: number;
  growingWaste: number;
}

export interface Ship {
  id: string;
  type: ShipType;
  position: Position;

  direction: number; // in radians
  currentSpeed: number;
  waste: number;
  assignedRoute?: number | null;
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
  planet: number;
  action: Action;
}
