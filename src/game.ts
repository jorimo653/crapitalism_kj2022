import { nanoid } from "nanoid";
import "phaser";
import planets from "./assets/images/kenney_planets/Planets/*.png";
import ships from "./assets/images/kenney_spaceshooterextension/PNG/Sprites/Ships/*.png";
import backgrounds from "./assets/images/spaceshooter/Backgrounds/*.png";
import shipTypes from "./data/shipTypes";
import { convertRadiansToDegrees, updatePlanet, updateShip } from "./lib";
import { EntityType, Position, ShipType, State } from "./types";
import FixedKeyControl = Phaser.Cameras.Controls.FixedKeyControl;
import KeyCodes = Phaser.Input.Keyboard.KeyCodes;
import FixedKeyControlConfig = Phaser.Types.Cameras.Controls.FixedKeyControlConfig;
import GameConfig = Phaser.Types.Core.GameConfig;

export default class Game extends Phaser.Scene {
  private screenCenter: Position;
  private state: State;
  private sprites: Record<
    string,
    Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  >;
  private orbits: Record<string, Phaser.GameObjects.Graphics>;
  private cameraMaxSpeed: number;
  private cameraZoomSpeed: number;
  private cameraMinZoom: number;
  private cameraMaxZoom: number;

  private shipScaleFactor: number;
  private selected: [EntityType, string] | null;
  private paused: boolean;

  // @ts-ignore
  private controls: FixedKeyControl;

  // private uiElements: HTMLElement[] = [];
  private uiTitle: HTMLElement | undefined;
  private uiWasteStat: HTMLElement | undefined;
  private uiPopulationStat: HTMLElement | undefined;
  private uiMoneyStat: HTMLElement | undefined;

  constructor() {
    super({ key: "GameScene", active: true });
    this.screenCenter = { x: window.innerWidth, y: window.innerHeight };

    this.state = {
      money: 0,
      planets: {},
      ships: {},
      routes: {},
    };
    this.sprites = {};
    this.orbits = {};
    this.shipScaleFactor = 0.3;

    this.cameraMaxSpeed = 1.5;
    this.cameraZoomSpeed = 0.025;
    this.cameraMinZoom = 0.25;
    this.cameraMaxZoom = 8;
    this.selected = null;
    this.paused = false;
  }

  init() {}

  preload() {
    // load assets here
    this.load.image("homeworld", planets.planet00);
    this.load.image("toxicWorld", planets.planet01);
    this.load.image("moltenWorld", planets.planet02);
    this.load.image("crystalWorld", planets.planet04);
    this.load.image("moon", planets.planet05);
    this.load.image("pinkWorld", planets.planet06);
    this.load.image("oceanWorld", planets.planet07);
    this.load.image("sun", planets.planet08);
    this.load.image("purpleWorld", planets.planet09);
    this.load.image("shuttle", ships.spaceShips_003);
    this.load.image("freighter", ships.spaceShips_005);
    this.load.image("background", backgrounds.black);
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
      this.add.tileSprite(0, 0, 16_000, 16_000, "background");
    } catch {}

    this.generateMap();

    this.state.money = 100;

    // camera
    this.cameras.main.setBounds(0, 0, 8000, 8000);
    this.cameras.main.centerOn(4000, 4000);
    this.cameras.main.setZoom(0.5, 0.5);

    // Input
    const controlConfig: FixedKeyControlConfig = {
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
      speed: this.cameraMaxSpeed,
    };

    this.controls = new FixedKeyControl(controlConfig);

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

    window.addEventListener("keyup", () => {
      const speed = this.cameraMaxSpeed / this.cameras.main.zoom;
      this.controls.speedX = speed;
      this.controls.speedY = speed;
    });

    this.drawUI();
  }

  update(time: number, delta: number): void {
    this.controls.update(delta);

    if (!this.paused) {
      const deltaSeconds = delta / 1000;
      Object.values(this.state.planets).forEach((planet) => {
        updatePlanet(this.state, planet, deltaSeconds);
        const sprite = this.sprites[planet.id];
        const dx = planet.position.x - sprite.x;
        const dy = planet.position.y - sprite.y;
        sprite.setPosition(planet.position.x, planet.position.y);
        Object.values(this.state.planets)
          .filter((moon) => moon.orbitCenter === planet.position)
          .forEach((moon) => {
            const orbit = this.orbits[moon.id];
            orbit.x += dx;
            orbit.y += dy;
          });
      });
      Object.values(this.state.ships).forEach((ship) => {
        updateShip(this.state, ship, deltaSeconds);
        const sprite = this.sprites[ship.id];
        sprite.setAngle(convertRadiansToDegrees(ship.direction) - 90);
        sprite.setPosition(ship.position.x, ship.position.y);
      });
    }
    // this.events.emit("updateMoney", { money: this.state.money });
    this.updateUIElements();
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
      outerStrength: 20,
      innerStrength: 0,
      glowColor: 0x80c0ff,
      knockout: false,
      distance: 5,
      quality: 1,
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
    name,
    orbitCenter,
    orbitRadius,
    population = 0,
    waste = 0,
  }: {
    texture: string;
    radius: number;
    name: string;
    orbitCenter: Position;
    orbitRadius: number;
    population?: number;
    waste?: number;
  }): string {
    const id = nanoid();
    const capacity = radius * 100;
    const scale = (radius * 2) / 1000;
    const startingAngle = Math.random() * 2 * Math.PI;
    const position = {
      x: orbitCenter.x + Math.cos(startingAngle) * orbitRadius,
      y: orbitCenter.y + Math.sin(startingAngle) * orbitRadius,
    };
    this.orbits[id] = this.drawOrbit(orbitCenter, orbitRadius);
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
      name,
      position,
      capacity,
      radius,
      population,
      waste,
      growingPop: 0,
      growingWaste: 0,
      orbitCenter,
      orbitRadius,
      orbitSpeed: 5000 / orbitRadius ** 2,
      orbitAngle: startingAngle,
    };
    return id;
  }

  private configureControls() {}

  createShip({
    type,
    position,
    name,
  }: {
    type: ShipType;
    position: Position;
    name: string;
  }) {
    const id = nanoid();
    this.state.ships[id] = {
      id,
      name,
      type,
      position,
      direction: 0,
      currentSpeed: 0,
      waste: 0,
      assignedRoute: null,
      destinationNodeIndex: 0,
    };
    const sprite = this.physics.add.sprite(
      position.x,
      position.y,
      type === shipTypes.freighter ? "freighter" : "shuttle",
    );
    sprite.setScale(
      this.shipScaleFactor * (type === shipTypes.freighter ? 1.5 : 1),
    );
    sprite.setInteractive(
      new Phaser.Geom.Circle(sprite.width / 2, sprite.height / 2, sprite.width),
      Phaser.Geom.Circle.Contains,
    );
    sprite.setDataEnabled();
    sprite.setData({ type: "ship", id });
    this.sprites[id] = sprite;
    return id;
  }

  generateMap() {
    const sunPosition = { x: 4000, y: 4000 };
    const sun = this.physics.add.sprite(sunPosition.x, sunPosition.y, "sun");
    sun.setScale(0.25);
    (this.plugins.get("rexglowfilter2pipelineplugin") as any).add(sun, {
      outerStrength: 5,
      innerStrength: 2,
      glowColor: 0xff8753,
      knockout: false,
      distance: 5,
      quality: 0.1,
    });

    this.createPlanet({
      texture: "moltenWorld",
      radius: 30,
      name: "Lavaland",
      orbitCenter: sunPosition,
      orbitRadius: 220,
    });

    this.createPlanet({
      texture: "toxicWorld",
      radius: 40,
      name: "Social Media",
      orbitCenter: sunPosition,
      orbitRadius: 400,
      population: 10000,
    });

    const homeworldId = this.createPlanet({
      texture: "homeworld",
      radius: 50,
      name: "Lindhurst",
      orbitCenter: sunPosition,
      orbitRadius: 600,
      population: 500,
    });

    this.createPlanet({
      texture: "moon",
      radius: 20,
      name: "Cheeseball",
      orbitCenter: this.state.planets[homeworldId].position,
      orbitRadius: 150,
    });

    const giantWorldId = this.createPlanet({
      texture: "purpleWorld",
      radius: 75,
      name: "Suffocation Station",
      orbitCenter: sunPosition,
      orbitRadius: 1100,
    });

    this.createPlanet({
      texture: "crystalWorld",
      radius: 15,
      name: "Walter White's house",
      orbitCenter: this.state.planets[giantWorldId].position,
      orbitRadius: 150,
    });

    this.createPlanet({
      texture: "oceanWorld",
      radius: 25,
      name: "PiPi's Waterpark",
      orbitCenter: this.state.planets[giantWorldId].position,
      orbitRadius: 200,
    });

    this.createPlanet({
      texture: "pinkWorld",
      radius: 10,
      name: "Pink World",
      orbitCenter: this.state.planets[giantWorldId].position,
      orbitRadius: 250,
    });

    const routeId = nanoid();
    this.state.routes = {
      [routeId]: {
        id: routeId,
        nodes: [
          { planet: homeworldId, action: "LOAD_WASTE" },
          { planet: giantWorldId, action: "DUMP_WASTE" },
        ],
      },
    };

    const freighter = this.createShip({
      position: this.state.planets[homeworldId].position,
      type: shipTypes.freighter,
      name: "Big Mama",
    });
    this.state.ships[freighter].assignedRoute = routeId;

    const shuttle = this.createShip({
      position: this.state.planets[homeworldId].position,
      type: shipTypes.shuttle,
      name: "Shirley",
    });
    this.state.ships[shuttle].assignedRoute = routeId;
  }

  drawOrbit(position: Position, radius: number) {
    const graphics = this.add.graphics();

    var color = 0xffffff;
    var thickness = 2;
    var alpha = 0.1;

    graphics.lineStyle(thickness, color, alpha);
    graphics.strokeCircle(position.x, position.y, radius);
    return graphics;
  }

  private drawUI() {
    const body = document.querySelector("body");
    const ui = document.createElement("div");
    ui.setAttribute("id", "ui");
    ui.style.display = "block";
    ui.style.position = "fixed";
    ui.style.height = "100vh";
    ui.style.width = "25vw";
    ui.style.backgroundColor = "rgba(0, 0, 0, 0.4)";
    ui.style.borderLeft = "2px solid black";
    ui.style.right = "0";
    ui.style.top = "0";
    ui.style.padding = "2rem";

    const uiContent = document.createElement("div");
    uiContent.setAttribute("id", "ui-content");
    uiContent.style.display = "flex";
    uiContent.style.flexDirection = "column";
    uiContent.style.alignItems = "center";
    uiContent.style.justifyContent = "start";
    uiContent.style.width = "100%";
    uiContent.style.height = "calc(100% - 4rem)";
    uiContent.style.backgroundColor = "rgba(70, 70, 70, .1)";
    uiContent.style.padding = "0.5rem";
    uiContent.style.fontFamily = "Space";
    uiContent.style.color = "#eeeeee";
    uiContent.style.fontSize = "2rem";

    // title of object selected
    const selectedObjectTitle = document.createElement("div");
    selectedObjectTitle.setAttribute("id", "selectedObjectText");
    let innerHTML = undefined;
    if (this.selected) {
      const [type, id] = this.selected;
      innerHTML =
        type === "planet"
          ? this.state.planets[id].name
          : this.state.ships[id].name;
    }
    selectedObjectTitle.innerHTML = innerHTML ?? "Nothing selected";
    selectedObjectTitle.style.fontFamily = "Space";
    selectedObjectTitle.style.color = "#eeeeee";
    selectedObjectTitle.style.textTransform = "uppercase";
    selectedObjectTitle.style.fontSize = "3rem";
    selectedObjectTitle.style.marginBottom = "4rem";
    // this.uiElements.push(selectedObjectTitle);
    this.uiTitle = selectedObjectTitle;
    uiContent.appendChild(selectedObjectTitle);

    // stats of object
    const selectedStats = document.createElement("div");
    selectedStats.setAttribute("id", "selected-stats");
    const wasteStat = document.createElement("div");
    wasteStat.setAttribute("id", "waste-stat");
    wasteStat.innerHTML = "Placeholder Text - waste";
    // this.uiElements.push(wasteStat);
    this.uiWasteStat = wasteStat;

    const populationStat = document.createElement("div");
    populationStat.setAttribute("id", "population-stat");
    populationStat.innerHTML = "Placeholder Text - population";
    // this.uiElements.push(populationStat);
    this.uiPopulationStat = populationStat;

    selectedStats.appendChild(wasteStat);
    selectedStats.appendChild(populationStat);
    selectedStats.style.marginBottom = "4rem";
    uiContent.appendChild(selectedStats);

    // global stats (money)
    const moneyStat = document.createElement("div");
    moneyStat.setAttribute("id", "money-stat");
    moneyStat.innerHTML = `Funds: $${this.state.money.toFixed()}`;
    // this.uiElements.push(moneyStat);
    this.uiMoneyStat = moneyStat;
    uiContent.appendChild(moneyStat);

    // ship creation buttons

    ui.appendChild(uiContent);
    body?.appendChild(ui);
  }

  updateUIElements(): void {
    if (this.selected) {
      const [type, id] = this.selected;
      let title;
      let waste;
      let population;

      switch (type) {
        case "planet": {
          const { name, waste: w, population: pop } = this.state.planets[id];
          title = name;
          waste = w;
          population = pop;
          this.uiTitle!.innerHTML = title;
          this.uiWasteStat!.innerHTML = `Waste: ${waste.toFixed()}`;
          this.uiPopulationStat!.innerHTML = `Population: ${population.toFixed()}`;
          break;
        }
        case "ship": {
          const { name, waste: w } = this.state.ships[id];
          title = name;
          waste = w;
          this.uiTitle!.innerHTML = title;
          this.uiWasteStat!.innerHTML = String(waste);
          break;
        }
      }
      this.uiMoneyStat!.innerHTML = `Funds: $${this.state.money.toFixed()}`;
    }
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
