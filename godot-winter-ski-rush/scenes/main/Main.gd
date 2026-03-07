extends Node2D

const SAVE_PATH := "user://winter_ski_rush.save"

const WORLD_WIDTH := 360.0
const WORLD_TOP := 120.0
const FINISH_Y := 5000.0

const BASE_CENTER_X := WORLD_WIDTH * 0.5
const BGM_PATH := "res://assets/audio/winter-ski-rush-pixabay-286213.mp3"
const BASE_GRAVITY := 290.0
const MIN_SPEED := 72.0
const MAX_SPEED := 300.0
const START_SPEED := 88.0

const DIFFICULTY_EASY := 0
const DIFFICULTY_NORMAL := 1

const CHECKPOINT_Y := [760.0, 1520.0, 2360.0, 3220.0, 4080.0]
const SHORTCUT_IDS := ["shortcut_left_1", "shortcut_right_2", "shortcut_left_3"]

var _track_points: Array[Vector2] = [
	Vector2(BASE_CENTER_X, WORLD_TOP),
	Vector2(196, 620),
	Vector2(150, 1140),
	Vector2(214, 1680),
	Vector2(166, 2240),
	Vector2(212, 2780),
	Vector2(148, 3380),
	Vector2(202, 4040),
	Vector2(172, 4680),
	Vector2(BASE_CENTER_X, FINISH_Y),
]

var rng := RandomNumberGenerator.new()

var player_pos := Vector2(BASE_CENTER_X, WORLD_TOP + 30.0)
var player_vel_x := 0.0
var forward_speed := START_SPEED

var is_airborne := false
var air_height := 0.0
var air_velocity := 0.0
var trick_spin := 0.0

var run_started := false
var run_finished := false
var crashed := false
var crash_timer := 0.0
var run_time := 0.0
var best_time := INF
var style_score := 0
var best_style := 0
var crash_count := 0
var no_crash_run := true
var challenge_target := 150.0

var current_difficulty := DIFFICULTY_EASY
var active_gravity := BASE_GRAVITY
var active_min_speed := MIN_SPEED
var active_max_speed := MAX_SPEED
var active_start_speed := START_SPEED
var active_jump_min_speed := 140.0
var active_jump_base_velocity := 235.0
var active_jump_speed_velocity_scale := 0.25
var active_crash_penalty := 1.3
var active_crash_keep_speed_ratio := 0.7
var active_offtrack_crash_dist := 106.0
var active_offtrack_crash_speed := 340.0
var active_main_track_width_scale := 1.0
var active_shortcut_width_scale := 1.0
var active_shortcut_speed_scale := 1.0
var active_obstacle_start_y := 340.0
var active_obstacle_gap_min := 140.0
var active_obstacle_gap_max := 220.0
var active_obstacle_cluster_chance := 0.06
var active_obstacle_radius_scale := 0.95

var checkpoints: Array[Dictionary] = []
var last_checkpoint := -1
var respawn_pos := Vector2(BASE_CENTER_X, WORLD_TOP + 30.0)
var shortcut_seen := {}

var obstacles: Array[Dictionary] = []
var ice_patches: Array[Rect2] = []
var snow_patches: Array[Rect2] = []

var touch_steer_active := false
var touch_steer_x := BASE_CENTER_X
var touch_left := false
var touch_right := false
var touch_brake := false
var touch_crouch := false
var touch_trick := false
var touch_jump_queued := false

var status_text := ""
var status_timer := 0.0

var camera: Camera2D
var canvas_layer: CanvasLayer
var hud_label: Label
var hint_label: Label
var guide_label: Label
var start_button: Button
var easy_button: Button
var normal_button: Button
var bgm_player: AudioStreamPlayer


func _ready() -> void:
	rng.seed = 20260307
	_load_records()
	_apply_difficulty_profile(false)
	_setup_audio()
	_build_ui()
	_refresh_difficulty_ui()
	_reset_run(false)
	set_physics_process(true)
	set_process(true)
	queue_redraw()


func _process(delta: float) -> void:
	if status_timer > 0.0:
		status_timer = max(0.0, status_timer - delta)
		if status_timer == 0.0:
			status_text = ""
	_update_ui_text()


func _physics_process(delta: float) -> void:
	_update_dynamic_obstacles(delta)

	if run_started:
		run_time += delta

	if crashed:
		crash_timer -= delta
		if crash_timer <= 0.0:
			_respawn()
		_update_camera(delta)
		queue_redraw()
		return

	if run_started and not run_finished:
		_simulate_player(delta)
		_check_checkpoints()
		_check_finish()

	_update_camera(delta)
	queue_redraw()


func _update_dynamic_obstacles(delta: float) -> void:
	for i in range(obstacles.size() - 1, -1, -1):
		var obs: Dictionary = obstacles[i]
		if String(obs.get("type", "")) != "debris":
			continue
		if not obs.has("ttl"):
			continue

		var ttl := float(obs.get("ttl", 0.0)) - delta
		if ttl <= 0.0:
			obstacles.remove_at(i)
			continue

		var pos: Vector2 = obs.get("pos", Vector2.ZERO)
		var vel: Vector2 = obs.get("vel", Vector2.ZERO)
		vel = vel.lerp(Vector2.ZERO, clampf(delta * 4.0, 0.0, 1.0))
		pos += vel * delta

		obs["ttl"] = ttl
		obs["pos"] = pos
		obs["vel"] = vel
		obstacles[i] = obs


func _simulate_player(delta: float) -> void:
	var steer_input := _read_steer_input()
	var brake_pressed := Input.is_action_pressed("brake") or touch_brake
	var crouch_pressed := Input.is_action_pressed("crouch") or touch_crouch
	var trick_pressed := Input.is_action_pressed("trick") or touch_trick

	if Input.is_action_just_pressed("jump") or touch_jump_queued:
		touch_jump_queued = false
		_try_jump()

	var surface := _surface_at(player_pos)
	if surface["on_track"] and String(surface["active_id"]).begins_with("shortcut"):
		var sid := String(surface["active_id"])
		if not shortcut_seen.get(sid, false):
			shortcut_seen[sid] = true
			_set_status("Shortcut found!", 1.2)
			style_score += 120

	var slope := _slope_at(player_pos.y)
	var friction := 0.11 if surface["on_track"] else 0.2
	if surface["on_ice"]:
		friction *= 0.7
	if surface["on_snow"]:
		friction *= 1.25

	var accel := active_gravity * slope - friction * forward_speed
	accel += forward_speed * float(surface["speed_bonus"]) * 0.12

	if crouch_pressed and not brake_pressed:
		accel += 20.0
	if brake_pressed:
		accel -= 240.0
	if not surface["on_track"]:
		accel -= min(150.0, float(surface["off_dist"]) * 1.5)

	forward_speed = clampf(forward_speed + accel * delta, active_min_speed, active_max_speed)
	if is_airborne:
		forward_speed = clampf(forward_speed - 36.0 * delta, active_min_speed, active_max_speed + 30.0)

	var steer_power := 165.0 if is_airborne else 300.0
	if surface["on_ice"]:
		steer_power *= 0.72
	if surface["on_snow"]:
		steer_power *= 0.9

	var target_vx := steer_input * steer_power
	if not surface["on_track"]:
		target_vx += sign(player_pos.x - _main_center_x(player_pos.y)) * 34.0

	player_vel_x = lerpf(player_vel_x, target_vx, 0.1 if is_airborne else 0.18)
	if brake_pressed:
		player_vel_x *= 0.92

	player_pos.x += player_vel_x * delta
	player_pos.x = clampf(player_pos.x, 24.0, WORLD_WIDTH - 24.0)
	player_pos.y += forward_speed * delta

	if is_airborne:
		air_velocity -= 980.0 * delta
		air_height = max(0.0, air_height + air_velocity * delta)
		if trick_pressed:
			var spin_dir: float = 1.0 if steer_input == 0.0 else float(sign(steer_input))
			trick_spin += (420.0 + forward_speed * 0.45) * delta * spin_dir
		if air_height <= 0.0:
			_land_from_jump()

	if not is_airborne:
		if not surface["on_track"] and float(surface["off_dist"]) > active_offtrack_crash_dist and forward_speed > active_offtrack_crash_speed:
			_trigger_crash(player_pos, "cliff")
			return

		for obs in obstacles:
			var pos: Vector2 = obs["pos"]
			if abs(pos.y - player_pos.y) > 52.0:
				continue
			var radius: float = obs["radius"]
			if player_pos.distance_to(pos) < radius + 10.0:
				_trigger_crash(pos, String(obs["type"]))
				return


func _check_checkpoints() -> void:
	for i in range(checkpoints.size()):
		if checkpoints[i]["passed"]:
			continue
		var cp_y: float = checkpoints[i]["y"]
		if player_pos.y >= cp_y:
			checkpoints[i]["passed"] = true
			last_checkpoint = i
			respawn_pos = Vector2(_main_center_x(cp_y + 12.0), cp_y + 20.0)
			style_score += 80
			_set_status("Checkpoint %d" % (i + 1), 0.9)


func _check_finish() -> void:
	if player_pos.y < FINISH_Y:
		return

	run_started = false
	run_finished = true
	_touch_reset()
	if run_time < best_time:
		best_time = run_time
	if style_score > best_style:
		best_style = style_score
	_save_records()

	var challenge_ok := no_crash_run and run_time <= challenge_target
	_set_status("Finish! %s" % _fmt_time(run_time), 2.4)
	if challenge_ok:
		_set_status("Perfect run + Challenge clear!", 2.8)


func _try_jump() -> void:
	if not run_started or run_finished or crashed:
		return
	if is_airborne:
		return
	if forward_speed < active_jump_min_speed:
		return

	is_airborne = true
	air_height = 2.0
	air_velocity = active_jump_base_velocity + forward_speed * active_jump_speed_velocity_scale
	trick_spin = 0.0
	_set_status("Jump", 0.45)


func _land_from_jump() -> void:
	is_airborne = false
	air_height = 0.0
	air_velocity = 0.0
	var spins := int(floor(abs(trick_spin) / 360.0))
	if spins > 0:
		style_score += spins * 180
		var bonus: float = minf(1.2, 0.25 * float(spins))
		run_time = max(0.0, run_time - bonus)
		_set_status("Trick x%d (-%.2fs)" % [spins, bonus], 1.0)
	trick_spin = 0.0


func _trigger_crash(hit_pos: Vector2, reason: String) -> void:
	crashed = true
	crash_timer = 1.15
	crash_count += 1
	no_crash_run = false
	forward_speed = max(active_min_speed, forward_speed * active_crash_keep_speed_ratio)
	run_time += active_crash_penalty
	_set_status("Crash (%s) +%.1fs" % [reason, active_crash_penalty], 1.2)

	for i in range(20):
		var ang := rng.randf_range(0.0, TAU)
		var dist := rng.randf_range(4.0, 18.0)
		var p := {
			"pos": hit_pos + Vector2(cos(ang), sin(ang)) * dist,
			"radius": rng.randf_range(1.5, 3.5),
			"type": "debris",
			"ttl": rng.randf_range(0.3, 0.8),
			"vel": Vector2(cos(ang), sin(ang)) * rng.randf_range(35.0, 95.0),
		}
		obstacles.append(p)


func _respawn() -> void:
	crashed = false
	player_pos = respawn_pos
	player_vel_x = 0.0
	is_airborne = false
	air_height = 0.0
	air_velocity = 0.0
	trick_spin = 0.0
	_set_status("Respawn", 0.7)


func _read_steer_input() -> float:
	var steer := 0.0
	if Input.is_action_pressed("steer_left"):
		steer -= 1.0
	if Input.is_action_pressed("steer_right"):
		steer += 1.0
	if touch_left:
		steer -= 1.0
	if touch_right:
		steer += 1.0

	if touch_steer_active:
		var delta_x := touch_steer_x - player_pos.x
		if abs(delta_x) > 10.0:
			steer += clampf(delta_x / 90.0, -1.0, 1.0)

	return clampf(steer, -1.0, 1.0)


func _surface_at(pos: Vector2) -> Dictionary:
	var bands := _get_track_bands(pos.y)
	var on_track := false
	var best_bonus := -0.18
	var active_id := "offtrail"
	var off_dist := 99999.0

	for band in bands:
		var center: float = band["center"]
		var width: float = band["width"]
		var d: float = absf(pos.x - center)
		var half := width * 0.5
		if d <= half:
			on_track = true
			if float(band["speed_bonus"]) > best_bonus:
				best_bonus = float(band["speed_bonus"])
				active_id = String(band["id"])
		else:
			off_dist = min(off_dist, d - half)

	return {
		"on_track": on_track,
		"speed_bonus": best_bonus,
		"active_id": active_id,
		"off_dist": off_dist,
		"on_ice": _point_in_any_rect(pos, ice_patches),
		"on_snow": _point_in_any_rect(pos, snow_patches),
	}


func _point_in_any_rect(p: Vector2, rects: Array[Rect2]) -> bool:
	for r in rects:
		if r.has_point(p):
			return true
	return false


func _main_center_x(y: float) -> float:
	if y <= _track_points[0].y:
		return _track_points[0].x
	for i in range(_track_points.size() - 1):
		var a := _track_points[i]
		var b := _track_points[i + 1]
		if y <= b.y:
			var t := inverse_lerp(a.y, b.y, y)
			return lerpf(a.x, b.x, t)
	return _track_points[_track_points.size() - 1].x


func _slope_at(y: float) -> float:
	var wave := 0.62 + sin(y * 0.006) * 0.08
	if y > 1450.0 and y < 2100.0:
		wave += 0.08
	if y > 2850.0 and y < 3420.0:
		wave += 0.12
	if y > 4200.0:
		wave += 0.05
	return clampf(wave, 0.48, 0.92)


func _get_track_bands(y: float) -> Array[Dictionary]:
	var main_center := _main_center_x(y)
	var bands: Array[Dictionary] = [
		{
			"id": "main",
			"center": main_center,
			"width": 184.0 * active_main_track_width_scale,
			"speed_bonus": 0.0,
			"color": Color(0.93, 0.96, 1.0, 0.95),
		}
	]

	if y > 840.0 and y < 1360.0:
		bands.append({
			"id": "shortcut_left_1",
			"center": main_center - 112.0 + sin(y * 0.02) * 16.0,
			"width": 102.0 * active_shortcut_width_scale,
			"speed_bonus": 0.13 * active_shortcut_speed_scale,
			"color": Color(0.74, 0.86, 1.0, 0.9),
		})

	if y > 1960.0 and y < 2520.0:
		bands.append({
			"id": "shortcut_right_2",
			"center": main_center + 122.0 + cos(y * 0.018) * 18.0,
			"width": 98.0 * active_shortcut_width_scale,
			"speed_bonus": 0.15 * active_shortcut_speed_scale,
			"color": Color(0.76, 0.88, 1.0, 0.9),
		})

	if y > 3180.0 and y < 3780.0:
		bands.append({
			"id": "shortcut_left_3",
			"center": main_center - 132.0 + sin(y * 0.016) * 20.0,
			"width": 96.0 * active_shortcut_width_scale,
			"speed_bonus": 0.18 * active_shortcut_speed_scale,
			"color": Color(0.74, 0.9, 1.0, 0.92),
		})

	return bands


func _setup_map_data() -> void:
	obstacles.clear()
	ice_patches.clear()
	snow_patches.clear()

	for sid in SHORTCUT_IDS:
		shortcut_seen[sid] = false

	for cp_y in CHECKPOINT_Y:
		checkpoints.append({"y": cp_y, "passed": false})

	var obstacle_y := active_obstacle_start_y
	while obstacle_y < FINISH_Y - 120.0:
		var bands := _get_track_bands(obstacle_y)
		var band := bands[rng.randi_range(0, bands.size() - 1)]
		var center: float = band["center"]
		var width: float = band["width"]
		var x := center + rng.randf_range(-width * 0.32, width * 0.32)
		var y := obstacle_y + rng.randf_range(-20.0, 20.0)
		var obstacle_type := "tree" if rng.randf() < 0.62 else "rock"
		var radius := (rng.randf_range(9.0, 12.0) if obstacle_type == "tree" else rng.randf_range(7.0, 10.0)) * active_obstacle_radius_scale
		obstacles.append({
			"pos": Vector2(x, y),
			"radius": radius,
			"type": obstacle_type,
		})

		if rng.randf() < active_obstacle_cluster_chance:
			obstacles.append({
				"pos": Vector2(x + rng.randf_range(-34.0, 34.0), y + rng.randf_range(28.0, 54.0)),
				"radius": radius * rng.randf_range(0.72, 1.05),
				"type": obstacle_type,
			})

		obstacle_y += rng.randf_range(active_obstacle_gap_min, active_obstacle_gap_max)

	ice_patches.append(_patch_around(980.0, 170.0, 220.0, -18.0))
	ice_patches.append(_patch_around(2140.0, 200.0, 250.0, 24.0))
	ice_patches.append(_patch_around(3520.0, 180.0, 230.0, -36.0))

	snow_patches.append(_patch_around(1350.0, 130.0, 160.0, 54.0))
	snow_patches.append(_patch_around(2740.0, 140.0, 180.0, -68.0))
	snow_patches.append(_patch_around(4320.0, 150.0, 180.0, 52.0))


func _patch_around(y: float, w: float, h: float, x_offset: float) -> Rect2:
	var cx := _main_center_x(y) + x_offset
	return Rect2(cx - w * 0.5, y - h * 0.5, w, h)


func _nearest_obstacle_distance() -> float:
	var nearest := 99999.0
	for obs in obstacles:
		if not obs.has("pos"):
			continue
		var p: Vector2 = obs["pos"]
		if p.y < player_pos.y - 40.0 or p.y > player_pos.y + 260.0:
			continue
		var d := player_pos.distance_to(p)
		if d < nearest:
			nearest = d
	return nearest


func _update_camera(delta: float) -> void:
	if camera == null:
		return
	var viewport_height := get_viewport_rect().size.y
	var speed_range := maxf(1.0, active_max_speed - active_min_speed)
	var speed_factor := clampf((forward_speed - active_min_speed) / speed_range, 0.0, 1.0)
	var look_ahead := clampf(viewport_height * 0.12, 120.0, 190.0) + speed_factor * 40.0
	var target_pos := Vector2(player_pos.x, clampf(player_pos.y - look_ahead, 170.0, FINISH_Y - 120.0))
	camera.position = camera.position.lerp(target_pos, clampf(delta * 6.2, 0.04, 0.22))

	var target_zoom := 1.04 - speed_factor * 0.23
	var nearest := _nearest_obstacle_distance()
	if nearest < 160.0:
		target_zoom += (1.0 - nearest / 160.0) * 0.14
	if is_airborne:
		target_zoom -= 0.04
	camera.zoom = camera.zoom.lerp(Vector2.ONE * clampf(target_zoom, 0.74, 1.12), clampf(delta * 5.8, 0.04, 0.2))


func _build_ui() -> void:
	camera = Camera2D.new()
	camera.enabled = true
	camera.position = Vector2(BASE_CENTER_X, 280.0)
	camera.zoom = Vector2.ONE
	add_child(camera)

	canvas_layer = CanvasLayer.new()
	add_child(canvas_layer)

	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	canvas_layer.add_child(root)

	hud_label = Label.new()
	hud_label.position = Vector2(10, 10)
	hud_label.size = Vector2(250, 110)
	hud_label.add_theme_color_override("font_color", Color(0.9, 0.96, 1.0))
	hud_label.add_theme_font_size_override("font_size", 13)
	hud_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	hud_label.vertical_alignment = VERTICAL_ALIGNMENT_TOP
	hud_label.autowrap_mode = TextServer.AUTOWRAP_OFF
	root.add_child(hud_label)

	hint_label = Label.new()
	hint_label.position = Vector2(10, 112)
	hint_label.size = Vector2(340, 24)
	hint_label.add_theme_color_override("font_color", Color(0.76, 0.88, 1.0))
	hint_label.add_theme_font_size_override("font_size", 12)
	hint_label.text = "Reach checkpoints and finish fast. Shortcuts are riskier but faster."
	root.add_child(hint_label)

	guide_label = Label.new()
	guide_label.position = Vector2(10, 136)
	guide_label.size = Vector2(340, 60)
	guide_label.add_theme_color_override("font_color", Color(0.84, 0.93, 1.0))
	guide_label.add_theme_font_size_override("font_size", 11)
	guide_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	guide_label.text = "Desktop: A/D steer · S brake · Shift boost · Space jump · Q/E trick · R restart\nMobile: LEFT/RIGHT steer + BRAKE/BOOST/JUMP/TRICK buttons"
	root.add_child(guide_label)

	start_button = Button.new()
	start_button.text = "START"
	start_button.size = Vector2(96, 38)
	start_button.position = Vector2(252, 12)
	start_button.pressed.connect(_on_start_pressed)
	root.add_child(start_button)

	var difficulty_box := HBoxContainer.new()
	difficulty_box.position = Vector2(212, 56)
	difficulty_box.size = Vector2(136, 30)
	difficulty_box.add_theme_constant_override("separation", 6)
	root.add_child(difficulty_box)

	easy_button = Button.new()
	easy_button.text = "EASY"
	easy_button.custom_minimum_size = Vector2(64, 30)
	easy_button.pressed.connect(_on_easy_pressed)
	difficulty_box.add_child(easy_button)

	normal_button = Button.new()
	normal_button.text = "NORMAL"
	normal_button.custom_minimum_size = Vector2(66, 30)
	normal_button.pressed.connect(_on_normal_pressed)
	difficulty_box.add_child(normal_button)

	var controls := VBoxContainer.new()
	controls.anchor_left = 0.0
	controls.anchor_right = 1.0
	controls.anchor_top = 1.0
	controls.anchor_bottom = 1.0
	controls.offset_left = 10
	controls.offset_right = -10
	controls.offset_top = -106
	controls.offset_bottom = -10
	controls.alignment = BoxContainer.ALIGNMENT_CENTER
	controls.add_theme_constant_override("separation", 6)
	controls.mouse_filter = Control.MOUSE_FILTER_STOP
	root.add_child(controls)

	var row_steer := HBoxContainer.new()
	row_steer.alignment = BoxContainer.ALIGNMENT_CENTER
	row_steer.add_theme_constant_override("separation", 8)
	controls.add_child(row_steer)

	var left_btn := _make_hold_button("LEFT", func() -> void: touch_left = true, func() -> void: touch_left = false)
	var right_btn := _make_hold_button("RIGHT", func() -> void: touch_right = true, func() -> void: touch_right = false)

	row_steer.add_child(left_btn)
	row_steer.add_child(right_btn)

	var row_actions := HBoxContainer.new()
	row_actions.alignment = BoxContainer.ALIGNMENT_CENTER
	row_actions.add_theme_constant_override("separation", 8)
	controls.add_child(row_actions)

	var brake_btn := _make_hold_button("BRAKE", func() -> void: touch_brake = true, func() -> void: touch_brake = false)
	var crouch_btn := _make_hold_button("BOOST", func() -> void: touch_crouch = true, func() -> void: touch_crouch = false)
	var jump_btn := _make_tap_button("JUMP", func() -> void: touch_jump_queued = true)
	var trick_btn := _make_hold_button("TRICK", func() -> void: touch_trick = true, func() -> void: touch_trick = false)

	row_actions.add_child(brake_btn)
	row_actions.add_child(crouch_btn)
	row_actions.add_child(jump_btn)
	row_actions.add_child(trick_btn)


func _setup_audio() -> void:
	bgm_player = AudioStreamPlayer.new()
	bgm_player.name = "BGMPlayer"
	bgm_player.bus = "Master"
	bgm_player.volume_db = -13.0
	add_child(bgm_player)

	var file := FileAccess.open(BGM_PATH, FileAccess.READ)
	if file == null:
		push_warning("Failed to open BGM file: %s" % BGM_PATH)
		return

	var mp3_stream := AudioStreamMP3.new()
	mp3_stream.data = file.get_buffer(file.get_length())
	mp3_stream.loop = true
	bgm_player.stream = mp3_stream


func _try_play_bgm() -> void:
	if bgm_player == null:
		return
	if bgm_player.stream == null:
		return
	if not bgm_player.playing:
		bgm_player.play()


func _make_hold_button(label: String, on_press: Callable, on_release: Callable) -> Button:
	var b := Button.new()
	b.text = label
	b.custom_minimum_size = Vector2(78, 42)
	b.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	b.button_down.connect(on_press)
	b.button_up.connect(on_release)
	b.mouse_exited.connect(on_release)
	return b


func _make_tap_button(label: String, on_tap: Callable) -> Button:
	var b := Button.new()
	b.text = label
	b.custom_minimum_size = Vector2(78, 42)
	b.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	b.pressed.connect(on_tap)
	return b


func _on_start_pressed() -> void:
	_start_run()


func _on_easy_pressed() -> void:
	_set_difficulty(DIFFICULTY_EASY)


func _on_normal_pressed() -> void:
	_set_difficulty(DIFFICULTY_NORMAL)


func _set_difficulty(next_difficulty: int) -> void:
	if current_difficulty == next_difficulty:
		return
	current_difficulty = next_difficulty
	_apply_difficulty_profile(true)
	_refresh_difficulty_ui()
	_reset_run(false)
	_set_status("Difficulty: %s" % _difficulty_name(), 1.0)


func _difficulty_name() -> String:
	return "EASY" if current_difficulty == DIFFICULTY_EASY else "NORMAL"


func _apply_difficulty_profile(notify: bool) -> void:
	if current_difficulty == DIFFICULTY_EASY:
		active_gravity = 255.0
		active_min_speed = 62.0
		active_max_speed = 220.0
		active_start_speed = 76.0
		challenge_target = 200.0
		active_jump_min_speed = 110.0
		active_jump_base_velocity = 215.0
		active_jump_speed_velocity_scale = 0.20
		active_crash_penalty = 1.0
		active_crash_keep_speed_ratio = 0.78
		active_offtrack_crash_dist = 124.0
		active_offtrack_crash_speed = 380.0
		active_main_track_width_scale = 1.25
		active_shortcut_width_scale = 1.25
		active_shortcut_speed_scale = 0.68
		active_obstacle_start_y = 380.0
		active_obstacle_gap_min = 165.0
		active_obstacle_gap_max = 255.0
		active_obstacle_cluster_chance = 0.03
		active_obstacle_radius_scale = 0.88
	else:
		active_gravity = BASE_GRAVITY
		active_min_speed = MIN_SPEED
		active_max_speed = MAX_SPEED
		active_start_speed = START_SPEED
		challenge_target = 175.0
		active_jump_min_speed = 125.0
		active_jump_base_velocity = 225.0
		active_jump_speed_velocity_scale = 0.22
		active_crash_penalty = 1.3
		active_crash_keep_speed_ratio = 0.7
		active_offtrack_crash_dist = 106.0
		active_offtrack_crash_speed = 340.0
		active_main_track_width_scale = 1.1
		active_shortcut_width_scale = 1.1
		active_shortcut_speed_scale = 0.8
		active_obstacle_start_y = 340.0
		active_obstacle_gap_min = 140.0
		active_obstacle_gap_max = 220.0
		active_obstacle_cluster_chance = 0.06
		active_obstacle_radius_scale = 0.95

	if notify:
		_update_ui_text()


func _refresh_difficulty_ui() -> void:
	if easy_button != null:
		easy_button.disabled = current_difficulty == DIFFICULTY_EASY
	if normal_button != null:
		normal_button.disabled = current_difficulty == DIFFICULTY_NORMAL


func _start_run() -> void:
	_try_play_bgm()
	_reset_run(true)
	_set_status("Go!", 0.6)


func _reset_run(start_immediately: bool) -> void:
	run_started = start_immediately
	run_finished = false
	crashed = false
	crash_timer = 0.0
	run_time = 0.0
	style_score = 0
	crash_count = 0
	no_crash_run = true
	last_checkpoint = -1

	player_pos = Vector2(BASE_CENTER_X, WORLD_TOP + 30.0)
	respawn_pos = player_pos
	player_vel_x = 0.0
	forward_speed = active_start_speed
	is_airborne = false
	air_height = 0.0
	air_velocity = 0.0
	trick_spin = 0.0

	checkpoints.clear()
	shortcut_seen.clear()
	_setup_map_data()
	_touch_reset()

	if start_button != null:
		start_button.text = "RESTART" if start_immediately else "START"


func _touch_reset() -> void:
	touch_steer_active = false
	touch_steer_x = BASE_CENTER_X
	touch_left = false
	touch_right = false
	touch_brake = false
	touch_crouch = false
	touch_trick = false
	touch_jump_queued = false


func _set_status(text: String, ttl: float) -> void:
	status_text = text
	status_timer = ttl


func _update_ui_text() -> void:
	if hud_label == null:
		return

	var cp_now: int = maxi(0, last_checkpoint + 1)
	var shortcut_count := 0
	for sid in SHORTCUT_IDS:
		if shortcut_seen.get(sid, false):
			shortcut_count += 1

	var best_label := "--:--.--" if best_time == INF else _fmt_time(best_time)
	var speed_kmh := int(round(forward_speed * 0.42))
	var main_line := "Mode %s   Time %s   Best %s" % [_difficulty_name(), _fmt_time(run_time), best_label]
	var sub_line := "Speed %d km/h   CP %d/%d   Crash %d" % [speed_kmh, cp_now, checkpoints.size(), crash_count]
	var extra_line := "Shortcut %d/%d   Style %d" % [shortcut_count, SHORTCUT_IDS.size(), style_score]
	hud_label.text = "%s\n%s\n%s" % [main_line, sub_line, extra_line]

	if hint_label != null:
		if run_finished:
			hint_label.text = "Finished! Press START to run again"
		elif crashed:
			hint_label.text = "Respawning from checkpoint..."
		elif status_text != "":
			hint_label.text = status_text
		else:
			hint_label.text = "Reach checkpoints and finish fast. Shortcuts are riskier but faster."


func _fmt_time(sec: float) -> String:
	var s: float = maxf(0.0, sec)
	var m := int(floor(s / 60.0))
	var r: float = s - float(m) * 60.0
	return "%02d:%05.2f" % [m, r]


func _load_records() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(SAVE_PATH) == OK:
		best_time = float(cfg.get_value("records", "best_time", INF))
		best_style = int(cfg.get_value("records", "best_style", 0))


func _save_records() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("records", "best_time", best_time)
	cfg.set_value("records", "best_style", max(best_style, style_score))
	cfg.save(SAVE_PATH)


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		var touch_event := event as InputEventScreenTouch
		if touch_event.pressed:
			touch_steer_active = true
			touch_steer_x = touch_event.position.x
		else:
			touch_steer_active = false
	elif event is InputEventScreenDrag:
		var drag_event := event as InputEventScreenDrag
		touch_steer_active = true
		touch_steer_x = drag_event.position.x
	elif event is InputEventMouseButton:
		var mb := event as InputEventMouseButton
		if mb.button_index == MOUSE_BUTTON_LEFT:
			touch_steer_active = mb.pressed
			touch_steer_x = mb.position.x
	elif event is InputEventMouseMotion:
		if touch_steer_active:
			var mm := event as InputEventMouseMotion
			touch_steer_x = mm.position.x

	if event.is_action_pressed("restart_run") and not run_started:
		_start_run()


func _draw() -> void:
	var cam_pos := player_pos
	var cam_zoom := 1.0
	if camera != null:
		cam_pos = camera.position
		cam_zoom = camera.zoom.x

	var vp := get_viewport_rect().size
	var half_h := vp.y * cam_zoom * 0.62
	var min_y := cam_pos.y - half_h
	var max_y := cam_pos.y + half_h

	draw_rect(Rect2(-120.0, min_y - 260.0, WORLD_WIDTH + 240.0, max_y - min_y + 520.0), Color(0.86, 0.93, 1.0, 1.0), true)

	_draw_patches(min_y, max_y)
	_draw_track(min_y, max_y)
	_draw_checkpoints(min_y, max_y)
	_draw_obstacles(min_y, max_y)
	_draw_finish_gate(min_y, max_y)
	_draw_player()


func _draw_patches(min_y: float, max_y: float) -> void:
	for r in ice_patches:
		if r.position.y > max_y + 40.0 or r.end.y < min_y - 40.0:
			continue
		draw_rect(r, Color(0.72, 0.88, 1.0, 0.45), true)
		draw_rect(r.grow(-6.0), Color(0.85, 0.95, 1.0, 0.28), false, 2.0)

	for r in snow_patches:
		if r.position.y > max_y + 40.0 or r.end.y < min_y - 40.0:
			continue
		draw_rect(r, Color(1.0, 1.0, 1.0, 0.35), true)
		draw_rect(r.grow(-4.0), Color(0.86, 0.92, 1.0, 0.4), false, 1.5)


func _draw_track(min_y: float, max_y: float) -> void:
	var step := 26.0
	var y: float = floorf(min_y / step) * step
	while y <= max_y:
		for band in _get_track_bands(y):
			var c := Color(band["color"])
			var center: float = band["center"]
			var width: float = band["width"]
			draw_circle(Vector2(center, y), width * 0.52, c)
			draw_circle(Vector2(center, y), width * 0.34, Color(c.r * 0.94, c.g * 0.96, c.b * 1.02, 0.28))
		y += step

	var line_step := 60.0
	var ly: float = floorf(min_y / line_step) * line_step
	while ly <= max_y:
		var main_x := _main_center_x(ly)
		draw_circle(Vector2(main_x, ly), 3.0, Color(0.55, 0.7, 0.88, 0.55))
		ly += line_step


func _draw_checkpoints(min_y: float, max_y: float) -> void:
	for i in range(checkpoints.size()):
		var cp_y: float = checkpoints[i]["y"]
		if cp_y < min_y - 30.0 or cp_y > max_y + 30.0:
			continue
		var passed: bool = checkpoints[i]["passed"]
		var cp_x := _main_center_x(cp_y)
		var col := Color(0.56, 1.0, 0.78, 0.78) if passed else Color(1.0, 0.9, 0.58, 0.82)
		draw_line(Vector2(cp_x - 94.0, cp_y), Vector2(cp_x + 94.0, cp_y), col, 4.0)
		draw_circle(Vector2(cp_x - 96.0, cp_y), 5.0, col)
		draw_circle(Vector2(cp_x + 96.0, cp_y), 5.0, col)


func _draw_obstacles(min_y: float, max_y: float) -> void:
	for obs in obstacles:
		if not obs.has("pos"):
			continue
		var pos: Vector2 = obs["pos"]
		if pos.y < min_y - 70.0 or pos.y > max_y + 70.0:
			continue
		var radius: float = obs["radius"]
		var kind: String = obs["type"]

		if kind == "tree":
			draw_rect(Rect2(pos.x - 2.0, pos.y + radius * 0.25, 4.0, radius * 0.9), Color(0.48, 0.33, 0.21), true)
			var top := pos + Vector2(0.0, -radius * 1.05)
			var left := pos + Vector2(-radius * 0.85, radius * 0.6)
			var right := pos + Vector2(radius * 0.85, radius * 0.6)
			draw_colored_polygon(PackedVector2Array([top, right, left]), Color(0.21, 0.56, 0.33, 1.0))
		elif kind == "rock":
			draw_circle(pos, radius, Color(0.52, 0.56, 0.61, 1.0))
			draw_circle(pos + Vector2(-radius * 0.2, -radius * 0.25), radius * 0.45, Color(0.68, 0.72, 0.76, 0.65))
		elif kind == "debris":
			draw_circle(pos, radius, Color(0.8, 0.72, 0.62, 0.6))


func _draw_finish_gate(min_y: float, max_y: float) -> void:
	if FINISH_Y < min_y - 80.0 or FINISH_Y > max_y + 80.0:
		return
	var x := _main_center_x(FINISH_Y)
	draw_line(Vector2(x - 110.0, FINISH_Y), Vector2(x + 110.0, FINISH_Y), Color(0.96, 0.92, 0.65, 1.0), 6.0)
	draw_rect(Rect2(x - 114.0, FINISH_Y - 28.0, 8.0, 30.0), Color(0.34, 0.28, 0.2, 1.0), true)
	draw_rect(Rect2(x + 106.0, FINISH_Y - 28.0, 8.0, 30.0), Color(0.34, 0.28, 0.2, 1.0), true)


func _draw_player() -> void:
	var shadow_scale := clampf(1.0 - air_height / 260.0, 0.45, 1.0)
	draw_circle(player_pos + Vector2(0.0, 4.0), 11.0 * shadow_scale, Color(0.0, 0.0, 0.0, 0.28))

	var body_pos := player_pos - Vector2(0.0, air_height)
	var tilt := clampf(player_vel_x * 0.0038, -0.46, 0.46)
	var spin := deg_to_rad(trick_spin) * 0.02 if is_airborne else 0.0
	var rot := tilt + spin

	var ski_a1 := body_pos + _rot(Vector2(-12.0, 10.0), rot)
	var ski_a2 := body_pos + _rot(Vector2(12.0, 14.0), rot)
	var ski_b1 := body_pos + _rot(Vector2(-10.0, 14.0), rot)
	var ski_b2 := body_pos + _rot(Vector2(14.0, 18.0), rot)
	draw_line(ski_a1, ski_a2, Color(0.82, 0.93, 1.0, 1.0), 3.0)
	draw_line(ski_b1, ski_b2, Color(0.75, 0.88, 1.0, 0.95), 3.0)

	var p1 := body_pos + _rot(Vector2(0.0, -10.0), rot)
	var p2 := body_pos + _rot(Vector2(8.0, 8.0), rot)
	var p3 := body_pos + _rot(Vector2(-8.0, 8.0), rot)
	draw_colored_polygon(PackedVector2Array([p1, p2, p3]), Color(0.95, 0.72, 0.38, 1.0))
	draw_circle(body_pos + _rot(Vector2(0.0, -14.0), rot), 4.4, Color(0.95, 0.98, 1.0, 1.0))


func _rot(v: Vector2, a: float) -> Vector2:
	var ca := cos(a)
	var sa := sin(a)
	return Vector2(v.x * ca - v.y * sa, v.x * sa + v.y * ca)
