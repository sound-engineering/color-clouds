/*

Color clouds (c) 2021 Steven Kitzes
with controbutions by Sound Engineering LLC

license TBD but probably gonna be MIT or Do the Fuck What You Want license
use at your own risk, no promises

*/

const log = (msg) => {
  console.log(msg);
};
const error = (msg) => {
  console.log(`ERROR: ${msg}`);
};

// start and end both inclusive
const randInt = (start, end) => {
  const span = end - start + 1;
  return Math.floor(Math.random() * span) + start;
};

const coinToss = () => {
  return randInt(0, 1) ? true : false;
};

function limit(x, lo, hi) {
  return x < lo ? lo : x > hi ? hi : x;
}

function randomChoice(choices) {
  var index = Math.floor(Math.random() * choices.length);
  return choices[index];
}

class Box {
  constructor(grid, stage, row, col, span) {
    this.grid = grid;
    this.isStage = stage;
    this.red = 0;
    this.green = 0;
    this.blue = 0;
    this.bloom = 0;
    this.span = span;
    this.row = row;
    this.col = col;
    this.originColor = null;
  }

  static colorDrift(factor) {
    return randInt(-factor, factor);
  }

  boundColors() {
    this.red = limit(this.red, 0, 255);
    this.green = limit(this.green, 0, 255);
    this.blue = limit(this.blue, 0, 255);
  }

  driftColors(factor) {
    factor = factor || this.grid.options.colorDriftFactor;
    this.red += Box.colorDrift(factor);
    this.green += Box.colorDrift(factor);
    this.blue += Box.colorDrift(factor);
  }

  clonePropertiesFrom(otherBox, colorsOnly) {
    this.red = otherBox.red;
    this.green = otherBox.green;
    this.blue = otherBox.blue;

    if (!colorsOnly) {
      this.bloom = otherBox.bloom;
      this.originColor = otherBox.originColor;
    }
  }

  startBloom(initialBloom) {
    const [red, green, blue] = this.grid.getColor();
    this.red = red;
    this.green = green;
    this.blue = blue;
    this.bloom = initialBloom;
    this.setOriginColor(red, green, blue);
  }

  setOriginColor(r, g, b) {
    this.originColor = {
      red: r,
      green: g,
      blue: b,
    };
  }

  getBloomFactor() {
    return this.bloom > 0 ? this.grid.options.bloomFactor : 1;
  }

  updateSpanColor() {
    let color = "rgb(" + this.red + "," + this.green + "," + this.blue + ")";
    this.span.style.backgroundColor = color;
  }

  getStore(staged) {
    return staged ? this.grid.stage : this.grid.data;
  }

  getAbove(staged) {
    return this.row > 0 ? this.getStore(staged)[this.row - 1][this.col] : null;
  }

  getBelow(staged) {
    return this.row < this.grid.getNumRows() - 1
      ? this.getStore(staged)[this.row + 1][this.col]
      : null;
  }

  getLeft(staged) {
    return this.col > 0 ? this.getStore(staged)[this.row][this.col - 1] : null;
  }

  getRight(staged) {
    return this.col < this.grid.getNumCols() - 1
      ? this.getStore(staged)[this.row][this.col + 1]
      : null;
  }

  getNeighbors(staged) {
    return [
      this.getAbove(staged),
      this.getBelow(staged),
      this.getLeft(staged),
      this.getRight(staged),
    ];
  }
}

class BoxGrid {
  constructor(element, options) {
    this.element = element;
    this.stage = [];
    this.data = [];
    this.options = options;

    this.layout();
  }

  layout() {
    const boxSize = this.options.boxSize;
    const height = Math.ceil(this.element.clientHeight / boxSize);
    const width = Math.ceil(this.element.clientWidth / boxSize);
    this.element.innerHTML = "";

    // necessary?
    delete this.stage;
    delete this.data;

    this.stage = [];
    this.data = [];

    for (let row = 0; row < height; row++) {
      const stageRow = [];
      const dataRow = [];

      for (let col = 0; col < width; col++) {
        const span = document.createElement("span");

        span.style.backgroundColor = "#000";
        span.style.height = `${boxSize}px`;
        span.style.left = `${col * boxSize}px`;
        span.style.position = "absolute";
        span.style.top = `${row * boxSize}px`;
        span.style.width = `${boxSize}px`;
        span.style.borderRadius =
          (boxSize / 2) * this.options.boxBorderRadius + "px";
        this.element.appendChild(span);

        dataRow.push(new Box(this, false, row, col, span));
        stageRow.push(new Box(this, true, row, col, span));
      }

      this.stage.push(stageRow);
      this.data.push(dataRow);
    }

    for (let i = 0; i < this.options.startingBlooms; i++) {
      this.getRandomStagedBox().startBloom(this.options.bloomInitial);
    }
  }

  getNumRows() {
    return this.data.length;
  }

  getNumCols() {
    if (this.data[0] !== undefined) {
      return this.data[0].length;
    }
    return 0;
  }

  getRandomStagedBox() {
    const r = randInt(0, this.getNumRows() - 1);
    const c = randInt(0, this.getNumCols() - 1);
    return this.stage[r][c];
  }

  randomlyBloom() {
    if (randInt(0, this.options.bloomOdds) === 0) {
      this.getRandomStagedBox().startBloom(this.options.bloomInitial);
    }
  }

  randomlySpread(box, maxNeighborBloom, newOriginColor) {
    if (randInt(0, this.options.bloomSpreadOdds) === 0) {
      box.bloom = Math.max(
        maxNeighborBloom - randInt(1, this.options.bloomDecayMax),
        0
      );
      if (box.bloom > 0) {
        box.originColor = newOriginColor;
      }
    }
  }

  randomlyBlur() {
    // blur blinks
    const r = Math.random();
    const thresh = 1 / this.options.blurBlinkOdds;
    let blur = this.options.blur;
    const blurIncrement = blur * 0.2;

    if (r <= thresh * 0.5) {
      blur += blurIncrement * 2;
    } else if (r <= thresh) {
      blur += blurIncrement;
    }

    this.element.style.filter = `blur(${blur}px)`;
  }

  getColor() {
    if (!this.options.colors) {
      return [randInt(0, 255), randInt(0, 255), randInt(0, 255)];
    } else {
      return randomChoice(this.options.colors);
    }
  }

  *iterateData() {
    for (let r = 0; r < this.getNumRows(); r++) {
      for (let c = 0; c < this.getNumCols(); c++) {
        yield { box: this.data[r][c], staged: this.stage[r][c] };
      }
    }
  }

  tick() {
    // general strategy: READ from boxData to WRITE to boxDatastage
    // fuss around and customize values in boxDataStage, maintaining frame-wise original,
    // pristine state in boxData; when done, write colors from boxDateStage to DOM, as well
    // as back to boxData

    // for each box:
    // if i have bloom:
    //   average me with self and other bloom neighbors ONLY for those neighbors with higher bloom count than mine
    //   reduce my remaining bloom count
    // if i don't have bloom:
    //   average me with all neighbors
    //   weight the average toward boxes with bloom
    //   chance of catching some amount of bloom and becoming a bloom box

    // step: populate stage data from boxData
    for (const { box, staged } of this.iterateData()) {
      staged.clonePropertiesFrom(box, true);
    }

    // step: seed new blooms
    this.randomlyBloom();

    // step: apply bloom/averaging rules
    for (const { staged } of this.iterateData()) {
      // If current has bloom, avg w self's origin and other higher bloom neightbors and reduce bloom
      if (staged.bloom > 0) {
        if (this.options.DEBUG) staged.span.innerHTML = "B";

        const avg = new ColorAverager(staged.originColor);

        for (const neighbor of staged.getNeighbors(false)) {
          if (neighbor && neighbor.bloom >= staged.bloom) {
            avg.addFromObj(neighbor, 1);
          }
        }

        avg.applyRGB(staged);

        staged.bloom--;
        if (staged.bloom < 1) {
          staged.originColor = null;
        }
      }

      // If box lacks bloom, avg w all neighbors; weight bloom neighbors; maybe catch their bloom
      else if (staged.bloom < 1) {
        if (this.options.DEBUG) staged.span.innerHTML = "";

        const avg = new ColorAverager(staged);
        let maxNeighborBloom = 0;
        let newOrigin = null;

        for (const neighbor of staged.getNeighbors(false)) {
          if (neighbor) {
            avg.addFromObj(neighbor, neighbor.getBloomFactor());

            if (
              neighbor.bloom - this.options.bloomDecayMax >
              maxNeighborBloom
            ) {
              maxNeighborBloom = neighbor.bloom;
              newOrigin = neighbor.originColor;
            }
          }
        }

        avg.applyRGB(staged);

        this.randomlySpread(staged, maxNeighborBloom, newOrigin);
      }
    }

    // step: apply drift
    for (const { staged } of this.iterateData()) {
      staged.driftColors();
      staged.boundColors();
    }

    // step: write fussed stage to DOM and this.data
    for (const { box, staged } of this.iterateData()) {
      staged.updateSpanColor();
      box.clonePropertiesFrom(staged, false);
    }

    // blur blinks
    this.randomlyBlur();
  }
}

class ColorAverager {
  constructor(obj) {
    this.red = obj.red;
    this.green = obj.green;
    this.blue = obj.blue;
    this.count = 1;
  }

  addFromObj(obj, count) {
    this.red += obj.red * count;
    this.green += obj.green * count;
    this.blue += obj.blue * count;
    this.count += count;
  }

  applyRGB(obj) {
    obj.red = this.red / this.count;
    obj.green = this.green / this.count;
    obj.blue = this.blue / this.count;
  }
}

class ColorCloud {
  constructor(elementId, args = {}) {
    const displayElement = document.getElementById(elementId);
    if (!displayElement) {
      return error(
        `unable to find DOM element with the provided id: ${elementId}`
      );
    }

    // Prepare our display element
    if (window.getComputedStyle(displayElement).position !== "relative") {
      displayElement.style.backgroundColor = "black";
      displayElement.style.color = "white";
      displayElement.innerHTML =
        "Sorry, color clouds cannot render in this element!";
      return error(
        `this feature only available for use with DOM elements with the 'relative' position style`
      );
    }

    // defaults
    let options = {
      bloomDecayMax: 5,
      bloomFactor: 3,
      bloomInitial: 200,
      bloomOdds: 100,
      bloomSpreadOdds: 20,
      boxSize: 20,
      colorDriftFactor: 5,
      frameDelay: 100,
      blur: 10,
      blurBlinkOdds: 90,
      colors: undefined,
      startingBlooms: 0,
      debug: false,
      boxBorderRadius: 1,
    };

    // arguments override defaults
    Object.assign(options, args);

    // create the grid
    this.grid = new BoxGrid(displayElement, options);
    this.element = displayElement;
    this._running_loop = undefined;
  }

  start() {
    this._running_loop = setInterval(() => {
      this.grid.tick();
    }, this.grid.options.frameDelay);
  }

  stop() {
    if (this._running_loop !== undefined) {
      clearInterval(this._running_loop);
    }
    this._running_loop = undefined;
  }

  updateOptions(args = {}) {
    const updatingSpeed = args.hasOwnProperty("frameDelay");
    const updatingSize =
      args.hasOwnProperty("boxSize") || args.hasOwnProperty("boxBorderRadius");

    if (updatingSpeed) {
      this.stop();
    }

    Object.assign(this.grid.options, args);

    if (updatingSize) {
      this.grid.layout();
    }

    if (updatingSpeed) {
      this.start();
    }
  }
}

export { ColorCloud };
