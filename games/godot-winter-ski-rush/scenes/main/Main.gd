extends Node2D

const SAVE_PATH_PREFIX := "user://winter_ski_rush"

const WORLD_WIDTH := 360.0
const WORLD_TOP := 120.0
const FINISH_Y := 15000.0

const BASE_CENTER_X := WORLD_WIDTH * 0.5
const BGM_PATH := "res://assets/audio/winter-ski-rush-pixabay-286213.mp3"
const BRAKE_SFX_PATH := "res://assets/audio/winter-ski-rush-brake-pixabay-46042.mp3"
const NORMAL_SKI_LOOP_SFX_PATH := "res://assets/audio/winter-ski-rush-normal-ski-loop.mp3"
const LEFT_RIGHT_SFX_PATH := "res://assets/audio/winter-ski-rush-left-right-sfx.mp3"
const BASE_GRAVITY := 290.0
const START_SPEED := 88.0
const MAX_LIVES := 3
const STEER_PAD_RADIUS := 56.0
const STEER_PAD_KNOB_RADIUS := 24.0
const STEER_PAD_DEADZONE := 0.08
const MAX_REWARD_PARTICLES := 96

const DIFFICULTY_EASY := 0
const DIFFICULTY_NORMAL := 1

const CHECKPOINT_COUNT := 20
const CHECKPOINT_START_OFFSET_Y := 260.0
const CHECKPOINT_END_OFFSET_Y := 240.0
const SHORTCUT_SPECS := [
	{"id": "shortcut_left_1", "start": 920.0, "end": 1760.0, "offset": -118.0, "wobble_amp": 16.0, "wobble_freq": 0.019, "wobble_phase": 0.3, "width": 106.0, "bonus": 0.14},
	{"id": "shortcut_right_2", "start": 2040.0, "end": 2820.0, "offset": 126.0, "wobble_amp": 18.0, "wobble_freq": 0.017, "wobble_phase": 0.9, "width": 104.0, "bonus": 0.15},
	{"id": "shortcut_left_3", "start": 3340.0, "end": 4160.0, "offset": -132.0, "wobble_amp": 20.0, "wobble_freq": 0.016, "wobble_phase": 0.1, "width": 100.0, "bonus": 0.17},
	{"id": "shortcut_right_4", "start": 4680.0, "end": 5480.0, "offset": 136.0, "wobble_amp": 21.0, "wobble_freq": 0.015, "wobble_phase": 1.2, "width": 98.0, "bonus": 0.18},
	{"id": "shortcut_left_5", "start": 5980.0, "end": 6840.0, "offset": -138.0, "wobble_amp": 22.0, "wobble_freq": 0.014, "wobble_phase": 0.6, "width": 96.0, "bonus": 0.19},
	{"id": "shortcut_right_6", "start": 7300.0, "end": 8220.0, "offset": 142.0, "wobble_amp": 22.0, "wobble_freq": 0.0135, "wobble_phase": 1.0, "width": 95.0, "bonus": 0.2},
	{"id": "shortcut_left_7", "start": 8780.0, "end": 9720.0, "offset": -144.0, "wobble_amp": 24.0, "wobble_freq": 0.012, "wobble_phase": 0.4, "width": 94.0, "bonus": 0.21},
	{"id": "shortcut_right_8", "start": 10480.0, "end": 11480.0, "offset": 146.0, "wobble_amp": 24.0, "wobble_freq": 0.0115, "wobble_phase": 1.4, "width": 92.0, "bonus": 0.22},
	{"id": "shortcut_left_9", "start": 12280.0, "end": 13480.0, "offset": -150.0, "wobble_amp": 25.0, "wobble_freq": 0.011, "wobble_phase": 0.8, "width": 90.0, "bonus": 0.23},
]

var _track_points: Array[Vector2] = [
	Vector2(BASE_CENTER_X, WORLD_TOP),
	Vector2(228, 520),
	Vector2(120, 980),
	Vector2(268, 1460),
	Vector2(106, 1940),
	Vector2(270, 2460),
	Vector2(118, 2980),
	Vector2(258, 3520),
	Vector2(108, 4060),
	Vector2(250, 4620),
	Vector2(132, 5200),
	Vector2(274, 5860),
	Vector2(100, 6520),
	Vector2(266, 7240),
	Vector2(122, 7980),
	Vector2(278, 8740),
	Vector2(110, 9520),
	Vector2(258, 10300),
	Vector2(116, 11120),
	Vector2(276, 11960),
	Vector2(132, 12820),
	Vector2(248, 13640),
	Vector2(146, 14420),
	Vector2(BASE_CENTER_X, FINISH_Y),
]

var rng := RandomNumberGenerator.new()
var save_path := "%s_browser.save" % SAVE_PATH_PREFIX

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
var lives_remaining := MAX_LIVES
var no_crash_run := true
var challenge_target := 150.0

var current_difficulty := DIFFICULTY_NORMAL
var active_gravity := BASE_GRAVITY
var active_speed_visual_ref := 240.0
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

var touch_steer_axis := 0.0
var touch_left := false
var touch_right := false
var touch_brake := false
var touch_crouch := false
var steer_pad_active := false
var steer_pad_touch_index := -1
var steer_pad_knob_offset := Vector2.ZERO
var steer_pad_base: Control
var steer_pad_knob: Control

var status_text := ""
var status_timer := 0.0
var reward_particles: Array[Dictionary] = []
var reward_wave_timer := 0.0
var reward_wave_duration := 0.42
var reward_wave_color := Color(0.94, 0.88, 0.62, 0.92)
var reward_wave_origin := Vector2.ZERO
var reward_screen_pulse := 0.0
var reward_screen_tint := Color(0.78, 0.9, 1.0, 1.0)

var camera: Camera2D
var canvas_layer: CanvasLayer
var hud_label: Label
var hint_label: Label
var warning_panel: ColorRect
var warning_label: Label
var game_over_overlay: ColorRect
var game_over_label: Label
var bgm_player: AudioStreamPlayer
var brake_sfx_player: AudioStreamPlayer
var ski_loop_player: AudioStreamPlayer
var left_right_sfx_player: AudioStreamPlayer
var ui_font: Font
var ui_fallback_font: SystemFont
var _brake_was_pressed := false
var _left_was_pressed := false
var _right_was_pressed := false
var offtrack_warning_target := 0.0
var offtrack_warning_strength := 0.0
var music_enabled := true
var sfx_enabled := true
var host_paused := false
var _host_bridge = null
var _host_callback_ref = null


func _localized_crash_reason(reason: String) -> String:
	match reason:
		"tree":
			return "나무"
		"rock":
			return "바위"
		"cliff":
			return "코스 이탈"
		_:
			return reason


func _load_ui_font() -> void:
	ui_fallback_font = SystemFont.new()
	ui_fallback_font.font_names = PackedStringArray([
		"Apple SD Gothic Neo",
		"Noto Sans KR",
		"Noto Sans CJK KR",
		"Malgun Gothic",
		"sans-serif",
	])

	ui_font = ui_fallback_font
	ThemeDB.fallback_font = ui_fallback_font


func _apply_ui_font(control: Control, font_size: int = -1) -> void:
	if control == null:
		return
	if ui_font != null:
		control.add_theme_font_override("font", ui_font)
	if font_size > 0:
		control.add_theme_font_size_override("font_size", font_size)


func _ready() -> void:
	rng.seed = 20260307
	_init_web_host()
	_load_records()
	_apply_difficulty_profile(false)
	_load_ui_font()
	_setup_audio()
	_apply_audio_settings()
	_build_ui()
	_start_run()
	set_physics_process(true)
	set_process(true)
	queue_redraw()


func _process(delta: float) -> void:
	if host_paused:
		_apply_audio_settings()
		_update_ui_text()
		return

	if run_started and not run_finished and not crashed:
		_try_play_bgm()
		_try_play_ski_loop()
	else:
		_stop_ski_loop()

	if status_timer > 0.0:
		status_timer = max(0.0, status_timer - delta)
		if status_timer == 0.0:
			status_text = ""
	_update_reward_fx(delta)
	_update_ui_text()
	_update_offtrack_warning_ui(delta)


func _physics_process(delta: float) -> void:
	if host_paused:
		queue_redraw()
		return

	_update_dynamic_obstacles(delta)
	_update_brake_sfx()
	_update_left_right_sfx()

	if run_started:
		run_time += delta

	if crashed:
		offtrack_warning_target = 0.0
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

	var surface := _surface_at(player_pos)
	if not surface["on_track"]:
		var off_dist_now := float(surface["off_dist"])
		offtrack_warning_target = clampf((off_dist_now - 10.0) / 80.0, 0.22, 1.0)
	else:
		offtrack_warning_target = 0.0

	if surface["on_track"] and String(surface["active_id"]).begins_with("shortcut"):
		var sid := String(surface["active_id"])
		if not shortcut_seen.get(sid, false):
			shortcut_seen[sid] = true
			_set_status("지름길 발견!", 1.2)
			style_score += 120
			_trigger_reward_fx(Color(0.72, 0.92, 1.0, 1.0), 0.9)

	var slope := _slope_at(player_pos.y)
	var accel := active_gravity * slope * 0.18
	accel += active_gravity * float(surface["speed_bonus"]) * 0.08

	if surface["on_ice"]:
		accel *= 1.08
	if surface["on_snow"]:
		accel *= 0.9

	if crouch_pressed and not brake_pressed:
		accel += 18.0
	if brake_pressed:
		accel = -320.0

	forward_speed = maxf(0.0, forward_speed + accel * delta)

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
			_set_status("체크포인트 %d" % (i + 1), 0.9)
			_trigger_reward_fx(Color(1.0, 0.9, 0.6, 1.0), 1.0)


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
	_set_status("완주! %s" % _fmt_time(run_time), 2.4)
	_trigger_reward_fx(Color(0.99, 0.93, 0.68, 1.0), 1.65)
	if challenge_ok:
		_set_status("무충돌 완주! 목표 달성!", 2.8)


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
	_set_status("점프!", 0.45)


func _land_from_jump() -> void:
	is_airborne = false
	air_height = 0.0
	air_velocity = 0.0
	var spins := int(floor(abs(trick_spin) / 360.0))
	if spins > 0:
		style_score += spins * 180
		var bonus: float = minf(1.2, 0.25 * float(spins))
		run_time = max(0.0, run_time - bonus)
		_set_status("트릭 x%d (-%.2fs)" % [spins, bonus], 1.0)
	trick_spin = 0.0


func _trigger_crash(hit_pos: Vector2, reason: String) -> void:
	if run_finished:
		return

	lives_remaining = maxi(0, lives_remaining - 1)
	crashed = true
	crash_timer = 1.15
	crash_count += 1
	no_crash_run = false
	forward_speed = maxf(0.0, forward_speed * active_crash_keep_speed_ratio)
	run_time += active_crash_penalty
	_set_status(
		"충돌 (%s) +%.1fs | 목숨 %d/%d" % [
			_localized_crash_reason(reason),
			active_crash_penalty,
			lives_remaining,
			MAX_LIVES,
		],
		1.2
	)

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

	if lives_remaining <= 0:
		crashed = false
		crash_timer = 0.0
		run_started = false
		run_finished = true
		_touch_reset()
		_show_game_over_popup()


func _sanitize_storage_suffix(raw_value: String) -> String:
	var cleaned := ""
	var lowered := raw_value.strip_edges().to_lower()
	for i in range(lowered.length()):
		var code := lowered.unicode_at(i)
		var is_digit := code >= 48 and code <= 57
		var is_lower := code >= 97 and code <= 122
		if is_digit or is_lower:
			cleaned += char(code)
		elif not cleaned.ends_with("_"):
			cleaned += "_"

	cleaned = cleaned.trim_prefix("_").trim_suffix("_")
	if cleaned == "":
		return "browser"
	return cleaned.substr(0, min(cleaned.length(), 48))


func _init_web_host() -> void:
	save_path = "%s_browser.save" % SAVE_PATH_PREFIX
	if not OS.has_feature("web"):
		return

	var host = JavaScriptBridge.get_interface("WinterSkiRushGodotHost")
	if host == null:
		return

	_host_bridge = host
	var suffix := _sanitize_storage_suffix(String(host.storageSuffix if host.storageSuffix != null else "browser"))
	save_path = "%s_%s.save" % [SAVE_PATH_PREFIX, suffix]

	if host.musicEnabled != null:
		music_enabled = bool(host.musicEnabled)
	if host.sfxEnabled != null:
		sfx_enabled = bool(host.sfxEnabled)

	_host_callback_ref = JavaScriptBridge.create_callback(_on_web_host_message)
	_host_bridge.dispatchToGodot = _host_callback_ref


func _on_web_host_message(args: Array) -> void:
	if args.is_empty():
		return

	var payload = args[0]
	if payload == null:
		return

	var action := String(payload.action)
	match action:
		"pause":
			_set_host_paused(true)
		"resume":
			_set_host_paused(false)
		"set_music":
			music_enabled = bool(payload.value)
			_apply_audio_settings()
		"set_sfx":
			sfx_enabled = bool(payload.value)
			_apply_audio_settings()


func _set_host_paused(paused: bool) -> void:
	if host_paused == paused:
		return

	host_paused = paused
	_touch_reset()
	_apply_audio_settings()
	_update_ui_text()
	queue_redraw()


func _respawn() -> void:
	crashed = false
	player_pos = respawn_pos
	player_vel_x = 0.0
	is_airborne = false
	air_height = 0.0
	air_velocity = 0.0
	trick_spin = 0.0
	_set_status("복귀", 0.7)


func _trigger_reward_fx(tint: Color, intensity: float = 1.0) -> void:
	var power := clampf(intensity, 0.5, 2.0)
	reward_wave_duration = 0.34 + power * 0.2
	reward_wave_timer = reward_wave_duration
	reward_wave_color = tint
	reward_wave_origin = player_pos
	reward_screen_tint = tint
	reward_screen_pulse = maxf(reward_screen_pulse, 0.12 + power * 0.12)

	var burst_count := int(round(10.0 + power * 18.0))
	for i in range(burst_count):
		var angle := rng.randf_range(0.0, TAU)
		var speed := rng.randf_range(72.0, 210.0 + 48.0 * power)
		var life := rng.randf_range(0.25, 0.68 + 0.18 * power)
		reward_particles.append({
			"pos": player_pos,
			"vel": Vector2(cos(angle), sin(angle)) * speed,
			"life": life,
			"max_life": life,
			"size": rng.randf_range(2.0, 5.6 + 1.2 * power),
			"col": Color(
				clampf(tint.r + rng.randf_range(-0.04, 0.08), 0.0, 1.0),
				clampf(tint.g + rng.randf_range(-0.04, 0.08), 0.0, 1.0),
				clampf(tint.b + rng.randf_range(-0.04, 0.08), 0.0, 1.0),
				1.0
			),
		})

	while reward_particles.size() > MAX_REWARD_PARTICLES:
		reward_particles.remove_at(0)


func _update_reward_fx(delta: float) -> void:
	if reward_wave_timer > 0.0:
		reward_wave_timer = maxf(0.0, reward_wave_timer - delta)

	if reward_screen_pulse > 0.0:
		reward_screen_pulse = maxf(0.0, reward_screen_pulse - delta * 1.45)

	for i in range(reward_particles.size() - 1, -1, -1):
		var p: Dictionary = reward_particles[i]
		var life := float(p.get("life", 0.0)) - delta
		if life <= 0.0:
			reward_particles.remove_at(i)
			continue

		var pos: Vector2 = p.get("pos", Vector2.ZERO)
		var vel: Vector2 = p.get("vel", Vector2.ZERO)
		vel = vel * clampf(1.0 - delta * 2.4, 0.0, 1.0)
		vel.y += 230.0 * delta
		pos += vel * delta
		p["life"] = life
		p["pos"] = pos
		p["vel"] = vel
		reward_particles[i] = p


func _draw_reward_fx(min_y: float, max_y: float, cam_pos: Vector2, cam_zoom: float) -> void:
	if reward_particles.size() > 0:
		for p in reward_particles:
			var pos: Vector2 = p.get("pos", Vector2.ZERO)
			if pos.y < min_y - 80.0 or pos.y > max_y + 80.0:
				continue
			var life := float(p.get("life", 0.0))
			var max_life := maxf(0.001, float(p.get("max_life", life)))
			var alpha := clampf(life / max_life, 0.0, 1.0)
			var col := Color(p.get("col", Color.WHITE))
			col.a = alpha
			draw_circle(pos, float(p.get("size", 2.0)) * (0.45 + alpha * 0.55), col)

	if reward_wave_timer > 0.0:
		var progress := 1.0 - reward_wave_timer / maxf(0.001, reward_wave_duration)
		var eased := 1.0 - pow(1.0 - progress, 3.0)
		var radius := lerpf(18.0, 124.0, eased)
		var wave_col := reward_wave_color
		wave_col.a = clampf((1.0 - progress) * 0.82, 0.0, 0.82)
		draw_arc(reward_wave_origin, radius, 0.0, TAU, 56, wave_col, 3.5)

	if reward_screen_pulse > 0.001:
		var vp := get_viewport_rect().size
		var half_w := vp.x * cam_zoom * 0.56
		var half_h := vp.y * cam_zoom * 0.56
		var rect := Rect2(cam_pos - Vector2(half_w, half_h), Vector2(half_w * 2.0, half_h * 2.0))
		var overlay := reward_screen_tint
		overlay.a = clampf(reward_screen_pulse * 0.24, 0.0, 0.2)
		draw_rect(rect, overlay, true)


func _show_game_over_popup() -> void:
	if game_over_overlay == null:
		return

	if game_over_label != null:
		game_over_label.text = "목숨을 모두 사용했습니다.\n다시 도전할까요?"

	game_over_overlay.visible = true


func _hide_game_over_popup() -> void:
	if game_over_overlay == null:
		return
	game_over_overlay.visible = false


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
	steer += touch_steer_axis

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
			var base_x := lerpf(a.x, b.x, t)
			var wiggle := sin(y * 0.0056) * 32.0 + sin(y * 0.0128 + 1.1) * 16.0
			return clampf(base_x + wiggle, 62.0, WORLD_WIDTH - 62.0)
	var end_x := _track_points[_track_points.size() - 1].x
	var end_wiggle := sin(y * 0.0056) * 32.0 + sin(y * 0.0128 + 1.1) * 16.0
	return clampf(end_x + end_wiggle, 62.0, WORLD_WIDTH - 62.0)


func _slope_at(y: float) -> float:
	var progress := clampf(inverse_lerp(WORLD_TOP, FINISH_Y, y), 0.0, 1.0)
	var wave := 0.56 + sin(y * 0.0046) * 0.1 + sin(y * 0.0107 + 1.2) * 0.06
	wave += progress * 0.11
	var segment := int(floor((y - WORLD_TOP) / 1700.0))
	if segment % 3 == 1:
		wave += 0.05
	elif segment % 3 == 2:
		wave -= 0.03
	return clampf(wave, 0.44, 0.97)


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

	for spec in SHORTCUT_SPECS:
		var start_y: float = float(spec["start"])
		var end_y: float = float(spec["end"])
		if y <= start_y or y >= end_y:
			continue

		var offset: float = float(spec["offset"])
		var wobble_amp: float = float(spec["wobble_amp"])
		var wobble_freq: float = float(spec["wobble_freq"])
		var wobble_phase: float = float(spec["wobble_phase"])
		var width: float = float(spec["width"]) * active_shortcut_width_scale
		var bonus: float = float(spec["bonus"]) * active_shortcut_speed_scale

		var shortcut_center := main_center + offset + sin(y * wobble_freq + wobble_phase) * wobble_amp
		var shortcut_color := Color(0.75, 0.89, 1.0, 0.9) if offset < 0.0 else Color(0.83, 0.9, 1.0, 0.9)
		bands.append({
			"id": String(spec["id"]),
			"center": shortcut_center,
			"width": width,
			"speed_bonus": bonus,
			"color": shortcut_color,
		})

	return bands


func _setup_map_data() -> void:
	obstacles.clear()
	ice_patches.clear()
	snow_patches.clear()

	for spec in SHORTCUT_SPECS:
		shortcut_seen[String(spec["id"])] = false

	for i in range(CHECKPOINT_COUNT):
		var t := float(i + 1) / float(CHECKPOINT_COUNT)
		var cp_y := lerpf(WORLD_TOP + CHECKPOINT_START_OFFSET_Y, FINISH_Y - CHECKPOINT_END_OFFSET_Y, t)
		checkpoints.append({"y": cp_y, "passed": false})

	var obstacle_y := active_obstacle_start_y
	while obstacle_y < FINISH_Y - 120.0:
		var bands := _get_track_bands(obstacle_y)
		var band := bands[rng.randi_range(0, bands.size() - 1)]
		var center: float = band["center"]
		var width: float = band["width"]
		var progress := clampf(inverse_lerp(WORLD_TOP, FINISH_Y, obstacle_y), 0.0, 1.0)
		var x := center + rng.randf_range(-width * 0.32, width * 0.32)
		var y := obstacle_y + rng.randf_range(-20.0, 20.0)
		var obstacle_type := "tree" if rng.randf() < lerpf(0.7, 0.46, progress) else "rock"
		var radius := (rng.randf_range(9.0, 12.0) if obstacle_type == "tree" else rng.randf_range(7.0, 10.5)) * active_obstacle_radius_scale * lerpf(0.95, 1.28, progress)
		obstacles.append({
			"pos": Vector2(x, y),
			"radius": radius,
			"type": obstacle_type,
		})

		if rng.randf() < active_obstacle_cluster_chance + progress * 0.18:
			obstacles.append({
				"pos": Vector2(x + rng.randf_range(-34.0, 34.0), y + rng.randf_range(28.0, 54.0)),
				"radius": radius * rng.randf_range(0.72, 1.1),
				"type": obstacle_type,
			})

		if rng.randf() < 0.1 + progress * 0.14:
			var mirror_x := center - (x - center) * rng.randf_range(0.75, 1.25)
			obstacles.append({
				"pos": Vector2(clampf(mirror_x, 32.0, WORLD_WIDTH - 32.0), y + rng.randf_range(-16.0, 18.0)),
				"radius": radius * rng.randf_range(0.7, 1.05),
				"type": ("rock" if obstacle_type == "tree" else "tree"),
			})

		var gap_min := lerpf(active_obstacle_gap_min * 1.18, active_obstacle_gap_min * 0.82, progress)
		var gap_max := lerpf(active_obstacle_gap_max * 1.15, active_obstacle_gap_max * 0.78, progress)
		obstacle_y += rng.randf_range(gap_min, gap_max)

	var gate_count := 24
	for i in range(gate_count):
		var gt := float(i + 1) / float(gate_count + 1)
		var gate_y := lerpf(WORLD_TOP + 680.0, FINISH_Y - 460.0, gt)
		var gate_center := _main_center_x(gate_y) + rng.randf_range(-26.0, 26.0)
		var gate_half := rng.randf_range(34.0, 44.0)
		obstacles.append({
			"pos": Vector2(clampf(gate_center - gate_half, 28.0, WORLD_WIDTH - 28.0), gate_y + rng.randf_range(-8.0, 8.0)),
			"radius": rng.randf_range(7.0, 9.5) * active_obstacle_radius_scale,
			"type": "tree",
		})
		obstacles.append({
			"pos": Vector2(clampf(gate_center + gate_half, 28.0, WORLD_WIDTH - 28.0), gate_y + rng.randf_range(-8.0, 8.0)),
			"radius": rng.randf_range(7.0, 9.5) * active_obstacle_radius_scale,
			"type": "tree",
		})

	var ice_y := 900.0
	while ice_y < FINISH_Y - 460.0:
		ice_patches.append(_patch_around(
			ice_y + rng.randf_range(-90.0, 90.0),
			rng.randf_range(160.0, 230.0),
			rng.randf_range(190.0, 280.0),
			rng.randf_range(-72.0, 72.0)
		))
		ice_y += rng.randf_range(1750.0, 2450.0)

	var snow_y := 1220.0
	while snow_y < FINISH_Y - 440.0:
		snow_patches.append(_patch_around(
			snow_y + rng.randf_range(-80.0, 80.0),
			rng.randf_range(130.0, 190.0),
			rng.randf_range(150.0, 230.0),
			rng.randf_range(-86.0, 86.0)
		))
		snow_y += rng.randf_range(1450.0, 2100.0)


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
	var speed_factor := clampf(forward_speed / maxf(1.0, active_speed_visual_ref), 0.0, 1.0)
	var follow_down := clampf(viewport_height * 0.11, 90.0, 140.0) + speed_factor * 22.0
	var target_pos := Vector2(player_pos.x, clampf(player_pos.y + follow_down, 170.0, FINISH_Y - 120.0))
	camera.position = camera.position.lerp(target_pos, clampf(delta * 6.2, 0.04, 0.22))

	var target_zoom := 1.04 - speed_factor * 0.23
	var nearest := _nearest_obstacle_distance()
	if nearest < 160.0:
		target_zoom += (1.0 - nearest / 160.0) * 0.14
	if is_airborne:
		target_zoom -= 0.04
	camera.zoom = camera.zoom.lerp(Vector2.ONE * clampf(target_zoom, 0.74, 1.12), clampf(delta * 5.8, 0.04, 0.2))


func _make_stylebox(bg: Color, border: Color, radius: int, border_width: int = 1) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.border_color = border
	sb.set_border_width_all(border_width)
	sb.corner_radius_top_left = radius
	sb.corner_radius_top_right = radius
	sb.corner_radius_bottom_left = radius
	sb.corner_radius_bottom_right = radius
	return sb


func _apply_hold_button_theme(button: Button, tone: String) -> void:
	var normal := Color(0.16, 0.28, 0.43, 0.84)
	var hover := Color(0.2, 0.34, 0.52, 0.9)
	var pressed := Color(0.14, 0.22, 0.35, 0.92)
	var border := Color(0.58, 0.78, 0.95, 0.45)
	var font_col := Color(0.92, 0.97, 1.0)

	if tone == "boost":
		normal = Color(0.47, 0.36, 0.16, 0.88)
		hover = Color(0.55, 0.43, 0.18, 0.94)
		pressed = Color(0.39, 0.29, 0.12, 0.96)
		border = Color(0.97, 0.86, 0.6, 0.55)
		font_col = Color(1.0, 0.96, 0.84)
	elif tone == "brake":
		normal = Color(0.12, 0.23, 0.38, 0.9)
		hover = Color(0.15, 0.3, 0.48, 0.95)
		pressed = Color(0.09, 0.18, 0.3, 0.95)
		border = Color(0.62, 0.82, 0.97, 0.52)
		font_col = Color(0.9, 0.97, 1.0)

	button.add_theme_stylebox_override("normal", _make_stylebox(normal, border, 12))
	button.add_theme_stylebox_override("hover", _make_stylebox(hover, border.lightened(0.08), 12))
	button.add_theme_stylebox_override("pressed", _make_stylebox(pressed, border.darkened(0.08), 12))
	button.add_theme_stylebox_override("focus", _make_stylebox(hover.lightened(0.07), border.lightened(0.12), 12, 2))
	button.add_theme_color_override("font_color", font_col)
	button.add_theme_color_override("font_pressed_color", font_col.lightened(0.08))
	button.add_theme_color_override("font_hover_color", font_col.lightened(0.08))
	button.add_theme_color_override("font_focus_color", font_col.lightened(0.08))
	button.add_theme_constant_override("outline_size", 0)


func _apply_popup_button_theme(button: Button, primary: bool) -> void:
	if primary:
		button.add_theme_stylebox_override(
			"normal",
			_make_stylebox(Color(0.24, 0.39, 0.61, 0.94), Color(0.7, 0.86, 0.99, 0.64), 10)
		)
		button.add_theme_stylebox_override(
			"hover",
			_make_stylebox(Color(0.29, 0.45, 0.68, 0.96), Color(0.78, 0.9, 1.0, 0.72), 10)
		)
		button.add_theme_stylebox_override(
			"pressed",
			_make_stylebox(Color(0.19, 0.31, 0.52, 0.98), Color(0.68, 0.84, 0.99, 0.72), 10)
		)
		button.add_theme_color_override("font_color", Color(0.93, 0.98, 1.0))
	else:
		button.add_theme_stylebox_override(
			"normal",
			_make_stylebox(Color(0.12, 0.2, 0.33, 0.86), Color(0.57, 0.73, 0.89, 0.44), 10)
		)
		button.add_theme_stylebox_override(
			"hover",
			_make_stylebox(Color(0.16, 0.27, 0.43, 0.9), Color(0.64, 0.8, 0.95, 0.52), 10)
		)
		button.add_theme_stylebox_override(
			"pressed",
			_make_stylebox(Color(0.1, 0.17, 0.29, 0.92), Color(0.54, 0.7, 0.86, 0.5), 10)
		)
		button.add_theme_color_override("font_color", Color(0.88, 0.95, 1.0))

	button.add_theme_stylebox_override("focus", _make_stylebox(Color(0.2, 0.33, 0.52, 0.96), Color(0.8, 0.9, 1.0, 0.72), 10, 2))
	button.add_theme_color_override("font_hover_color", Color(0.94, 0.98, 1.0))
	button.add_theme_color_override("font_pressed_color", Color(0.98, 1.0, 1.0))
	button.add_theme_constant_override("outline_size", 0)


func _sync_steer_pad_visual() -> void:
	if steer_pad_knob == null or steer_pad_base == null:
		return

	var knob_size := Vector2(STEER_PAD_KNOB_RADIUS * 2.0, STEER_PAD_KNOB_RADIUS * 2.0)
	var center := Vector2(STEER_PAD_RADIUS, STEER_PAD_RADIUS)
	steer_pad_knob.size = knob_size
	steer_pad_knob.position = center - knob_size * 0.5 + steer_pad_knob_offset
	steer_pad_base.modulate = Color(1.0, 1.0, 1.0, 1.0 if steer_pad_active else 0.95)


func _update_steer_pad_from_local(local_pos: Vector2) -> void:
	if steer_pad_base == null:
		return

	var center := Vector2(STEER_PAD_RADIUS, STEER_PAD_RADIUS)
	var delta := local_pos - center
	var max_dist := STEER_PAD_RADIUS - STEER_PAD_KNOB_RADIUS - 6.0
	if delta.length() > max_dist and delta.length() > 0.001:
		delta = delta.normalized() * max_dist

	steer_pad_knob_offset = delta
	var axis := 0.0 if max_dist <= 0.001 else clampf(delta.x / max_dist, -1.0, 1.0)
	if abs(axis) < STEER_PAD_DEADZONE:
		axis = 0.0
	touch_steer_axis = axis
	_sync_steer_pad_visual()


func _update_steer_pad_from_global(global_pos: Vector2) -> void:
	if steer_pad_base == null or not is_instance_valid(steer_pad_base):
		return

	var rect := steer_pad_base.get_global_rect()
	var clamped := Vector2(
		clampf(global_pos.x, rect.position.x, rect.end.x),
		clampf(global_pos.y, rect.position.y, rect.end.y),
	)
	_update_steer_pad_from_local(clamped - rect.position)


func _release_steer_pad() -> void:
	steer_pad_active = false
	steer_pad_touch_index = -1
	steer_pad_knob_offset = Vector2.ZERO
	touch_steer_axis = 0.0
	_sync_steer_pad_visual()


func _wake_run_from_ui_input() -> void:
	if not run_started and run_finished and (game_over_overlay == null or not game_over_overlay.visible):
		_start_run()


func _begin_steer_pad(pointer_index: int, point: Vector2) -> void:
	_wake_run_from_ui_input()
	steer_pad_active = true
	steer_pad_touch_index = pointer_index
	_update_steer_pad_from_global(point)


func _is_point_in_steer_pad(point: Vector2) -> bool:
	if steer_pad_base == null or not is_instance_valid(steer_pad_base):
		return false
	return steer_pad_base.get_global_rect().has_point(point)


func _is_point_in_steer_zone(point: Vector2) -> bool:
	var vp_size := get_viewport_rect().size
	if vp_size.x <= 1.0 or vp_size.y <= 1.0:
		return false
	var nx := point.x / vp_size.x
	var ny := point.y / vp_size.y
	return nx >= 0.52 and ny >= 0.42


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

	var hud_bg := Panel.new()
	hud_bg.position = Vector2(8, 8)
	hud_bg.size = Vector2(240, 58)
	hud_bg.add_theme_stylebox_override(
		"panel",
		_make_stylebox(Color(0.07, 0.14, 0.24, 0.62), Color(0.68, 0.84, 0.98, 0.28), 10)
	)
	root.add_child(hud_bg)

	hud_label = Label.new()
	hud_label.position = Vector2(14, 12)
	hud_label.size = Vector2(226, 42)
	hud_label.add_theme_color_override("font_color", Color(0.95, 0.98, 1.0))
	_apply_ui_font(hud_label, 13)
	hud_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	hud_label.vertical_alignment = VERTICAL_ALIGNMENT_TOP
	hud_label.autowrap_mode = TextServer.AUTOWRAP_OFF
	root.add_child(hud_label)

	hint_label = null

	warning_panel = ColorRect.new()
	warning_panel.anchor_left = 0.5
	warning_panel.anchor_right = 0.5
	warning_panel.offset_left = -148
	warning_panel.offset_right = 148
	warning_panel.offset_top = 94
	warning_panel.offset_bottom = 126
	warning_panel.color = Color(0.86, 0.16, 0.16, 0.0)
	warning_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(warning_panel)

	warning_label = Label.new()
	warning_label.set_anchors_preset(Control.PRESET_FULL_RECT)
	warning_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	warning_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_apply_ui_font(warning_label, 14)
	warning_label.add_theme_color_override("font_color", Color(1, 1, 1, 0))
	warning_label.text = "코스로 돌아오세요"
	warning_panel.add_child(warning_label)

	var left_controls := VBoxContainer.new()
	left_controls.anchor_left = 0.0
	left_controls.anchor_right = 0.0
	left_controls.anchor_top = 1.0
	left_controls.anchor_bottom = 1.0
	left_controls.offset_left = 10
	left_controls.offset_right = 128
	left_controls.offset_top = -136
	left_controls.offset_bottom = -22
	left_controls.add_theme_constant_override("separation", 8)
	left_controls.mouse_filter = Control.MOUSE_FILTER_STOP
	root.add_child(left_controls)

	var brake_btn := _make_hold_button(
		"브레이크",
		func() -> void:
			_wake_run_from_ui_input()
			touch_brake = true,
		func() -> void:
			touch_brake = false,
		"brake"
	)
	var crouch_btn := _make_hold_button(
		"부스트",
		func() -> void:
			_wake_run_from_ui_input()
			touch_crouch = true,
		func() -> void:
			touch_crouch = false,
		"boost"
	)
	left_controls.add_child(brake_btn)
	left_controls.add_child(crouch_btn)

	var steer_wrap := Control.new()
	steer_wrap.anchor_left = 1.0
	steer_wrap.anchor_right = 1.0
	steer_wrap.anchor_top = 1.0
	steer_wrap.anchor_bottom = 1.0
	steer_wrap.offset_left = -140
	steer_wrap.offset_right = -12
	steer_wrap.offset_top = -140
	steer_wrap.offset_bottom = -12
	steer_wrap.mouse_filter = Control.MOUSE_FILTER_STOP
	root.add_child(steer_wrap)

	steer_pad_base = Panel.new()
	steer_pad_base.set_anchors_preset(Control.PRESET_FULL_RECT)
	steer_pad_base.add_theme_stylebox_override(
		"panel",
		_make_stylebox(Color(0.1, 0.2, 0.35, 0.88), Color(0.95, 0.86, 0.64, 0.52), 999)
	)
	steer_wrap.add_child(steer_pad_base)

	var steer_inner := Panel.new()
	steer_inner.position = Vector2(18, 18)
	steer_inner.size = Vector2(76, 76)
	steer_inner.mouse_filter = Control.MOUSE_FILTER_IGNORE
	steer_inner.add_theme_stylebox_override(
		"panel",
		_make_stylebox(Color(0.16, 0.29, 0.48, 0.46), Color(0.82, 0.92, 1.0, 0.24), 999)
	)
	steer_pad_base.add_child(steer_inner)

	var steer_center := Panel.new()
	steer_center.position = Vector2(52, 52)
	steer_center.size = Vector2(8, 8)
	steer_center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	steer_center.add_theme_stylebox_override(
		"panel",
		_make_stylebox(Color(0.9, 0.96, 1.0, 0.58), Color(0.9, 0.97, 1.0, 0.58), 999)
	)
	steer_pad_base.add_child(steer_center)

	steer_pad_knob = Panel.new()
	steer_pad_knob.mouse_filter = Control.MOUSE_FILTER_IGNORE
	steer_pad_knob.add_theme_stylebox_override(
		"panel",
		_make_stylebox(Color(0.86, 0.95, 1.0, 0.95), Color(0.74, 0.88, 1.0, 0.78), 999)
	)
	steer_pad_base.add_child(steer_pad_knob)
	_sync_steer_pad_visual()

	game_over_overlay = ColorRect.new()
	game_over_overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	game_over_overlay.color = Color(0.04, 0.08, 0.14, 0.54)
	game_over_overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	game_over_overlay.visible = false
	root.add_child(game_over_overlay)

	var popup_card := PanelContainer.new()
	popup_card.anchor_left = 0.5
	popup_card.anchor_right = 0.5
	popup_card.anchor_top = 0.5
	popup_card.anchor_bottom = 0.5
	popup_card.offset_left = -130
	popup_card.offset_right = 130
	popup_card.offset_top = -86
	popup_card.offset_bottom = 86
	game_over_overlay.add_child(popup_card)

	var popup_style := StyleBoxFlat.new()
	popup_style.bg_color = Color(0.07, 0.15, 0.26, 0.98)
	popup_style.border_color = Color(0.72, 0.86, 0.98, 0.5)
	popup_style.set_border_width_all(1)
	popup_style.corner_radius_top_left = 16
	popup_style.corner_radius_top_right = 16
	popup_style.corner_radius_bottom_left = 16
	popup_style.corner_radius_bottom_right = 16
	popup_card.add_theme_stylebox_override("panel", popup_style)

	var popup_box := VBoxContainer.new()
	popup_box.add_theme_constant_override("separation", 12)
	popup_box.custom_minimum_size = Vector2(220, 0)
	popup_card.add_child(popup_box)

	game_over_label = Label.new()
	game_over_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	game_over_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	game_over_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	game_over_label.text = "목숨을 모두 사용했습니다.\n다시 도전할까요?"
	game_over_label.add_theme_color_override("font_color", Color(0.92, 0.97, 1.0))
	_apply_ui_font(game_over_label, 14)
	popup_box.add_child(game_over_label)

	var actions := HBoxContainer.new()
	actions.add_theme_constant_override("separation", 10)
	actions.alignment = BoxContainer.ALIGNMENT_CENTER
	popup_box.add_child(actions)

	var cancel_btn := Button.new()
	cancel_btn.text = "아니오"
	cancel_btn.custom_minimum_size = Vector2(94, 40)
	_apply_ui_font(cancel_btn, 13)
	_apply_popup_button_theme(cancel_btn, false)
	cancel_btn.pressed.connect(_on_game_over_cancel_pressed)
	actions.add_child(cancel_btn)

	var restart_btn := Button.new()
	restart_btn.text = "다시 시작"
	restart_btn.custom_minimum_size = Vector2(108, 40)
	_apply_ui_font(restart_btn, 13)
	_apply_popup_button_theme(restart_btn, true)
	restart_btn.pressed.connect(_on_game_over_restart_pressed)
	actions.add_child(restart_btn)


func _setup_audio() -> void:
	bgm_player = AudioStreamPlayer.new()
	bgm_player.name = "BGMPlayer"
	bgm_player.bus = "Master"
	bgm_player.volume_db = -8.0
	add_child(bgm_player)

	var loaded_stream := load(BGM_PATH) as AudioStream
	if loaded_stream == null:
		push_warning("Failed to load BGM stream: %s" % BGM_PATH)
		return

	if loaded_stream is AudioStreamMP3:
		var mp3_stream := loaded_stream as AudioStreamMP3
		mp3_stream.loop = true

	bgm_player.stream = loaded_stream

	brake_sfx_player = AudioStreamPlayer.new()
	brake_sfx_player.name = "BrakeSFXPlayer"
	brake_sfx_player.bus = "Master"
	brake_sfx_player.volume_db = -6.0
	add_child(brake_sfx_player)

	var brake_sfx_stream := load(BRAKE_SFX_PATH) as AudioStream
	if brake_sfx_stream == null:
		push_warning("Failed to load brake SFX stream: %s" % BRAKE_SFX_PATH)
		return

	if brake_sfx_stream is AudioStreamMP3:
		var brake_mp3_stream := brake_sfx_stream as AudioStreamMP3
		brake_mp3_stream.loop = false

	brake_sfx_player.stream = brake_sfx_stream

	ski_loop_player = AudioStreamPlayer.new()
	ski_loop_player.name = "SkiLoopSFXPlayer"
	ski_loop_player.bus = "Master"
	ski_loop_player.volume_db = -13.0
	add_child(ski_loop_player)

	var ski_loop_stream := load(NORMAL_SKI_LOOP_SFX_PATH) as AudioStream
	if ski_loop_stream == null:
		push_warning("Failed to load normal ski loop SFX stream: %s" % NORMAL_SKI_LOOP_SFX_PATH)
	else:
		if ski_loop_stream is AudioStreamMP3:
			var ski_mp3_stream := ski_loop_stream as AudioStreamMP3
			ski_mp3_stream.loop = true
		ski_loop_player.stream = ski_loop_stream

	left_right_sfx_player = AudioStreamPlayer.new()
	left_right_sfx_player.name = "LeftRightSFXPlayer"
	left_right_sfx_player.bus = "Master"
	left_right_sfx_player.volume_db = -7.0
	add_child(left_right_sfx_player)

	var left_right_stream := load(LEFT_RIGHT_SFX_PATH) as AudioStream
	if left_right_stream == null:
		push_warning("Failed to load left/right SFX stream: %s" % LEFT_RIGHT_SFX_PATH)
	else:
		if left_right_stream is AudioStreamMP3:
			var left_right_mp3 := left_right_stream as AudioStreamMP3
			left_right_mp3.loop = false
		left_right_sfx_player.stream = left_right_stream


func _apply_audio_settings() -> void:
	if bgm_player != null:
		if not music_enabled:
			if bgm_player.playing:
				bgm_player.stop()
			bgm_player.stream_paused = false
		else:
			bgm_player.stream_paused = host_paused
			if not host_paused and run_started and not run_finished and not crashed and not bgm_player.playing:
				bgm_player.play()

	if brake_sfx_player != null and (host_paused or not sfx_enabled) and brake_sfx_player.playing:
		brake_sfx_player.stop()

	if left_right_sfx_player != null and (host_paused or not sfx_enabled) and left_right_sfx_player.playing:
		left_right_sfx_player.stop()

	if ski_loop_player != null:
		if host_paused and ski_loop_player.playing:
			ski_loop_player.stream_paused = true
		elif not sfx_enabled or not run_started or run_finished or crashed:
			if ski_loop_player.playing:
				ski_loop_player.stop()
			ski_loop_player.stream_paused = false
		else:
			ski_loop_player.stream_paused = false
			if not ski_loop_player.playing:
				ski_loop_player.play()


func _try_play_bgm() -> void:
	if bgm_player == null:
		return
	if host_paused or not music_enabled:
		return
	if bgm_player.stream == null:
		return
	if not bgm_player.playing:
		bgm_player.play()


func _update_offtrack_warning_ui(delta: float) -> void:
	offtrack_warning_strength = lerpf(offtrack_warning_strength, offtrack_warning_target, clampf(delta * 10.0, 0.05, 0.45))
	if warning_panel == null or warning_label == null:
		return

	if offtrack_warning_strength <= 0.02:
		warning_panel.color = Color(0.86, 0.16, 0.16, 0.0)
		warning_label.add_theme_color_override("font_color", Color(1, 1, 1, 0))
		return

	var t := float(Time.get_ticks_msec()) * 0.011
	var pulse := 0.55 + 0.45 * sin(t)
	var alpha := clampf(offtrack_warning_strength * (0.28 + 0.24 * pulse), 0.08, 0.58)
	var text_alpha := clampf(0.45 + offtrack_warning_strength * 0.55 + pulse * 0.08, 0.45, 1.0)
	warning_panel.color = Color(0.86, 0.16, 0.16, alpha)
	warning_label.add_theme_color_override("font_color", Color(1, 1, 1, text_alpha))


func _update_brake_sfx() -> void:
	var brake_pressed_now := (Input.is_action_pressed("brake") or touch_brake) and run_started and not run_finished and not crashed
	if brake_pressed_now and not _brake_was_pressed:
		_play_brake_sfx()
	_brake_was_pressed = brake_pressed_now


func _play_brake_sfx() -> void:
	if brake_sfx_player == null:
		return
	if host_paused or not sfx_enabled:
		return
	if brake_sfx_player.stream == null:
		return
	if brake_sfx_player.playing:
		brake_sfx_player.stop()
	brake_sfx_player.play()


func _try_play_ski_loop() -> void:
	if ski_loop_player == null:
		return
	if host_paused or not sfx_enabled:
		return
	if ski_loop_player.stream == null:
		return
	if not ski_loop_player.playing:
		ski_loop_player.play()


func _stop_ski_loop() -> void:
	if ski_loop_player == null:
		return
	if ski_loop_player.playing:
		ski_loop_player.stop()
	ski_loop_player.stream_paused = false


func _update_left_right_sfx() -> void:
	var active_run := run_started and not run_finished and not crashed
	var left_pressed_now := active_run and (Input.is_action_pressed("steer_left") or touch_left or touch_steer_axis < -STEER_PAD_DEADZONE)
	var right_pressed_now := active_run and (Input.is_action_pressed("steer_right") or touch_right or touch_steer_axis > STEER_PAD_DEADZONE)

	if (left_pressed_now and not _left_was_pressed) or (right_pressed_now and not _right_was_pressed):
		_play_left_right_sfx()

	_left_was_pressed = left_pressed_now
	_right_was_pressed = right_pressed_now


func _play_left_right_sfx() -> void:
	if left_right_sfx_player == null:
		return
	if host_paused or not sfx_enabled:
		return
	if left_right_sfx_player.stream == null:
		return
	if left_right_sfx_player.playing:
		left_right_sfx_player.stop()
	left_right_sfx_player.play()


func _make_hold_button(label: String, on_press: Callable, on_release: Callable, tone: String = "default") -> Button:
	var b := Button.new()
	b.text = label
	b.custom_minimum_size = Vector2(114, 48)
	_apply_ui_font(b, 13)
	_apply_hold_button_theme(b, tone)
	b.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	b.button_down.connect(on_press)
	b.button_up.connect(on_release)
	b.mouse_exited.connect(on_release)
	return b


func _on_start_pressed() -> void:
	_start_run()


func _on_game_over_restart_pressed() -> void:
	_hide_game_over_popup()
	_start_run()


func _on_game_over_cancel_pressed() -> void:
	_hide_game_over_popup()
	_set_status("게임 중단", 1.0)


func _set_difficulty(_next_difficulty: int) -> void:
	current_difficulty = DIFFICULTY_NORMAL
	_apply_difficulty_profile(true)
	_reset_run(false)
	_set_status("난이도: %s" % _difficulty_name(), 1.0)


func _difficulty_name() -> String:
	return "보통"


func _apply_difficulty_profile(notify: bool) -> void:
	current_difficulty = DIFFICULTY_NORMAL
	active_gravity = BASE_GRAVITY
	active_speed_visual_ref = 280.0
	active_start_speed = START_SPEED
	challenge_target = 560.0
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
	pass


func _start_run() -> void:
	_try_play_bgm()
	_reset_run(true)
	_set_status("출발!", 0.6)


func _reset_run(start_immediately: bool) -> void:
	run_started = start_immediately
	run_finished = false
	crashed = false
	crash_timer = 0.0
	run_time = 0.0
	style_score = 0
	crash_count = 0
	lives_remaining = MAX_LIVES
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
	reward_particles.clear()
	reward_wave_timer = 0.0
	reward_screen_pulse = 0.0
	_hide_game_over_popup()


func _touch_reset() -> void:
	touch_steer_axis = 0.0
	touch_left = false
	touch_right = false
	touch_brake = false
	touch_crouch = false
	steer_pad_active = false
	steer_pad_touch_index = -1
	steer_pad_knob_offset = Vector2.ZERO
	_brake_was_pressed = false
	_left_was_pressed = false
	_right_was_pressed = false
	offtrack_warning_target = 0.0
	offtrack_warning_strength = 0.0
	_sync_steer_pad_visual()


func _set_status(text: String, ttl: float) -> void:
	status_text = text
	status_timer = ttl


func _update_ui_text() -> void:
	if hud_label == null:
		return

	var cp_now: int = maxi(0, last_checkpoint + 1)
	var best_label := "--:--.--" if best_time == INF else _fmt_time(best_time)
	var speed_kmh := int(round(forward_speed * 0.42))
	var main_line := "시간 %s  최고 %s" % [_fmt_time(run_time), best_label]
	var sub_line := "체크 %d/%d  속도 %dkm/h  목숨 %d/%d" % [
		cp_now,
		checkpoints.size(),
		speed_kmh,
		lives_remaining,
		MAX_LIVES,
	]
	hud_label.text = "%s\n%s" % [main_line, sub_line]

	if hint_label != null:
		hint_label.text = ""


func _fmt_time(sec: float) -> String:
	var s: float = maxf(0.0, sec)
	var m := int(floor(s / 60.0))
	var r: float = s - float(m) * 60.0
	return "%02d:%05.2f" % [m, r]


func _load_records() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(save_path) == OK:
		best_time = float(cfg.get_value("records", "best_time", INF))
		best_style = int(cfg.get_value("records", "best_style", 0))


func _save_records() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("records", "best_time", best_time)
	cfg.set_value("records", "best_style", max(best_style, style_score))
	cfg.save(save_path)


func _unhandled_input(event: InputEvent) -> void:
	if host_paused:
		return
	if game_over_overlay != null and game_over_overlay.visible:
		return

	var user_interaction_started := false
	if event is InputEventScreenTouch:
		var e_touch := event as InputEventScreenTouch
		if e_touch.pressed:
			user_interaction_started = true
	elif event is InputEventMouseButton:
		var e_mouse := event as InputEventMouseButton
		if e_mouse.pressed:
			user_interaction_started = true
	elif event is InputEventKey:
		var e_key := event as InputEventKey
		if e_key.pressed and not e_key.echo:
			user_interaction_started = true

	if user_interaction_started:
		_try_play_bgm()
		if run_started and not run_finished and not crashed:
			_try_play_ski_loop()
		elif not run_started and run_finished:
			_start_run()
			return

	if event.is_action_pressed("restart_run") and not run_started:
		_start_run()


func _input(event: InputEvent) -> void:
	if steer_pad_base == null:
		return
	if host_paused or (game_over_overlay != null and game_over_overlay.visible):
		_release_steer_pad()
		return

	if event is InputEventScreenTouch:
		var touch := event as InputEventScreenTouch
		if touch.pressed and (_is_point_in_steer_pad(touch.position) or _is_point_in_steer_zone(touch.position)):
			_begin_steer_pad(touch.index, touch.position)
			get_viewport().set_input_as_handled()
			return
		if steer_pad_active and touch.index == steer_pad_touch_index and not touch.pressed:
			_release_steer_pad()
			get_viewport().set_input_as_handled()
			return

	if event is InputEventScreenDrag:
		var drag := event as InputEventScreenDrag
		if steer_pad_active and drag.index == steer_pad_touch_index:
			_update_steer_pad_from_global(drag.position)
			get_viewport().set_input_as_handled()
			return

	if event is InputEventMouseButton:
		var mb := event as InputEventMouseButton
		if mb.button_index != MOUSE_BUTTON_LEFT:
			return
		if mb.pressed and (_is_point_in_steer_pad(mb.position) or _is_point_in_steer_zone(mb.position)):
			_begin_steer_pad(-2, mb.position)
			get_viewport().set_input_as_handled()
			return
		if steer_pad_active and steer_pad_touch_index == -2 and not mb.pressed:
			_release_steer_pad()
			get_viewport().set_input_as_handled()
			return

	if event is InputEventMouseMotion and steer_pad_active and steer_pad_touch_index == -2:
		var mm := event as InputEventMouseMotion
		_update_steer_pad_from_global(mm.position)
		get_viewport().set_input_as_handled()


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
	_draw_reward_fx(min_y, max_y, cam_pos, cam_zoom)


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
