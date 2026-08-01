const State = {
  IDLE: "idle",
  FOLLOW: "follow",
  PVP: "pvp",
  ESCAPE: "escape",
  EAT: "eat",
  SLEEP: "sleep",
  BRIDGE: "bridge"
};

let currentState = State.IDLE;

function getState() {
  return currentState;
}

function setState(state) {
  if (currentState !== state) {
    console.log(`[Brain] ${currentState} -> ${state}`);
    currentState = state;
  }
}

function is(state) {
  return currentState === state;
}

module.exports = {
  State,
  getState,
  setState,
  is
};