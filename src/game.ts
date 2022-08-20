import { nanoid } from "nanoid";
import "phaser";
import planets from "./assets/images/kenney_planets/Planets/*.png";
import ships from "./assets/images/kenney_spaceshooterextension/PNG/Sprites/Ships/*.png";
import backgrounds from "./assets/images/spaceshooter/Backgrounds/*.png";
import shipTypes from "./data/shipTypes";
import { convertRadiansToDegrees, updatePlanet, updateShip } from "./lib";
import { EntityType, Position, ShipType, State } from "./types";
import SmoothedKeyControl = Phaser.Cameras.Controls.SmoothedKeyControl;
import KeyCodes = Phaser.Input.Keyboard.KeyCodes;
import SmoothedKeyControlConfig = Phaser.Types.Cameras.Controls.SmoothedKeyControlConfig;
import GameConfig = Phaser.Types.Core.GameConfig;

export default class Game extends Phaser.Scene {
  private screenCenter: Position;
  private state: State;
  private sprites: Record<
    string,
    Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  >;
  private cameraMaxSpeed: number;
  private cameraAcceleration: number;
  private cameraDrag: number;
  private cameraZoomSpeed: number;
  private cameraMinZoom: number;
  private cameraMaxZoom: number;

  private shipScaleFactor: number;
  private selected: [EntityType, string] | null;
  private paused: boolean;

  // @ts-ignore
  private controls: SmoothedKeyControl;

  constructor() {
    super("game");
    this.screenCenter = { x: window.innerWidth, y: window.innerHeight };

    this.state = {
      money: 0,
      planets: {},
      ships: {},
      routes: {},
    };
    this.sprites = {};
    this.shipScaleFactor = 0.3;

    this.cameraMaxSpeed = 0.8;
    this.cameraAcceleration = 0.5;
    this.cameraDrag = 0.01;
    this.cameraZoomSpeed = 0.02;
    this.cameraMinZoom = 1;
    this.cameraMaxZoom = 8;
    this.selected = null;
    this.paused = false;
  }

  init() {}

  preload() {
    // load assets here
    this.load.image("homeworld", planets.planet00);
    this.load.image("moon", planets.planet05);
    this.load.image("background", backgrounds.purple);
    this.load.image("ship", ships.spaceShips_005);
    this.load.plugin(
      "rexglowfilter2pipelineplugin",
      "https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexglowfilter2pipelineplugin.min.js",
      true,
    );
  }

  create() {
    //  add to top-level game object
    const { x, y } = this.screenCenter;
    try {
      this.add.tileSprite(0, 0, 15_000, 10_000, "background");
    } catch {}

    const homeworldId = this.createPlanet({
      texture: "homeworld",
      radius: 100,
      position: { x: 2000, y: 2000 },
      population: 100,
      waste: 10,
    });

    const moonId = this.createPlanet({
      texture: "moon",
      radius: 25,
      position: { x: 2200, y: 1800 },
    });

    const shipId = this.createShip({
      type: shipTypes.shuttle,
      position: this.state.planets[homeworldId].position,
    });

    this.state.routes.route1 = {
      id: "route1",
      nodes: [
        { planet: homeworldId, action: "LOAD_WASTE" },
        { planet: moonId, action: "DUMP_WASTE" },
      ],
    };
    this.state.ships[shipId].assignedRoute = "route1";

    this.state.money = 100;

    const logState = () =>
      console.log(`
    Homeworld pop: ${this.state.planets[homeworldId].population}, waste: ${
        this.state.planets[homeworldId].waste
      }
    Moon pop: ${this.state.planets[moonId].population}, waste: ${
        this.state.planets[moonId].waste
      }
    Ship waste: ${this.state.ships[shipId].waste}
    Money: ${new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(this.state.money)}
    `);
    logState();
    setInterval(logState, 1000);

    // camera
    this.cameras.main.setBounds(0, 0, 8000, 4000);
    this.cameras.main.centerOn(
      this.state.ships[shipId].position.x,
      this.state.ships[shipId].position.y,
    );
    this.cameras.main.setZoom(1, 1);

    // Input
    const controlConfig: SmoothedKeyControlConfig = {
      camera: this.cameras.main,
      left: this.input.keyboard.addKey(KeyCodes.A),
      right: this.input.keyboard.addKey(KeyCodes.D),
      up: this.input.keyboard.addKey(KeyCodes.W),
      down: this.input.keyboard.addKey(KeyCodes.S),
      zoomIn: this.input.keyboard.addKey(KeyCodes.E),
      zoomOut: this.input.keyboard.addKey(KeyCodes.Q),
      zoomSpeed: this.cameraZoomSpeed,
      minZoom: this.cameraMinZoom,
      maxZoom: this.cameraMaxZoom,
      acceleration: this.cameraAcceleration,
      drag: this.cameraDrag,
      maxSpeed: this.cameraMaxSpeed,
    };

    this.controls = new SmoothedKeyControl(controlConfig);

    this.input.on(
      "gameobjectup",
      (
        pointer: never,
        object: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
      ) => {
        const [type, id] = object.getData(["type", "id"]) as [
          EntityType,
          string,
        ];
        this.toggleSelected(type, id);
      },
    );

    window.addEventListener("keydown", (event) => {
      if (event.code === "Space") {
        this.paused = !this.paused;
      }
    });
  }

  update(time: number, delta: number): void {
    this.controls.update(delta);

    if (!this.paused) {
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
  }

  deselect() {
    if (!this.selected) return;
    const [type, id] = this.selected;
    const sprite = this.sprites[id];
    (this.plugins.get("rexglowfilter2pipelineplugin") as any).remove(sprite);
    this.selected = null;
  }

  select(type: EntityType, id: string) {
    if (this.selected) {
      this.deselect();
    }
    const sprite = this.sprites[id];
    (this.plugins.get("rexglowfilter2pipelineplugin") as any).add(sprite, {
      outerStrength: 10,
      innerStrength: 0,
      glowColor: 0xffffff,
      knockout: false,
      distance: 15,
      quality: 0.1,
    });
    this.selected = [type, id];
  }

  toggleSelected(type: EntityType, id: string) {
    if (this.selected && this.selected[0] === type && this.selected[1] === id) {
      this.deselect();
    } else {
      this.select(type, id);
    }
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
  }): string {
    const id = nanoid();
    const capacity = radius * 100;
    const scale = (radius * 2) / 1000;
    const sprite = this.physics.add.sprite(position.x, position.y, texture);
    this.sprites[id] = sprite;
    sprite.setScale(scale);
    sprite.setInteractive(
      new Phaser.Geom.Circle(
        sprite.width / 2,
        sprite.height / 2,
        sprite.width / 2,
      ),
      Phaser.Geom.Circle.Contains,
    );
    sprite.setDataEnabled();
    sprite.setData({ type: "planet", id });
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

  private configureControls() {}

  createShip({ type, position }: { type: ShipType; position: Position }) {
    const id = nanoid();
    this.state.ships[id] = {
      id,
      type,
      position,
      direction: 0,
      currentSpeed: 0,
      waste: 0,
      assignedRoute: null,
      destinationNodeIndex: 0,
    };
    const sprite = this.physics.add.sprite(position.x, position.y, "ship");
    sprite.setScale(this.shipScaleFactor);
    sprite.setInteractive(
      new Phaser.Geom.Circle(sprite.width / 2, sprite.height / 2, sprite.width),
      Phaser.Geom.Circle.Contains,
    );
    sprite.setDataEnabled();
    sprite.setData({ type: "ship", id });
    this.sprites[id] = sprite;
    return id;
  }
}

const config: GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: "#1a1a1a",
  width: window.innerWidth,
  height: window.innerHeight,
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: "100%",
    height: "100%",
  },
  scene: Game,
  physics: {
    default: "arcade",
    arcade: {
      // gravity: 0
    },
  },
  input: {
    //
  },
  dom: {
    createContainer: true,
  },
};

const game = new Phaser.Game(config);
