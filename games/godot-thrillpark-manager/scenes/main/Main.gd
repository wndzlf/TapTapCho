extends Node2D

const SAVE_PATH := "user://thrillpark_manager_save.json"

const MAP_W := 128
const MAP_H := 128
const TILE_SIZE := 16.0

const START_MONEY := 2000
const TICKET_PRICE := 15
const RIDE_FEE_BASE := 14
const SHOP_FEE := 9
const JANITOR_MONTHLY_COST := 300
const MONTH_DURATION := 30.0

const GUEST_SPEED_MIN := 24.0
const GUEST_SPEED_MAX := 38.0
const BASE_MAX_GUESTS := 280

const ZOOM_MIN := 0.5
const ZOOM_MAX := 2.25
const ZOOM_STEP := 0.1

const COST_PATH := 10
const COST_RIDE := 700
const COST_SHOP := 220
const COST_FACILITY := 140
const COST_BENCH := 60

const MODE_LABELS := {
	0: "PATH",
	1: "THRILL",
	2: "SHOP",
	3: "FACILITY",
	4: "BENCH",
	5: "BULLDOZE",
}

enum Tile {
	GRASS,
	PATH,
	WATER,
	TREE,
	RIDE,
	SHOP,
	FACILITY,
	BENCH,
	ENTRANCE,
}

enum BuildMode {
	PATH,
	RIDE,
	SHOP,
	FACILITY,
	BENCH,
	BULLDOZE,
}

var rng := RandomNumberGenerator.new()

var tiles := PackedInt32Array()

var entrance_cell := Vector2i(MAP_W / 2, MAP_H - 4)

var ride_cells: Array[Vector2i] = []
var shop_cells: Array[Vector2i] = []
var facility_cells: Array[Vector2i] = []
var bench_cells: Array[Vector2i] = []
var path_cells: Array[Vector2i] = []

var guests: Array[Dictionary] = []
var guest_seq := 1

var money := START_MONEY
var month := 1
var month_timer := 0.0
var total_profit := 0
var monthly_income := 0
var monthly_cost := 0

var janitors := 0
var litter := 0.0
var complaints := 0

var spawn_timer := 0.0
var status_text := ""
var status_timer := 0.0

var game_paused := false
var speed_index := 0
const SPEED_VALUES := [1.0, 2.0, 4.0]

var build_mode := BuildMode.PATH

var active_event := ""
var active_event_timer := 0.0
var event_cooldown := 20.0
var ride_fee_multiplier := 1.0
var spawn_multiplier := 1.0

var camera: Camera2D
var canvas_layer: CanvasLayer
var hud_label: Label
var side_label: Label
var status_label: Label
var speed_button: Button
var pause_button: Button
var objective_label: Label

var mode_buttons := {}
var ui_pulse := 0.0

var mouse_pan := false
var touch_pan_id := -1
var touch_pan_start := Vector2.ZERO
var touch_pan_moved := false


func _ready() -> void:
	rng.randomize()
	_setup_map()
	_setup_camera()
	_build_ui()
	_load_game()
	_rebuild_feature_lists()
	_set_mode(BuildMode.PATH)
	_set_status("Tap to build. Keep guests flowing.", 2.0)
	set_process(true)
	queue_redraw()


func _setup_map() -> void:
	tiles.resize(MAP_W * MAP_H)
	for i in range(tiles.size()):
		tiles[i] = Tile.GRASS

	_generate_terrain()
	_set_tile(entrance_cell, Tile.ENTRANCE)
	_create_starter_layout()
	_rebuild_feature_lists()


func _generate_terrain() -> void:
	for i in range(44):
		var cx := rng.randi_range(8, MAP_W - 9)
		var cy := rng.randi_range(8, MAP_H - 9)
		var radius := rng.randi_range(2, 6)
		for y in range(cy - radius, cy + radius + 1):
			for x in range(cx - radius, cx + radius + 1):
				if not _in_bounds_xy(x, y):
					continue
				var d := Vector2(float(x - cx), float(y - cy)).length()
				if d <= float(radius) and rng.randf() < 0.92:
					_set_tile_xy(x, y, Tile.WATER)

	for i in range(76):
		var cx := rng.randi_range(5, MAP_W - 6)
		var cy := rng.randi_range(5, MAP_H - 6)
		var radius := rng.randi_range(2, 5)
		for y in range(cy - radius, cy + radius + 1):
			for x in range(cx - radius, cx + radius + 1):
				if not _in_bounds_xy(x, y):
					continue
				if _get_tile_xy(x, y) != Tile.GRASS:
					continue
				var d := Vector2(float(x - cx), float(y - cy)).length()
				if d <= float(radius) and rng.randf() < 0.88:
					_set_tile_xy(x, y, Tile.TREE)

	var safe_cx := entrance_cell.x
	for y in range(MAP_H - 22, MAP_H):
		for x in range(safe_cx - 14, safe_cx + 15):
			if _in_bounds_xy(x, y):
				_set_tile_xy(x, y, Tile.GRASS)


func _create_starter_layout() -> void:
	for y in range(entrance_cell.y, entrance_cell.y - 12, -1):
		_set_tile(Vector2i(entrance_cell.x, y), Tile.PATH)

	var branch_y := entrance_cell.y - 11
	for x in range(entrance_cell.x - 6, entrance_cell.x + 7):
		_set_tile(Vector2i(x, branch_y), Tile.PATH)

	_place_building(Vector2i(entrance_cell.x - 7, branch_y - 1), Tile.RIDE, 0, false)
	_place_building(Vector2i(entrance_cell.x + 7, branch_y - 1), Tile.SHOP, 0, false)
	_place_building(Vector2i(entrance_cell.x + 2, branch_y - 5), Tile.FACILITY, 0, false)
	_place_building(Vector2i(entrance_cell.x - 2, branch_y - 3), Tile.BENCH, 0, false)


func _setup_camera() -> void:
	camera = Camera2D.new()
	camera.enabled = true
	camera.position = Vector2(MAP_W, MAP_H) * TILE_SIZE * 0.5
	camera.zoom = Vector2.ONE
	add_child(camera)


func _build_ui() -> void:
	canvas_layer = CanvasLayer.new()
	add_child(canvas_layer)

	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	canvas_layer.add_child(root)

	var top_panel := PanelContainer.new()
	top_panel.anchor_left = 0.0
	top_panel.anchor_right = 1.0
	top_panel.anchor_top = 0.0
	top_panel.anchor_bottom = 0.0
	top_panel.offset_left = 8
	top_panel.offset_right = -8
	top_panel.offset_top = 8
	top_panel.offset_bottom = 94
	top_panel.mouse_filter = Control.MOUSE_FILTER_STOP
	root.add_child(top_panel)

	var top_box := VBoxContainer.new()
	top_box.add_theme_constant_override("separation", 6)
	top_panel.add_child(top_box)

	hud_label = Label.new()
	hud_label.add_theme_font_size_override("font_size", 16)
	hud_label.add_theme_color_override("font_color", Color(0.95, 0.98, 1.0))
	hud_label.autowrap_mode = TextServer.AUTOWRAP_OFF
	top_box.add_child(hud_label)

	var toolbar_scroll := ScrollContainer.new()
	toolbar_scroll.custom_minimum_size = Vector2(0, 40)
	toolbar_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	toolbar_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	top_box.add_child(toolbar_scroll)

	var toolbar := HBoxContainer.new()
	toolbar.add_theme_constant_override("separation", 6)
	toolbar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	toolbar_scroll.add_child(toolbar)

	_create_mode_button(toolbar, "ROAD 10", BuildMode.PATH)
	_create_mode_button(toolbar, "RIDE 700", BuildMode.RIDE)
	_create_mode_button(toolbar, "SHOP 220", BuildMode.SHOP)
	_create_mode_button(toolbar, "CARE 140", BuildMode.FACILITY)
	_create_mode_button(toolbar, "REST 60", BuildMode.BENCH)
	_create_mode_button(toolbar, "CLEAR", BuildMode.BULLDOZE)

	var janitor_button := Button.new()
	janitor_button.text = "JANITOR +"
	janitor_button.custom_minimum_size = Vector2(108, 34)
	janitor_button.pressed.connect(_on_hire_janitor)
	toolbar.add_child(janitor_button)

	pause_button = Button.new()
	pause_button.text = "PAUSE OFF"
	pause_button.custom_minimum_size = Vector2(100, 34)
	pause_button.pressed.connect(_toggle_pause)
	toolbar.add_child(pause_button)

	speed_button = Button.new()
	speed_button.text = "SPEED 1x"
	speed_button.custom_minimum_size = Vector2(96, 34)
	speed_button.pressed.connect(_cycle_speed)
	toolbar.add_child(speed_button)

	var save_button := Button.new()
	save_button.text = "SAVE"
	save_button.custom_minimum_size = Vector2(70, 34)
	save_button.pressed.connect(_save_game)
	toolbar.add_child(save_button)

	var load_button := Button.new()
	load_button.text = "LOAD"
	load_button.custom_minimum_size = Vector2(70, 34)
	load_button.pressed.connect(_load_game)
	toolbar.add_child(load_button)

	var zoom_in := Button.new()
	zoom_in.text = "+"
	zoom_in.custom_minimum_size = Vector2(40, 34)
	zoom_in.pressed.connect(func() -> void: _change_zoom(-ZOOM_STEP))
	toolbar.add_child(zoom_in)

	var zoom_out := Button.new()
	zoom_out.text = "-"
	zoom_out.custom_minimum_size = Vector2(40, 34)
	zoom_out.pressed.connect(func() -> void: _change_zoom(ZOOM_STEP))
	toolbar.add_child(zoom_out)

	var side_panel := PanelContainer.new()
	side_panel.anchor_left = 1.0
	side_panel.anchor_right = 1.0
	side_panel.anchor_top = 0.0
	side_panel.anchor_bottom = 0.0
	side_panel.offset_left = -320
	side_panel.offset_right = -8
	side_panel.offset_top = 104
	side_panel.offset_bottom = 252
	side_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(side_panel)

	var side_box := VBoxContainer.new()
	side_box.add_theme_constant_override("separation", 5)
	side_panel.add_child(side_box)

	objective_label = Label.new()
	objective_label.add_theme_font_size_override("font_size", 15)
	objective_label.add_theme_color_override("font_color", Color(1.0, 0.94, 0.75))
	side_box.add_child(objective_label)

	side_label = Label.new()
	side_label.add_theme_font_size_override("font_size", 14)
	side_label.add_theme_color_override("font_color", Color(0.86, 0.93, 1.0))
	side_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	side_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	side_label.size_flags_vertical = Control.SIZE_EXPAND_FILL
	side_box.add_child(side_label)

	status_label = Label.new()
	status_label.anchor_left = 0.5
	status_label.anchor_right = 0.5
	status_label.anchor_top = 1.0
	status_label.anchor_bottom = 1.0
	status_label.offset_left = -280
	status_label.offset_right = 280
	status_label.offset_top = -44
	status_label.offset_bottom = -12
	status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	status_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	status_label.add_theme_font_size_override("font_size", 16)
	status_label.add_theme_color_override("font_color", Color(1.0, 0.92, 0.7))
	status_label.text = ""
	root.add_child(status_label)


func _create_mode_button(parent: HBoxContainer, label: String, mode: int) -> void:
	var b := Button.new()
	b.text = label
	b.custom_minimum_size = Vector2(106, 34)
	b.pressed.connect(_on_mode_button_pressed.bind(mode))
	parent.add_child(b)
	mode_buttons[mode] = b


func _on_mode_button_pressed(mode: int) -> void:
	_set_mode(mode)


func _set_mode(mode: int) -> void:
	build_mode = mode
	_set_status("Mode: %s" % MODE_LABELS.get(mode, "UNKNOWN"), 1.1)
	_refresh_mode_button_visuals(-1)


func _refresh_mode_button_visuals(recommended_mode: int) -> void:
	for key in mode_buttons.keys():
		var button := mode_buttons[key] as Button
		if button == null:
			continue
		var mode := int(key)
		if mode == build_mode:
			button.modulate = Color(1.0, 0.92, 0.6, 1.0)
		elif mode == recommended_mode:
			var pulse := 0.72 + 0.28 * sin(ui_pulse * 5.4)
			button.modulate = Color(0.68 + 0.22 * pulse, 0.93, 0.62 + 0.25 * pulse, 1.0)
		else:
			button.modulate = Color(1, 1, 1, 1)


func _toggle_pause() -> void:
	game_paused = not game_paused
	pause_button.text = "PAUSE ON" if game_paused else "PAUSE OFF"
	_set_status("Simulation paused" if game_paused else "Simulation resumed", 1.1)


func _cycle_speed() -> void:
	speed_index = (speed_index + 1) % SPEED_VALUES.size()
	speed_button.text = "SPEED %sx" % str(SPEED_VALUES[speed_index])
	_set_status("Speed x%s" % str(SPEED_VALUES[speed_index]), 1.0)


func _on_hire_janitor() -> void:
	if money < JANITOR_MONTHLY_COST:
		_set_status("Not enough money for janitor.", 1.2)
		return
	money -= JANITOR_MONTHLY_COST
	monthly_cost += JANITOR_MONTHLY_COST
	janitors += 1
	_set_status("Janitor hired (%d)." % janitors, 1.2)


func _process(delta: float) -> void:
	ui_pulse += delta

	if status_timer > 0.0:
		status_timer = maxf(0.0, status_timer - delta)
		if status_timer == 0.0:
			status_text = ""

	if not game_paused:
		var dt: float = delta * float(SPEED_VALUES[speed_index])
		_update_events(dt)
		_update_month_cycle(dt)
		_update_guest_spawning(dt)
		_update_guests(dt)
		if janitors > 0:
			litter = maxf(0.0, litter - float(janitors) * dt * 0.75)

	_cleanup_guests()
	_clamp_camera_to_map()
	_update_ui()
	queue_redraw()


func _update_events(dt: float) -> void:
	if active_event != "":
		active_event_timer -= dt
		if active_event_timer <= 0.0:
			active_event = ""
			ride_fee_multiplier = 1.0
			spawn_multiplier = 1.0
			_set_status("Event finished.", 1.0)
		return

	event_cooldown -= dt
	if event_cooldown > 0.0:
		return

	event_cooldown = rng.randf_range(42.0, 78.0)
	var roll := rng.randi_range(0, 2)
	if roll == 0:
		active_event = "RAIN"
		active_event_timer = 22.0
		ride_fee_multiplier = 0.75
		_set_status("Rain event: ride demand down.", 1.6)
	elif roll == 1:
		active_event = "PROMOTION"
		active_event_timer = 18.0
		spawn_multiplier = 1.8
		_set_status("Promotion event: guest influx up.", 1.6)
	else:
		active_event = "INSPECTION"
		active_event_timer = 14.0
		litter += 30.0
		complaints += 5
		_set_status("Inspection event: cleanliness penalty.", 1.6)


func _update_month_cycle(dt: float) -> void:
	month_timer += dt
	if month_timer < MONTH_DURATION:
		return

	month_timer -= MONTH_DURATION
	month += 1
	var salary := janitors * JANITOR_MONTHLY_COST
	money -= salary
	monthly_cost += salary

	if money < 0:
		var interest := int(ceil(absf(float(money)) * 0.03))
		money -= interest
		monthly_cost += interest
		_set_status("Debt interest charged.", 1.4)

	monthly_income = 0
	monthly_cost = 0


func _update_guest_spawning(dt: float) -> void:
	var dynamic_max := mini(900, BASE_MAX_GUESTS + ride_cells.size() * 6 + shop_cells.size() * 3)
	if guests.size() >= dynamic_max:
		return

	var spawn_interval := clampf(1.25 - float(ride_cells.size()) * 0.025, 0.25, 1.25)
	spawn_interval /= spawn_multiplier

	spawn_timer += dt
	while spawn_timer >= spawn_interval and guests.size() < dynamic_max:
		spawn_timer -= spawn_interval
		_spawn_guest()


func _spawn_guest() -> void:
	var start := _cell_center(entrance_cell)
	var guest := {
		"id": guest_seq,
		"pos": start + Vector2(rng.randf_range(-2.5, 2.5), rng.randf_range(-2.5, 2.5)),
		"cell": entrance_cell,
		"path": [],
		"target": Vector2i(-1, -1),
		"state": "think",
		"wait": 0.0,
		"speed": rng.randf_range(GUEST_SPEED_MIN, GUEST_SPEED_MAX),
		"happiness": rng.randf_range(56.0, 85.0),
		"hunger": rng.randf_range(6.0, 28.0),
		"nausea": rng.randf_range(0.0, 10.0),
		"wallet": rng.randi_range(30, 130),
		"think_cd": rng.randf_range(0.4, 1.3),
		"time_in_park": 0.0,
		"remove": false,
	}
	guest_seq += 1
	guests.append(guest)

	money += TICKET_PRICE
	monthly_income += TICKET_PRICE
	total_profit += TICKET_PRICE


func _update_guests(dt: float) -> void:
	for i in range(guests.size()):
		var g := guests[i]

		g["time_in_park"] = float(g["time_in_park"]) + dt
		g["hunger"] = clampf(float(g["hunger"]) + dt * 1.75, 0.0, 100.0)

		var nausea_gain := dt * (0.18 if String(g["state"]) == "ride" else 0.06)
		g["nausea"] = clampf(float(g["nausea"]) + nausea_gain, 0.0, 100.0)

		var happiness_drain := 0.0
		if float(g["hunger"]) > 65.0:
			happiness_drain += dt * 1.5
		if float(g["nausea"]) > 60.0:
			happiness_drain += dt * 1.4
		if litter > 40.0:
			happiness_drain += dt * (litter / 160.0)
		g["happiness"] = clampf(float(g["happiness"]) - happiness_drain, 0.0, 100.0)

		if String(g["state"]) == "wait":
			g["wait"] = float(g["wait"]) - dt
			if float(g["wait"]) <= 0.0:
				g["state"] = "think"
		else:
			g["think_cd"] = float(g["think_cd"]) - dt
			if (g["path"] as Array).is_empty() and float(g["think_cd"]) <= 0.0:
				_plan_guest_path(g)
			_move_guest_along_path(g, dt)

		if float(g["happiness"]) <= 4.0:
			g["remove"] = true
			complaints += 1
		elif float(g["time_in_park"]) > 200.0:
			g["remove"] = true
		elif int(g["wallet"]) <= 0 and float(g["time_in_park"]) > 60.0:
			g["remove"] = true

		guests[i] = g


func _plan_guest_path(g: Dictionary) -> void:
	var start := g["cell"] as Vector2i
	var target := _choose_guest_target(g)
	var path := _find_path(start, target)

	if path.is_empty() and path_cells.size() > 0:
		for n in range(2):
			target = path_cells[rng.randi_range(0, path_cells.size() - 1)]
			path = _find_path(start, target)
			if not path.is_empty():
				break

	if path.size() > 1:
		path.remove_at(0)
		g["path"] = path
		g["target"] = target
		g["state"] = "move"
		g["think_cd"] = rng.randf_range(1.6, 3.0)
	else:
		var fallback := _random_walk_step(start)
		if fallback != start:
			g["path"] = [fallback]
			g["state"] = "move"
		g["think_cd"] = rng.randf_range(0.7, 1.4)


func _choose_guest_target(g: Dictionary) -> Vector2i:
	var start := g["cell"] as Vector2i
	var hunger := float(g["hunger"])
	var nausea := float(g["nausea"])
	var happiness := float(g["happiness"])

	if hunger > 62.0 and not shop_cells.is_empty():
		return _pick_target_by_distance(start, shop_cells)

	if nausea > 58.0 and (not facility_cells.is_empty() or not bench_cells.is_empty()):
		if not facility_cells.is_empty() and (bench_cells.is_empty() or rng.randf() < 0.7):
			return _pick_target_by_distance(start, facility_cells)
		return _pick_target_by_distance(start, bench_cells)

	if not ride_cells.is_empty() and (happiness < 76.0 or rng.randf() < 0.72):
		return _pick_target_by_distance(start, ride_cells)

	if not path_cells.is_empty():
		return path_cells[rng.randi_range(0, path_cells.size() - 1)]

	return entrance_cell


func _pick_target_by_distance(start: Vector2i, candidates: Array[Vector2i]) -> Vector2i:
	if candidates.is_empty():
		return start

	var best: Vector2i = candidates[0]
	var best_score: float = INF
	var tries := mini(12, candidates.size())
	for i in range(tries):
		var c: Vector2i = candidates[rng.randi_range(0, candidates.size() - 1)]
		var dx: int = absi(start.x - c.x)
		var dy: int = absi(start.y - c.y)
		var score := float(dx + dy) + rng.randf_range(0.0, 3.2)
		if score < best_score:
			best_score = score
			best = c
	return best


func _move_guest_along_path(g: Dictionary, dt: float) -> void:
	var path := g["path"] as Array
	if path.is_empty():
		return

	var next_cell := path[0] as Vector2i
	var next_pos := _cell_center(next_cell)
	var pos := g["pos"] as Vector2
	var to_next := next_pos - pos
	var dist := to_next.length()
	var step := float(g["speed"]) * dt

	if dist <= step or dist <= 0.001:
		pos = next_pos
		g["cell"] = next_cell
		path.remove_at(0)
		g["path"] = path
		_apply_tile_interaction(g)
	else:
		pos += to_next.normalized() * step

	g["pos"] = pos


func _apply_tile_interaction(g: Dictionary) -> void:
	var cell := g["cell"] as Vector2i
	var tile := _get_tile(cell)

	if tile == Tile.RIDE and int(g["wallet"]) >= _current_ride_fee():
		var fee := _current_ride_fee()
		g["wallet"] = int(g["wallet"]) - fee
		money += fee
		monthly_income += fee
		total_profit += fee
		g["happiness"] = clampf(float(g["happiness"]) + 13.0, 0.0, 100.0)
		g["nausea"] = clampf(float(g["nausea"]) + 15.0, 0.0, 100.0)
		g["state"] = "wait"
		g["wait"] = 2.4
		if rng.randf() < 0.16:
			litter += 1.0
		return

	if tile == Tile.SHOP and int(g["wallet"]) >= SHOP_FEE and float(g["hunger"]) > 20.0:
		g["wallet"] = int(g["wallet"]) - SHOP_FEE
		money += SHOP_FEE
		monthly_income += SHOP_FEE
		total_profit += SHOP_FEE
		g["hunger"] = maxf(0.0, float(g["hunger"]) - 58.0)
		g["happiness"] = clampf(float(g["happiness"]) + 9.0, 0.0, 100.0)
		g["state"] = "wait"
		g["wait"] = 1.35
		if rng.randf() < 0.1:
			litter += 1.0
		return

	if tile == Tile.FACILITY:
		g["nausea"] = maxf(0.0, float(g["nausea"]) - 34.0)
		g["happiness"] = clampf(float(g["happiness"]) + 4.0, 0.0, 100.0)
		g["state"] = "wait"
		g["wait"] = 1.2
		return

	if tile == Tile.BENCH:
		g["nausea"] = maxf(0.0, float(g["nausea"]) - 10.0)
		g["happiness"] = clampf(float(g["happiness"]) + 3.5, 0.0, 100.0)
		g["state"] = "wait"
		g["wait"] = 0.9
		return

	if tile == Tile.ENTRANCE and float(g["time_in_park"]) > 45.0 and (float(g["happiness"]) < 30.0 or int(g["wallet"]) <= 0):
		g["remove"] = true


func _current_ride_fee() -> int:
	return maxi(4, int(round(RIDE_FEE_BASE * ride_fee_multiplier)))


func _random_walk_step(cell: Vector2i) -> Vector2i:
	var options: Array[Vector2i] = []
	for n in _neighbors4(cell):
		if _in_bounds(n) and _is_guest_walkable_cell(n):
			options.append(n)
	if options.is_empty():
		return cell
	return options[rng.randi_range(0, options.size() - 1)]


func _cleanup_guests() -> void:
	for i in range(guests.size() - 1, -1, -1):
		if bool(guests[i].get("remove", false)):
			guests.remove_at(i)


func _find_path(start: Vector2i, goal: Vector2i) -> Array[Vector2i]:
	if not _in_bounds(start) or not _in_bounds(goal):
		return []
	if start == goal:
		return [start]

	var total := MAP_W * MAP_H
	var visited := PackedByteArray()
	visited.resize(total)
	visited.fill(0)

	var came := PackedInt32Array()
	came.resize(total)
	came.fill(-1)

	var q: Array[Vector2i] = [start]
	var qi := 0
	visited[_idx(start)] = 1

	var found := false
	while qi < q.size():
		var c := q[qi] as Vector2i
		qi += 1

		if c == goal:
			found = true
			break

		for n in _neighbors4(c):
			if not _in_bounds(n):
				continue
			var ni := _idx(n)
			if visited[ni] == 1:
				continue
			if not _is_guest_walkable_cell(n):
				continue
			visited[ni] = 1
			came[ni] = _idx(c)
			q.append(n)

	if not found:
		return []

	var path: Array[Vector2i] = []
	var cur := _idx(goal)
	var start_idx := _idx(start)
	while cur != -1:
		path.append(_idx_to_cell(cur))
		if cur == start_idx:
			break
		cur = came[cur]

	path.reverse()
	return path


func _neighbors4(cell: Vector2i) -> Array[Vector2i]:
	return [
		Vector2i(cell.x + 1, cell.y),
		Vector2i(cell.x - 1, cell.y),
		Vector2i(cell.x, cell.y + 1),
		Vector2i(cell.x, cell.y - 1),
	]


func _is_guest_walkable_cell(cell: Vector2i) -> bool:
	var t := _get_tile(cell)
	return t == Tile.PATH or t == Tile.RIDE or t == Tile.SHOP or t == Tile.FACILITY or t == Tile.BENCH or t == Tile.ENTRANCE


func _build_at_world(world_pos: Vector2) -> void:
	var cell := _world_to_cell(world_pos)
	if not _in_bounds(cell):
		return

	var success := false
	if build_mode == BuildMode.PATH:
		success = _place_path(cell)
	elif build_mode == BuildMode.RIDE:
		success = _place_building(cell, Tile.RIDE, COST_RIDE, true)
	elif build_mode == BuildMode.SHOP:
		success = _place_building(cell, Tile.SHOP, COST_SHOP, true)
	elif build_mode == BuildMode.FACILITY:
		success = _place_building(cell, Tile.FACILITY, COST_FACILITY, true)
	elif build_mode == BuildMode.BENCH:
		success = _place_building(cell, Tile.BENCH, COST_BENCH, true)
	elif build_mode == BuildMode.BULLDOZE:
		success = _bulldoze(cell)

	if success:
		_rebuild_feature_lists()
		queue_redraw()


func _place_path(cell: Vector2i) -> bool:
	if cell == entrance_cell:
		return false

	var t := _get_tile(cell)
	if t != Tile.GRASS:
		_set_status("Path can be placed on grass only.", 1.0)
		return false

	if money < COST_PATH:
		_set_status("Not enough money.", 1.0)
		return false

	money -= COST_PATH
	monthly_cost += COST_PATH
	_set_tile(cell, Tile.PATH)
	return true


func _place_building(cell: Vector2i, tile_type: int, cost: int, require_adjacent_path: bool) -> bool:
	if cell == entrance_cell:
		return false

	if _get_tile(cell) != Tile.GRASS:
		_set_status("Build on grass tile.", 1.0)
		return false

	if require_adjacent_path and not _has_adjacent_walkway(cell):
		_set_status("Building needs path connection.", 1.0)
		return false

	if cost > 0 and money < cost:
		_set_status("Not enough money.", 1.0)
		return false

	if cost > 0:
		money -= cost
		monthly_cost += cost

	_set_tile(cell, tile_type)
	return true


func _bulldoze(cell: Vector2i) -> bool:
	if cell == entrance_cell:
		return false

	var t := _get_tile(cell)
	if t == Tile.GRASS or t == Tile.WATER:
		return false

	var refund := int(round(_build_value_of_tile(t) * 0.4))
	if refund > 0:
		money += refund
		monthly_income += refund
	_set_tile(cell, Tile.GRASS)
	_set_status("Bulldozed (+$%d)." % refund, 0.9)
	return true


func _build_value_of_tile(tile: int) -> int:
	match tile:
		Tile.PATH:
			return COST_PATH
		Tile.RIDE:
			return COST_RIDE
		Tile.SHOP:
			return COST_SHOP
		Tile.FACILITY:
			return COST_FACILITY
		Tile.BENCH:
			return COST_BENCH
		_:
			return 0


func _has_adjacent_walkway(cell: Vector2i) -> bool:
	for n in _neighbors4(cell):
		if not _in_bounds(n):
			continue
		var t := _get_tile(n)
		if t == Tile.PATH or t == Tile.ENTRANCE:
			return true
	return false


func _rebuild_feature_lists() -> void:
	ride_cells.clear()
	shop_cells.clear()
	facility_cells.clear()
	bench_cells.clear()
	path_cells.clear()

	for y in range(MAP_H):
		for x in range(MAP_W):
			var cell := Vector2i(x, y)
			var t := _get_tile(cell)
			if t == Tile.RIDE:
				ride_cells.append(cell)
			elif t == Tile.SHOP:
				shop_cells.append(cell)
			elif t == Tile.FACILITY:
				facility_cells.append(cell)
			elif t == Tile.BENCH:
				bench_cells.append(cell)
			elif t == Tile.PATH or t == Tile.ENTRANCE:
				path_cells.append(cell)


func _suggested_mode(avg_happiness: float) -> int:
	if path_cells.size() < 34 and money >= COST_PATH:
		return BuildMode.PATH
	if ride_cells.size() < 3 and money >= COST_RIDE:
		return BuildMode.RIDE
	if shop_cells.size() < 2 and money >= COST_SHOP:
		return BuildMode.SHOP
	if janitors == 0 and litter >= 25.0 and money >= JANITOR_MONTHLY_COST:
		return -2
	if (avg_happiness < 58.0 or complaints > 8) and money >= COST_BENCH:
		return BuildMode.BENCH
	if money >= COST_RIDE:
		return BuildMode.RIDE
	if money >= COST_PATH:
		return BuildMode.PATH
	return -1


func _suggested_action_text(suggested_mode: int) -> String:
	match suggested_mode:
		BuildMode.PATH:
			return "NEXT ROAD"
		BuildMode.RIDE:
			return "NEXT RIDE"
		BuildMode.SHOP:
			return "NEXT SHOP"
		BuildMode.FACILITY:
			return "NEXT CARE"
		BuildMode.BENCH:
			return "NEXT REST"
		-2:
			return "NEXT JANITOR"
		_:
			return "NEXT WAIT"


func _recommended_build_cell(mode: int) -> Vector2i:
	if mode < 0:
		return Vector2i(-1, -1)
	for r in range(2, 22):
		for dy in range(-r, r + 1):
			for dx in range(-r, r + 1):
				var cell := Vector2i(entrance_cell.x + dx, entrance_cell.y - 11 + dy)
				if not _in_bounds(cell):
					continue
				if _can_build_on_cell(cell, mode):
					return cell
	return Vector2i(-1, -1)


func _can_build_on_cell(cell: Vector2i, mode: int) -> bool:
	if not _in_bounds(cell):
		return false
	if cell == entrance_cell:
		return false

	match mode:
		BuildMode.PATH:
			return _get_tile(cell) == Tile.GRASS and money >= COST_PATH
		BuildMode.RIDE:
			return _get_tile(cell) == Tile.GRASS and _has_adjacent_walkway(cell) and money >= COST_RIDE
		BuildMode.SHOP:
			return _get_tile(cell) == Tile.GRASS and _has_adjacent_walkway(cell) and money >= COST_SHOP
		BuildMode.FACILITY:
			return _get_tile(cell) == Tile.GRASS and _has_adjacent_walkway(cell) and money >= COST_FACILITY
		BuildMode.BENCH:
			return _get_tile(cell) == Tile.GRASS and _has_adjacent_walkway(cell) and money >= COST_BENCH
		BuildMode.BULLDOZE:
			var t := _get_tile(cell)
			return t != Tile.GRASS and t != Tile.WATER and t != Tile.ENTRANCE
		_:
			return false


func _update_ui() -> void:
	if hud_label == null or side_label == null:
		return

	var avg_happiness := 0.0
	if not guests.is_empty():
		for g in guests:
			avg_happiness += float(g["happiness"])
		avg_happiness /= float(guests.size())
	var clean_score := clampf(100.0 - litter * 1.6, 0.0, 100.0)
	var goal_guest := 220
	var goal_money := 10000
	var suggested_mode := _suggested_mode(avg_happiness)
	var action_text := _suggested_action_text(suggested_mode)
	_refresh_mode_button_visuals(suggested_mode)

	var top_line := "$%d  Guests %d  Month %d  Speed x%s" % [money, guests.size(), month, str(SPEED_VALUES[speed_index])]
	var sub_line := "Mode %s  Ride %d  Shop %d  Staff %d" % [MODE_LABELS.get(build_mode, "-"), ride_cells.size(), shop_cells.size(), janitors]
	hud_label.text = "%s\n%s" % [top_line, sub_line]

	var guest_progress := "%d/%d" % [mini(guests.size(), goal_guest), goal_guest]
	var money_progress := "%d/%d" % [mini(money, goal_money), goal_money]
	var event_text := "%s %.0fs" % [active_event, active_event_timer] if active_event != "" else "NONE"
	objective_label.text = "GOAL  G:%s  $:%s" % [guest_progress, money_progress]
	side_label.text = "NEXT  %s\nMood %.0f  Clean %.0f\nEvent %s\nProfit %d" % [action_text, avg_happiness, clean_score, event_text, total_profit]

	status_label.text = status_text


func _set_status(text: String, ttl: float) -> void:
	status_text = text
	status_timer = ttl


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		var mb := event as InputEventMouseButton
		if mb.button_index == MOUSE_BUTTON_WHEEL_UP and mb.pressed:
			_change_zoom(-ZOOM_STEP)
			return
		if mb.button_index == MOUSE_BUTTON_WHEEL_DOWN and mb.pressed:
			_change_zoom(ZOOM_STEP)
			return

		if mb.button_index == MOUSE_BUTTON_RIGHT:
			mouse_pan = mb.pressed
			return

		if mb.button_index == MOUSE_BUTTON_LEFT and mb.pressed:
			if get_viewport().gui_get_hovered_control() != null:
				return
			_build_at_world(_screen_to_world(mb.position))
			return

	if event is InputEventMouseMotion:
		var mm := event as InputEventMouseMotion
		if mouse_pan:
			camera.position -= mm.relative * camera.zoom.x
			return

	if event is InputEventScreenTouch:
		var st := event as InputEventScreenTouch
		if st.pressed:
			touch_pan_id = st.index
			touch_pan_start = st.position
			touch_pan_moved = false
		else:
			if st.index == touch_pan_id:
				if not touch_pan_moved:
					_build_at_world(_screen_to_world(st.position))
				touch_pan_id = -1
				touch_pan_moved = false
		return

	if event is InputEventScreenDrag:
		var sd := event as InputEventScreenDrag
		if sd.index == touch_pan_id:
			if sd.position.distance_to(touch_pan_start) > 10.0:
				touch_pan_moved = true
			camera.position -= sd.relative * camera.zoom.x
		return

	if event is InputEventKey:
		var key_event := event as InputEventKey
		if not key_event.pressed or key_event.echo:
			return
		match key_event.physical_keycode:
			KEY_1:
				_set_mode(BuildMode.PATH)
			KEY_2:
				_set_mode(BuildMode.RIDE)
			KEY_3:
				_set_mode(BuildMode.SHOP)
			KEY_4:
				_set_mode(BuildMode.FACILITY)
			KEY_5:
				_set_mode(BuildMode.BENCH)
			KEY_6:
				_set_mode(BuildMode.BULLDOZE)
			KEY_P:
				_toggle_pause()
			KEY_F:
				_cycle_speed()
			KEY_EQUAL, KEY_KP_ADD:
				_change_zoom(-ZOOM_STEP)
			KEY_MINUS, KEY_KP_SUBTRACT:
				_change_zoom(ZOOM_STEP)
			KEY_S:
				_save_game()
			KEY_L:
				_load_game()


func _change_zoom(delta_zoom: float) -> void:
	var next := clampf(camera.zoom.x + delta_zoom, ZOOM_MIN, ZOOM_MAX)
	camera.zoom = Vector2.ONE * next
	_clamp_camera_to_map()


func _clamp_camera_to_map() -> void:
	if camera == null:
		return

	var vp := get_viewport_rect().size
	var half := vp * 0.5 * camera.zoom.x
	var map_size := Vector2(MAP_W * TILE_SIZE, MAP_H * TILE_SIZE)

	var min_x := half.x
	var max_x := map_size.x - half.x
	var min_y := half.y
	var max_y := map_size.y - half.y

	if min_x > max_x:
		camera.position.x = map_size.x * 0.5
	else:
		camera.position.x = clampf(camera.position.x, min_x, max_x)

	if min_y > max_y:
		camera.position.y = map_size.y * 0.5
	else:
		camera.position.y = clampf(camera.position.y, min_y, max_y)


func _draw() -> void:
	if camera == null:
		return

	var vp := get_viewport_rect().size
	var half := vp * 0.5 * camera.zoom.x
	var cam_pos := camera.position

	var min_cell_x := maxi(0, int(floor((cam_pos.x - half.x) / TILE_SIZE)) - 1)
	var max_cell_x := mini(MAP_W - 1, int(ceil((cam_pos.x + half.x) / TILE_SIZE)) + 1)
	var min_cell_y := maxi(0, int(floor((cam_pos.y - half.y) / TILE_SIZE)) - 1)
	var max_cell_y := mini(MAP_H - 1, int(ceil((cam_pos.y + half.y) / TILE_SIZE)) + 1)

	for y in range(min_cell_y, max_cell_y + 1):
		for x in range(min_cell_x, max_cell_x + 1):
			var cell := Vector2i(x, y)
			var tile := _get_tile(cell)
			var rect := Rect2(float(x) * TILE_SIZE, float(y) * TILE_SIZE, TILE_SIZE, TILE_SIZE)
			var col := _tile_color(tile)
			draw_rect(rect, col, true)

			if tile == Tile.PATH or tile == Tile.ENTRANCE:
				draw_line(rect.position + Vector2(2, TILE_SIZE * 0.5), rect.position + Vector2(TILE_SIZE - 2, TILE_SIZE * 0.5), Color(0.95, 0.92, 0.72, 0.42), 2.0)
			elif tile == Tile.RIDE:
				draw_circle(rect.position + rect.size * 0.5, TILE_SIZE * 0.28, Color(1.0, 0.72, 0.42, 0.9))
				draw_circle(rect.position + rect.size * 0.5, TILE_SIZE * 0.12, Color(0.09, 0.11, 0.18, 0.8))
			elif tile == Tile.SHOP:
				draw_rect(rect.grow(-4.0), Color(0.95, 0.57, 0.44, 0.9), true)
				draw_rect(Rect2(rect.position.x + 3.0, rect.position.y + 3.0, TILE_SIZE - 6.0, 4.0), Color(0.98, 0.88, 0.7, 0.85), true)
			elif tile == Tile.FACILITY:
				draw_rect(rect.grow(-4.0), Color(0.58, 0.82, 1.0, 0.88), true)
				draw_circle(rect.position + rect.size * 0.5, TILE_SIZE * 0.12, Color(0.08, 0.17, 0.24, 0.85))
			elif tile == Tile.BENCH:
				draw_line(rect.position + Vector2(4.0, TILE_SIZE * 0.65), rect.position + Vector2(TILE_SIZE - 4.0, TILE_SIZE * 0.65), Color(0.56, 0.34, 0.2, 0.95), 2.0)
				draw_line(rect.position + Vector2(4.0, TILE_SIZE * 0.72), rect.position + Vector2(TILE_SIZE - 4.0, TILE_SIZE * 0.72), Color(0.68, 0.45, 0.25, 0.95), 2.0)
			elif tile == Tile.ENTRANCE:
				draw_rect(rect.grow(-2.0), Color(0.99, 0.78, 0.38, 0.95), false, 2.5)

	if camera.zoom.x <= 1.0:
		for y in range(min_cell_y, max_cell_y + 1):
			var y_line := float(y) * TILE_SIZE
			draw_line(Vector2(float(min_cell_x) * TILE_SIZE, y_line), Vector2(float(max_cell_x + 1) * TILE_SIZE, y_line), Color(0.07, 0.1, 0.15, 0.18), 1.0)
		for x in range(min_cell_x, max_cell_x + 1):
			var x_line := float(x) * TILE_SIZE
			draw_line(Vector2(x_line, float(min_cell_y) * TILE_SIZE), Vector2(x_line, float(max_cell_y + 1) * TILE_SIZE), Color(0.07, 0.1, 0.15, 0.18), 1.0)

	for g in guests:
		var pos := g["pos"] as Vector2
		if pos.x < (cam_pos.x - half.x - 24.0) or pos.x > (cam_pos.x + half.x + 24.0):
			continue
		if pos.y < (cam_pos.y - half.y - 24.0) or pos.y > (cam_pos.y + half.y + 24.0):
			continue
		var happy := float(g["happiness"])
		var nausea := float(g["nausea"])
		var gcol := Color(0.49, 0.9, 0.62, 0.95) if happy >= 55.0 else Color(1.0, 0.73, 0.35, 0.95)
		if happy < 28.0:
			gcol = Color(1.0, 0.42, 0.42, 0.95)
		draw_circle(pos, 3.5, gcol)
		if nausea > 70.0:
			draw_circle(pos + Vector2(0.0, -5.0), 1.4, Color(0.74, 0.52, 1.0, 0.95))

	var draw_avg_happiness := 72.0
	if not guests.is_empty():
		draw_avg_happiness = 0.0
		for g in guests:
			draw_avg_happiness += float(g["happiness"])
		draw_avg_happiness /= float(guests.size())
	var rec_mode := _suggested_mode(draw_avg_happiness)
	var rec_cell := _recommended_build_cell(rec_mode)
	if _in_bounds(rec_cell):
		var rc := _cell_center(rec_cell)
		var rr := TILE_SIZE * (0.34 + 0.09 * (0.5 + 0.5 * sin(ui_pulse * 6.0)))
		draw_arc(rc, rr, 0.0, TAU, 32, Color(0.98, 0.95, 0.55, 0.92), 2.2)
		draw_circle(rc, 1.8, Color(1.0, 0.96, 0.62, 0.9))

	var mouse_world := _screen_to_world(get_viewport().get_mouse_position())
	var hover := _world_to_cell(mouse_world)
	if _in_bounds(hover):
		var hrect := Rect2(float(hover.x) * TILE_SIZE, float(hover.y) * TILE_SIZE, TILE_SIZE, TILE_SIZE)
		var can_build := _can_build_on_cell(hover, build_mode)
		var frame_col := Color(0.66, 0.98, 0.74, 0.9) if can_build else Color(1.0, 0.44, 0.42, 0.9)
		draw_rect(hrect, frame_col * Color(1, 1, 1, 0.13), true)
		draw_rect(hrect, frame_col, false, 1.8)
		if build_mode != BuildMode.BULLDOZE:
			_draw_mode_ghost(hrect, build_mode, frame_col)
		elif can_build:
			draw_line(hrect.position + Vector2(3, 3), hrect.position + Vector2(TILE_SIZE - 3, TILE_SIZE - 3), frame_col, 2.0)
			draw_line(hrect.position + Vector2(TILE_SIZE - 3, 3), hrect.position + Vector2(3, TILE_SIZE - 3), frame_col, 2.0)
		if not can_build:
			draw_line(hrect.position + Vector2(2, 2), hrect.position + Vector2(TILE_SIZE - 2, TILE_SIZE - 2), Color(1.0, 0.35, 0.35, 0.86), 1.8)
			draw_line(hrect.position + Vector2(TILE_SIZE - 2, 2), hrect.position + Vector2(2, TILE_SIZE - 2), Color(1.0, 0.35, 0.35, 0.86), 1.8)


func _draw_mode_ghost(rect: Rect2, mode: int, col: Color) -> void:
	var alpha_col := col * Color(1, 1, 1, 0.85)
	match mode:
		BuildMode.PATH:
			draw_line(rect.position + Vector2(2, TILE_SIZE * 0.5), rect.position + Vector2(TILE_SIZE - 2, TILE_SIZE * 0.5), alpha_col, 2.3)
		BuildMode.RIDE:
			draw_circle(rect.position + rect.size * 0.5, TILE_SIZE * 0.28, alpha_col)
		BuildMode.SHOP:
			draw_rect(rect.grow(-4.0), alpha_col, true)
		BuildMode.FACILITY:
			draw_rect(rect.grow(-4.0), alpha_col, true)
			draw_circle(rect.position + rect.size * 0.5, TILE_SIZE * 0.12, Color(0.08, 0.17, 0.24, 0.92))
		BuildMode.BENCH:
			draw_line(rect.position + Vector2(4.0, TILE_SIZE * 0.65), rect.position + Vector2(TILE_SIZE - 4.0, TILE_SIZE * 0.65), alpha_col, 2.1)
			draw_line(rect.position + Vector2(4.0, TILE_SIZE * 0.72), rect.position + Vector2(TILE_SIZE - 4.0, TILE_SIZE * 0.72), alpha_col, 2.1)


func _tile_color(tile: int) -> Color:
	match tile:
		Tile.GRASS:
			return Color(0.17, 0.43, 0.24, 1.0)
		Tile.PATH:
			return Color(0.62, 0.56, 0.46, 1.0)
		Tile.WATER:
			return Color(0.14, 0.34, 0.57, 1.0)
		Tile.TREE:
			return Color(0.13, 0.31, 0.18, 1.0)
		Tile.RIDE:
			return Color(0.44, 0.22, 0.19, 1.0)
		Tile.SHOP:
			return Color(0.55, 0.27, 0.24, 1.0)
		Tile.FACILITY:
			return Color(0.17, 0.34, 0.45, 1.0)
		Tile.BENCH:
			return Color(0.39, 0.28, 0.2, 1.0)
		Tile.ENTRANCE:
			return Color(0.42, 0.34, 0.18, 1.0)
		_:
			return Color(0.2, 0.2, 0.2, 1.0)


func _screen_to_world(screen_pos: Vector2) -> Vector2:
	return get_canvas_transform().affine_inverse() * screen_pos


func _world_to_cell(world: Vector2) -> Vector2i:
	return Vector2i(int(floor(world.x / TILE_SIZE)), int(floor(world.y / TILE_SIZE)))


func _cell_center(cell: Vector2i) -> Vector2:
	return Vector2((float(cell.x) + 0.5) * TILE_SIZE, (float(cell.y) + 0.5) * TILE_SIZE)


func _idx(cell: Vector2i) -> int:
	return cell.y * MAP_W + cell.x


func _idx_to_cell(i: int) -> Vector2i:
	return Vector2i(i % MAP_W, i / MAP_W)


func _in_bounds(cell: Vector2i) -> bool:
	return cell.x >= 0 and cell.x < MAP_W and cell.y >= 0 and cell.y < MAP_H


func _in_bounds_xy(x: int, y: int) -> bool:
	return x >= 0 and x < MAP_W and y >= 0 and y < MAP_H


func _get_tile(cell: Vector2i) -> int:
	return tiles[_idx(cell)]


func _get_tile_xy(x: int, y: int) -> int:
	return tiles[y * MAP_W + x]


func _set_tile(cell: Vector2i, tile: int) -> void:
	tiles[_idx(cell)] = tile


func _set_tile_xy(x: int, y: int, tile: int) -> void:
	tiles[y * MAP_W + x] = tile


func _save_game() -> void:
	var tile_list: Array[int] = []
	tile_list.resize(tiles.size())
	for i in range(tiles.size()):
		tile_list[i] = tiles[i]

	var data := {
		"money": money,
		"month": month,
		"month_timer": month_timer,
		"janitors": janitors,
		"litter": litter,
		"total_profit": total_profit,
		"monthly_income": monthly_income,
		"monthly_cost": monthly_cost,
		"speed_index": speed_index,
		"build_mode": build_mode,
		"guest_seq": guest_seq,
		"tiles": tile_list,
	}

	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file == null:
		_set_status("Save failed.", 1.0)
		return
	file.store_string(JSON.stringify(data))
	file.close()
	_set_status("Saved.", 1.0)


func _load_game() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		return

	var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if file == null:
		return
	var content := file.get_as_text()
	file.close()

	var parsed: Variant = JSON.parse_string(content)
	if typeof(parsed) != TYPE_DICTIONARY:
		return

	var data := parsed as Dictionary
	money = int(data.get("money", money))
	month = int(data.get("month", month))
	month_timer = float(data.get("month_timer", month_timer))
	janitors = int(data.get("janitors", janitors))
	litter = float(data.get("litter", litter))
	total_profit = int(data.get("total_profit", total_profit))
	monthly_income = int(data.get("monthly_income", monthly_income))
	monthly_cost = int(data.get("monthly_cost", monthly_cost))
	speed_index = clampi(int(data.get("speed_index", speed_index)), 0, SPEED_VALUES.size() - 1)
	build_mode = int(data.get("build_mode", build_mode))
	guest_seq = int(data.get("guest_seq", guest_seq))

	var saved_tiles: Variant = data.get("tiles", [])
	if saved_tiles is Array and (saved_tiles as Array).size() == MAP_W * MAP_H:
		for i in range(MAP_W * MAP_H):
			tiles[i] = int(saved_tiles[i])

	guests.clear()
	_rebuild_feature_lists()
	_set_mode(build_mode)
	speed_button.text = "SPEED %sx" % str(SPEED_VALUES[speed_index])
	_set_status("Loaded.", 1.0)
