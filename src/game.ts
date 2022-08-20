import { nanoid } from "nanoid";
import "phaser";
import planets from "./assets/images/kenney_planets/Planets/*.png";
import ships from "./assets/images/kenney_spaceshooterextension/PNG/Sprites/Ships/*.png";
import { convertRadiansToDegrees, updatePlanet, updateShip } from "./lib";
import { Position, State } from "./types";
import GameConfig = Phaser.Types.Core.GameConfig;

export default class Game extends Phaser.Scene {
  private width: number;
  private height: number;
  private screenCenter: Position;
  private state: State;
  private sprites: Record<
    string,
    Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  >;
  private shipScaleFactor: number;

  constructor() {
    super("game");
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.screenCenter = { x: window.innerWidth, y: window.innerHeight };

    this.shipScaleFactor = 0.25;

    this.state = {
      money: 0,
      planets: {},
      ships: {},
      routes: {},
    };
    this.sprites = {};
  }

  init() {}

  preload() {
    // load assets here
    this.load.image("homeworld", planets.planet00);
    this.load.image("moon", planets.planet05);
    this.load.image("ship", ships.spaceShips_005);
  }

  create() {
    //  add to top-level game object
    const { x, y } = this.screenCenter;

    const homeworldId = this.createPlanet({
      texture: "homeworld",
      radius: 100,
      position: { x: x / 2, y: y / 2 },
      population: 100,
      waste: 10,
    });

    const moonId = this.createPlanet({
      texture: "moon",
      radius: 25,
      position: { x: x / 2 + 200, y: y / 2 - 200 },
    });

    this.state.routes.route1 = {
      id: "route1",
      nodes: [
        { planet: homeworldId, action: "LOAD_WASTE" },
        { planet: moonId, action: "DUMP_WASTE" },
      ],
    };

    this.state.ships.shuttle1 = {
      id: "shuttle1",
      type: {
        name: "Shuttle",
        capacity: 10,
        maxSpeed: 10,
        acceleration: 2,
        upkeepCost: 2,
        buildCost: 10,
      },
      position: { x: x / 2 + 200, y: y / 2 - 200 },
      direction: 0,
      currentSpeed: 0,
      waste: 0,
      assignedRoute: "route1",
      destinationNodeIndex: 0,
    };
    this.sprites.shuttle1 = this.physics.add.sprite(this.state.ships.shuttle1.position.x, this.state.ships.shuttle1.position.y, "ship");
    this.sprites.shuttle1.setScale(this.shipScaleFactor);

    this.state.money = 100;

    const logState = () => console.log(`
    Homeworld pop: ${this.state.planets[homeworldId].population}, waste: ${this.state.planets[homeworldId].waste}
    Moon pop: ${this.state.planets[moonId].population}, waste: ${this.state.planets[moonId].waste}
    Ship waste: ${this.state.ships.shuttle1.waste}
    Money: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(this.state.money)}
    `);
    logState();
    setInterval(logState, 1000)
  }

  update(time: number, delta: number): void {
    const deltaSeconds = delta / 1000;
    Object.values(this.state.planets).forEach((planet) =>
      updatePlanet(this.state, planet, deltaSeconds),
    );
    Object.values(this.state.ships).forEach((ship) => {
      updateShip(this.state, ship, deltaSeconds);
      const sprite = this.sprites[ship.id];
      sprite.setAngle(convertRadiansToDegrees(ship.direction) + 90);
      sprite.setPosition(ship.position.x, ship.position.y);
    });
  }

  createPlanet({
    texture,
    radius,
    position,
    population = 0,
    waste = 0,
  }: {
    texture: string;
    radius: number;
    position: Position;
    population?: number;
    waste?: number;
  }) {
    const id = nanoid();
    const capacity = radius * 100;
    const scale = radius * 2 / 1000;
    this.sprites[id] = this.physics.add.sprite(position.x, position.y, texture);
    this.sprites[id].setScale(scale);
    this.state.planets[id] = {
      id,
      position,
      capacity,
      radius,
      population,
      waste,
      growingPop: 0,
      growingWaste: 0,
    };
    return id;
  }
}

const config: GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: "#125555",
  width: window.innerWidth,
  height: window.innerHeight,
  scene: Game,
  physics: {
    default: "arcade",
    arcade: {
      // gravity: 0
    },
  },
};

const game = new Phaser.Game(config);
