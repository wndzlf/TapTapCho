(function initTwinTempleShared(root, factory) {
  const shared = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = shared;
  }
  root.TapTapTwinTempleShared = shared;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createSharedLevels() {
  function rect(x, y, w, h) {
    return { x, y, w, h };
  }

  const FLOOR_Y = 500;
  const GROUND = rect(0, FLOOR_Y, 960, 40);

  function hazardKind(role) {
    return role === 'ember' ? 'fire' : 'water';
  }

  function roleColor(role) {
    return role === 'ember' ? '#ff9e4b' : '#6ad7ff';
  }

  function floorHazard(x, role, width) {
    return { ...rect(x, 484, width || 64, 56), kind: hazardKind(role) };
  }

  function floorButton(x, target, role) {
    return { ...rect(x, 486, 54, 14), target, element: role };
  }

  function floorDoor(id, x, role, top, lift) {
    const doorTop = top || 180;
    return {
      id,
      x,
      y: doorTop,
      w: 24,
      h: FLOOR_Y - doorTop,
      lift: lift || 260,
      color: roleColor(role),
    };
  }

  function exitPad(x, role) {
    return { ...rect(x, 456, 34, 44), element: role };
  }

  function makeLevel(name, config) {
    return {
      name,
      spawns: config.spawns,
      solids: [{ ...GROUND }],
      hazards: config.hazards || [],
      buttons: config.buttons || [],
      doors: config.doors || [],
      exits: config.exits || [],
    };
  }

  function linearRelay(name, sequence) {
    const count = sequence.length;
    const start = count === 2 ? 170 : count === 3 ? 130 : count === 4 ? 98 : 80;
    const gap = count === 2 ? 350 : count === 3 ? 220 : count === 4 ? 180 : 156;
    const hazards = [];
    const buttons = [];
    const doors = [];

    for (let i = 0; i < count; i += 1) {
      const role = sequence[i];
      const x = start + gap * i;
      const gateId = `gate-${i + 1}`;
      hazards.push(floorHazard(x, role));
      buttons.push(floorButton(x + 70, gateId, role));
      doors.push(floorDoor(gateId, x + 136, role));
    }

    const exits = count === 5
      ? [exitPad(878, 'ember'), exitPad(918, 'aqua')]
      : [exitPad(822, 'ember'), exitPad(882, 'aqua')];

    return makeLevel(name, {
      spawns: { ember: { x: 56, y: 452 }, aqua: { x: 116, y: 452 } },
      hazards,
      buttons,
      doors,
      exits,
    });
  }

  function splitExchange(name, leftRole, rightRole, crossExits) {
    const leftExitRole = crossExits ? rightRole : leftRole;
    const rightExitRole = crossExits ? leftRole : rightRole;

    return makeLevel(name, {
      spawns: { ember: { x: 430, y: 452 }, aqua: { x: 490, y: 452 } },
      hazards: [
        floorHazard(216, leftRole, 72),
        floorHazard(648, rightRole, 72),
      ],
      buttons: [
        floorButton(126, 'gate-right', leftRole),
        floorButton(758, 'gate-left', rightRole),
      ],
      doors: [
        floorDoor('gate-left', 72, leftRole, 170, 278),
        floorDoor('gate-right', 830, rightRole, 170, 278),
      ],
      exits: [
        exitPad(18, leftExitRole),
        exitPad(890, rightExitRole),
      ],
    });
  }

  const levels = [
    makeLevel('Temple Handshake', {
      spawns: { ember: { x: 56, y: 452 }, aqua: { x: 116, y: 452 } },
      buttons: [
        floorButton(150, 'gate-center', 'aqua'),
        floorButton(500, 'gate-exit', 'ember'),
      ],
      doors: [
        floorDoor('gate-center', 276, 'aqua'),
        floorDoor('gate-exit', 672, 'ember'),
      ],
      exits: [
        exitPad(820, 'ember'),
        exitPad(882, 'aqua'),
      ],
    }),
    linearRelay('Element Relay', ['aqua', 'ember']),
    splitExchange('Crossing Oath', 'ember', 'aqua', true),
    linearRelay('River Signal', ['aqua', 'ember', 'aqua']),
    linearRelay('Flame Signal', ['ember', 'aqua', 'ember']),
    splitExchange('Mirror Duties', 'aqua', 'ember', false),
    linearRelay('Long Relay', ['aqua', 'ember', 'aqua', 'ember']),
    linearRelay('Counter Relay', ['ember', 'aqua', 'ember', 'aqua']),
    linearRelay('Temple Circuit', ['ember', 'aqua', 'ember', 'aqua', 'ember']),
    linearRelay('Final Accord', ['aqua', 'ember', 'aqua', 'ember', 'aqua']),
  ];

  return Object.freeze({
    levels,
  });
}));
