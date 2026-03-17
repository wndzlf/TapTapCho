(function initTwinTempleShared(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.TapTapTwinTempleShared = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createTwinTempleShared() {
  const FLOOR_Y = 500;
  const FLOOR_H = 40;
  const PLAYER_H = 42;

  function rect(x, y, w, h) {
    return { x, y, w, h };
  }

  function ground(x, w) {
    return rect(x, FLOOR_Y, w, FLOOR_H);
  }

  function platform(x, top, w, h) {
    return rect(x, top, w, h || 14);
  }

  function buttonAt(x, surfaceY, target, element, w) {
    const width = w || 44;
    return {
      x,
      y: surfaceY - 10,
      w: width,
      h: 10,
      target,
      element,
    };
  }

  function exitAt(x, surfaceY, element) {
    return {
      x,
      y: surfaceY - 52,
      w: 42,
      h: 52,
      element,
    };
  }

  function spawnAt(x, surfaceY) {
    return { x, y: surfaceY - PLAYER_H };
  }

  function door(id, x, color, y, h, lift, w) {
    return {
      id,
      x,
      y: y == null ? 120 : y,
      w: w == null ? 28 : w,
      h: h == null ? 380 : h,
      lift: lift == null ? 318 : lift,
      color: color || '#9dc3ff',
    };
  }

  function floorPool(x, w, kind) {
    return {
      x,
      y: FLOOR_Y - 14,
      w,
      h: 14,
      kind,
    };
  }

  function level(name, data) {
    return {
      name,
      spawns: data.spawns,
      solids: data.solids,
      hazards: data.hazards,
      buttons: data.buttons,
      doors: data.doors,
      exits: data.exits,
    };
  }

  const levels = [
    level('Temple Handshake', {
      spawns: {
        ember: spawnAt(48, FLOOR_Y),
        aqua: spawnAt(112, FLOOR_Y),
      },
      solids: [
        ground(0, 220),
        ground(312, 648),
        platform(352, 432, 118),
        platform(520, 364, 126),
        platform(712, 296, 176),
      ],
      hazards: [
        floorPool(220, 92, 'fire'),
        floorPool(646, 66, 'water'),
      ],
      buttons: [
        buttonAt(388, 432, 'l1-gate-1', 'ember'),
        buttonAt(558, 364, 'l1-gate-2', 'aqua'),
      ],
      doors: [
        door('l1-gate-1', 486, '#8de5ff'),
        door('l1-gate-2', 676, '#ffd890'),
      ],
      exits: [
        exitAt(760, 296, 'ember'),
        exitAt(820, 296, 'aqua'),
      ],
    }),
    level('Relay Causeway', {
      spawns: {
        ember: spawnAt(40, FLOOR_Y),
        aqua: spawnAt(104, FLOOR_Y),
      },
      solids: [
        ground(0, 176),
        ground(268, 214),
        ground(566, 394),
        platform(212, 432, 96),
        platform(356, 364, 122),
        platform(590, 432, 112),
        platform(760, 364, 132),
      ],
      hazards: [
        floorPool(176, 92, 'water'),
        floorPool(482, 84, 'fire'),
      ],
      buttons: [
        buttonAt(234, 432, 'l2-gate-1', 'aqua'),
        buttonAt(392, 364, 'l2-gate-2', 'ember'),
      ],
      doors: [
        door('l2-gate-1', 326, '#8de5ff'),
        door('l2-gate-2', 720, '#ffd890'),
      ],
      exits: [
        exitAt(804, 364, 'ember'),
        exitAt(850, 364, 'aqua'),
      ],
    }),
    level('Split Switchback', {
      spawns: {
        ember: spawnAt(46, FLOOR_Y),
        aqua: spawnAt(112, FLOOR_Y),
      },
      solids: [
        ground(0, 206),
        ground(324, 214),
        ground(688, 272),
        platform(126, 432, 106),
        platform(370, 364, 120),
        platform(548, 296, 114),
        platform(738, 228, 150),
      ],
      hazards: [
        floorPool(206, 118, 'acid'),
        floorPool(490, 58, 'fire'),
        floorPool(634, 54, 'water'),
      ],
      buttons: [
        buttonAt(152, 432, 'l3-gate-1', 'ember'),
        buttonAt(402, 364, 'l3-gate-2', 'aqua'),
        buttonAt(576, 296, 'l3-gate-3', 'ember'),
      ],
      doors: [
        door('l3-gate-1', 298, '#ffd890', 170, 330, 286),
        door('l3-gate-2', 520, '#8de5ff', 120, 380, 320),
        door('l3-gate-3', 698, '#d6b8ff', 96, 404, 334),
      ],
      exits: [
        exitAt(782, 228, 'ember'),
        exitAt(836, 228, 'aqua'),
      ],
    }),
    level('Mirror Ladder', {
      spawns: {
        ember: spawnAt(40, FLOOR_Y),
        aqua: spawnAt(98, FLOOR_Y),
      },
      solids: [
        ground(0, 182),
        ground(278, 180),
        ground(544, 180),
        ground(806, 154),
        platform(214, 428, 86),
        platform(346, 358, 104),
        platform(608, 358, 104),
        platform(742, 288, 110),
        platform(820, 220, 120),
      ],
      hazards: [
        floorPool(182, 96, 'water'),
        floorPool(458, 86, 'acid'),
        floorPool(724, 82, 'fire'),
      ],
      buttons: [
        buttonAt(230, 428, 'l4-gate-1', 'aqua'),
        buttonAt(376, 358, 'l4-gate-2', 'ember'),
        buttonAt(636, 358, 'l4-gate-3', 'aqua'),
      ],
      doors: [
        door('l4-gate-1', 320, '#8de5ff'),
        door('l4-gate-2', 582, '#ffd890'),
        door('l4-gate-3', 718, '#8de5ff'),
      ],
      exits: [
        exitAt(848, 220, 'ember'),
        exitAt(892, 220, 'aqua'),
      ],
    }),
    level('Prism Stairs', {
      spawns: {
        ember: spawnAt(46, FLOOR_Y),
        aqua: spawnAt(108, FLOOR_Y),
      },
      solids: [
        ground(0, 230),
        ground(332, 180),
        ground(590, 150),
        ground(812, 148),
        platform(260, 430, 86),
        platform(396, 360, 100),
        platform(548, 290, 90),
        platform(690, 220, 92),
        platform(834, 160, 104),
      ],
      hazards: [
        floorPool(230, 102, 'fire'),
        floorPool(512, 78, 'water'),
        floorPool(740, 72, 'acid'),
      ],
      buttons: [
        buttonAt(278, 430, 'l5-gate-1', 'ember'),
        buttonAt(420, 360, 'l5-gate-2', 'aqua'),
        buttonAt(566, 290, 'l5-gate-3', 'ember'),
        buttonAt(710, 220, 'l5-gate-4', 'aqua'),
      ],
      doors: [
        door('l5-gate-1', 364, '#ffd890'),
        door('l5-gate-2', 520, '#8de5ff'),
        door('l5-gate-3', 652, '#ffd890'),
        door('l5-gate-4', 804, '#8de5ff'),
      ],
      exits: [
        exitAt(854, 160, 'ember'),
        exitAt(896, 160, 'aqua'),
      ],
    }),
    level('Flooded Vault', {
      spawns: {
        ember: spawnAt(34, FLOOR_Y),
        aqua: spawnAt(92, FLOOR_Y),
      },
      solids: [
        ground(0, 160),
        ground(254, 154),
        ground(468, 132),
        ground(650, 146),
        ground(850, 110),
        platform(184, 430, 82),
        platform(312, 362, 92),
        platform(506, 292, 84),
        platform(696, 224, 92),
        platform(858, 156, 92),
      ],
      hazards: [
        floorPool(160, 94, 'water'),
        floorPool(408, 60, 'fire'),
        floorPool(600, 50, 'acid'),
        floorPool(796, 54, 'water'),
      ],
      buttons: [
        buttonAt(202, 430, 'l6-gate-1', 'aqua'),
        buttonAt(334, 362, 'l6-gate-2', 'ember'),
        buttonAt(524, 292, 'l6-gate-3', 'aqua'),
        buttonAt(718, 224, 'l6-gate-4', 'ember'),
      ],
      doors: [
        door('l6-gate-1', 284, '#8de5ff'),
        door('l6-gate-2', 452, '#ffd890'),
        door('l6-gate-3', 626, '#8de5ff'),
        door('l6-gate-4', 834, '#ffd890'),
      ],
      exits: [
        exitAt(866, 156, 'ember'),
        exitAt(908, 156, 'aqua'),
      ],
    }),
    level('Temple Loop', {
      spawns: {
        ember: spawnAt(42, FLOOR_Y),
        aqua: spawnAt(106, FLOOR_Y),
      },
      solids: [
        ground(0, 214),
        ground(330, 160),
        ground(556, 140),
        ground(774, 186),
        platform(110, 430, 100),
        platform(246, 356, 96),
        platform(382, 282, 96),
        platform(586, 282, 96),
        platform(722, 208, 96),
        platform(836, 140, 114),
      ],
      hazards: [
        floorPool(214, 116, 'fire'),
        floorPool(490, 66, 'water'),
        floorPool(696, 78, 'acid'),
      ],
      buttons: [
        buttonAt(136, 430, 'l7-gate-1', 'ember'),
        buttonAt(270, 356, 'l7-gate-2', 'aqua'),
        buttonAt(406, 282, 'l7-gate-3', 'ember'),
        buttonAt(610, 282, 'l7-gate-4', 'aqua'),
        buttonAt(746, 208, 'l7-gate-5', 'ember'),
      ],
      doors: [
        door('l7-gate-1', 228, '#ffd890'),
        door('l7-gate-2', 364, '#8de5ff'),
        door('l7-gate-3', 548, '#ffd890'),
        door('l7-gate-4', 704, '#8de5ff'),
        door('l7-gate-5', 820, '#ffd890'),
      ],
      exits: [
        exitAt(852, 140, 'ember'),
        exitAt(902, 140, 'aqua'),
      ],
    }),
    level('Switchback Vault', {
      spawns: {
        ember: spawnAt(36, FLOOR_Y),
        aqua: spawnAt(98, FLOOR_Y),
      },
      solids: [
        ground(0, 190),
        ground(290, 150),
        ground(498, 126),
        ground(680, 142),
        ground(880, 80),
        platform(128, 426, 94),
        platform(332, 350, 92),
        platform(540, 274, 90),
        platform(724, 198, 92),
        platform(856, 122, 94),
      ],
      hazards: [
        floorPool(190, 100, 'water'),
        floorPool(440, 58, 'fire'),
        floorPool(624, 56, 'acid'),
        floorPool(822, 58, 'water'),
      ],
      buttons: [
        buttonAt(150, 426, 'l8-gate-1', 'aqua'),
        buttonAt(354, 350, 'l8-gate-2', 'ember'),
        buttonAt(560, 274, 'l8-gate-3', 'aqua'),
        buttonAt(746, 198, 'l8-gate-4', 'ember'),
      ],
      doors: [
        door('l8-gate-1', 262, '#8de5ff'),
        door('l8-gate-2', 468, '#ffd890'),
        door('l8-gate-3', 650, '#8de5ff'),
        door('l8-gate-4', 850, '#ffd890'),
      ],
      exits: [
        exitAt(864, 122, 'ember'),
        exitAt(906, 122, 'aqua'),
      ],
    }),
    level('Cross Keys', {
      spawns: {
        ember: spawnAt(44, FLOOR_Y),
        aqua: spawnAt(110, FLOOR_Y),
      },
      solids: [
        ground(0, 200),
        ground(312, 160),
        ground(530, 144),
        ground(710, 130),
        ground(882, 78),
        platform(152, 420, 96),
        platform(354, 344, 94),
        platform(566, 268, 90),
        platform(744, 192, 88),
        platform(858, 116, 92),
      ],
      hazards: [
        floorPool(200, 112, 'fire'),
        floorPool(472, 58, 'water'),
        floorPool(674, 36, 'acid'),
        floorPool(840, 42, 'fire'),
      ],
      buttons: [
        buttonAt(176, 420, 'l9-gate-1', 'ember'),
        buttonAt(378, 344, 'l9-gate-2', 'aqua'),
        buttonAt(586, 268, 'l9-gate-3', 'ember'),
        buttonAt(762, 192, 'l9-gate-4', 'aqua'),
      ],
      doors: [
        door('l9-gate-1', 286, '#ffd890'),
        door('l9-gate-2', 502, '#8de5ff'),
        door('l9-gate-3', 684, '#ffd890'),
        door('l9-gate-4', 858, '#8de5ff'),
      ],
      exits: [
        exitAt(864, 116, 'ember'),
        exitAt(906, 116, 'aqua'),
      ],
    }),
    level('Crown Chamber', {
      spawns: {
        ember: spawnAt(42, FLOOR_Y),
        aqua: spawnAt(104, FLOOR_Y),
      },
      solids: [
        ground(0, 150),
        ground(242, 130),
        ground(426, 120),
        ground(600, 116),
        ground(772, 188),
        platform(166, 424, 74),
        platform(306, 348, 92),
        platform(474, 272, 96),
        platform(642, 196, 98),
        platform(808, 120, 126),
      ],
      hazards: [
        floorPool(150, 92, 'water'),
        floorPool(372, 54, 'fire'),
        floorPool(546, 54, 'acid'),
        floorPool(716, 56, 'water'),
      ],
      buttons: [
        buttonAt(184, 424, 'l10-gate-1', 'aqua'),
        buttonAt(330, 348, 'l10-gate-2', 'ember'),
        buttonAt(498, 272, 'l10-gate-3', 'aqua'),
        buttonAt(670, 196, 'l10-gate-4', 'ember'),
      ],
      doors: [
        door('l10-gate-1', 268, '#8de5ff'),
        door('l10-gate-2', 446, '#ffd890'),
        door('l10-gate-3', 618, '#8de5ff'),
        door('l10-gate-4', 780, '#ffd890'),
      ],
      exits: [
        exitAt(844, 120, 'ember'),
        exitAt(892, 120, 'aqua'),
      ],
    }),
  ];

  return { levels };
}));
