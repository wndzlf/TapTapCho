extends Node2D

const ALIEN_SCENE: PackedScene = preload("res://scenes/alien/Alien.tscn")
const SAVE_DATA_SCRIPT := preload("res://scripts/HyperfoldSaveData.gd")

const SAVE_PATH := "user://hyperfold_save.tres"
const LEVEL_MAX := 10

# 레이어별 고정 레이아웃 데이터.
# TileMapLayer는 비주얼/확장 포인트로 두고,
# 실제 충돌 벽/아이템 배치는 코드로 생성한다.
const LAYER_LAYOUTS := {
	0: {
		"player_spawn": Vector2(180, 572),
		"weapon_spawn": Vector2(286, 112),
		"alien_spawns": [Vector2(56, 112), Vector2(300, 160), Vector2(80, 430)],
		"obstacles": [
			Rect2(54, 212, 70, 16),
			Rect2(186, 172, 120, 18),
			Rect2(92, 352, 180, 16),
		],
		"powerups": [
			{"id": "L0_C0", "type": "chrono_shield", "pos": Vector2(86, 148)},
			{"id": "L0_D0", "type": "dimension_jump", "pos": Vector2(272, 456)},
		],
	},
	1: {
		"player_spawn": Vector2(90, 562),
		"weapon_spawn": Vector2(66, 124),
		"alien_spawns": [Vector2(288, 106), Vector2(244, 364), Vector2(80, 230)],
		"obstacles": [
			Rect2(40, 270, 150, 16),
			Rect2(214, 226, 92, 16),
			Rect2(146, 420, 170, 18),
		],
		"powerups": [
			{"id": "L1_C0", "type": "chrono_shield", "pos": Vector2(272, 146)},
			{"id": "L1_D0", "type": "dimension_jump", "pos": Vector2(90, 470)},
		],
	},
	2: {
		"player_spawn": Vector2(264, 560),
		"weapon_spawn": Vector2(176, 102),
		"alien_spawns": [Vector2(76, 118), Vector2(278, 202), Vector2(118, 300)],
		"obstacles": [
			Rect2(52, 192, 250, 16),
			Rect2(72, 318, 84, 16),
			Rect2(188, 392, 128, 16),
		],
		"powerups": [
			{"id": "L2_C0", "type": "chrono_shield", "pos": Vector2(96, 436)},
			{"id": "L2_D0", "type": "dimension_jump", "pos": Vector2(258, 150)},
		],
	},
	3: {
		"player_spawn": Vector2(188, 556),
		"weapon_spawn": Vector2(306, 136),
		"alien_spawns": [Vector2(62, 142), Vector2(258, 210), Vector2(272, 418)],
		"obstacles": [
			Rect2(60, 246, 102, 16),
			Rect2(190, 266, 118, 16),
			Rect2(96, 396, 178, 16),
		],
		"powerups": [
			{"id": "L3_C0", "type": "chrono_shield", "pos": Vector2(298, 470)},
			{"id": "L3_D0", "type": "dimension_jump", "pos": Vector2(70, 182)},
		],
	},
}

@onready var world: Node2D = $World
@onready var layers_root: Node2D = $World/Layers
@onready var player: HyperfoldPlayer = $World/Player
@onready var aliens_root: Node2D = $World/Aliens
@onready var golden_weapon: HyperfoldGoldenWeapon = $World/GoldenWeapon
@onready var fx_particles: CPUParticles2D = $World/SwitchFx
@onready var ghost_player_path: Line2D = $World/GhostPlayerPath
@onready var ghost_alien_path: Line2D = $World/GhostAlienPath

@onready var layer_manager: LayerManager = $LayerManager
@onready var rewind_manager: RewindManager = $RewindManager
@onready var ui = $UI

var save_data: HyperfoldSaveData

var current_level: int = 1
var endless_mode: bool = false
var round_running: bool = false

var round_time: float = 0.0
var round_limit: float = 90.0
var weapon_spawn_time: float = 7.0
var weapon_target_layer: int = 2
var _player_hit_cd: float = 0.0

# 아이디 -> Powerup 노드
var powerup_nodes: Dictionary = {}

func _ready() -> void:
	randomize()
	_build_layer_obstacles_and_items()

	layer_manager.layer_changed.connect(_on_layer_changed)
	layer_manager.layer_switch_fx.connect(_on_layer_switch_fx)

	rewind_manager.rewind_started.connect(_on_rewind_started)
	rewind_manager.rewind_apply.connect(_on_rewind_apply)
	rewind_manager.rewind_finished.connect(_on_rewind_finished)

	player.layer_switch_requested.connect(_on_player_layer_switch_requested)
	player.rewind_requested.connect(_on_rewind_requested)
	player.set_move_bounds(Rect2(18, 72, 324, 548))

	ui.layer_slider_changed.connect(_on_ui_layer_slider_changed)
	ui.rewind_pressed.connect(_on_rewind_requested)

	golden_weapon.claimed.connect(_on_weapon_claimed)

	_load_save_data()
	_start_round(current_level, false)

func _physics_process(delta: float) -> void:
	if _player_hit_cd > 0.0:
		_player_hit_cd = max(0.0, _player_hit_cd - delta)

	if not round_running:
		if Input.is_action_just_pressed("restart_round"):
			_start_round(current_level, endless_mode)
		return

	if rewind_manager.is_rewinding():
		# 리와인드 중에는 시간 축을 멈추고 관찰만 하게 처리.
		_sync_ui()
		return

	round_time += delta
	if round_time >= round_limit:
		_end_round(false, "시간 초과")
		return

	# 특정 시간 + 레이어 조건에서만 골든 웨폰 활성화.
	if round_time >= weapon_spawn_time and not golden_weapon.active and not golden_weapon.claimed_once:
		golden_weapon.set_active(true, layer_manager.active_layer)
		ui.show_message("골든 웨폰 등장! W%d 레이어" % weapon_target_layer, 1.8)

	_check_player_vs_aliens_contact()

	# 리와인드용 상태를 0.1초 간격으로 저장.
	rewind_manager.record_state(delta, _capture_state())

	_sync_ui()

func _build_layer_obstacles_and_items() -> void:
	powerup_nodes.clear()

	for layer_id in range(4):
		var obstacles_root := layer_manager.get_layer_obstacles_node(layer_id)
		var items_root := layer_manager.get_layer_items_node(layer_id)
		if obstacles_root == null or items_root == null:
			continue

		for c in obstacles_root.get_children():
			c.queue_free()
		for c in items_root.get_children():
			c.queue_free()

		var layout: Dictionary = LAYER_LAYOUTS[layer_id]

		for rect: Rect2 in layout["obstacles"]:
			obstacles_root.add_child(_create_obstacle(rect, layer_id))

		for item_data: Dictionary in layout["powerups"]:
			var node := _create_powerup(item_data, layer_id)
			items_root.add_child(node)
			powerup_nodes[item_data["id"]] = node

func _create_obstacle(rect: Rect2, layer_id: int) -> StaticBody2D:
	var body := StaticBody2D.new()
	body.name = "Wall_%d_%d" % [layer_id, int(rect.position.x)]
	body.position = rect.position

	var shape := CollisionShape2D.new()
	var box := RectangleShape2D.new()
	box.size = rect.size
	shape.shape = box
	shape.position = rect.size * 0.5
	body.add_child(shape)

	# 시각적으로 벽을 구분하기 위한 단순 폴리곤.
	var poly := Polygon2D.new()
	poly.polygon = PackedVector2Array([
		Vector2(0, 0),
		Vector2(rect.size.x, 0),
		Vector2(rect.size.x, rect.size.y),
		Vector2(0, rect.size.y),
	])
	poly.color = Color.from_hsv(0.55 + layer_id * 0.08, 0.48, 0.85, 0.85)
	body.add_child(poly)

	return body

func _create_powerup(item_data: Dictionary, layer_id: int) -> Area2D:
	var p := Powerup.new()
	p.powerup_type = item_data["type"]
	p.layer_id = layer_id
	p.name = item_data["id"]
	p.position = item_data["pos"]

	var sprite := Sprite2D.new()
	if p.powerup_type == "chrono_shield":
		sprite.texture = load("res://assets/kenney_alien-ufo-pack/PNG/laserBlue_burst.png")
		sprite.modulate = Color(0.62, 0.95, 1.0)
	else:
		sprite.texture = load("res://assets/kenney_alien-ufo-pack/PNG/laserPink_burst.png")
		sprite.modulate = Color(1.0, 0.72, 0.92)
	sprite.scale = Vector2(0.8, 0.8)
	p.add_child(sprite)

	var shape := CollisionShape2D.new()
	var circle := CircleShape2D.new()
	circle.radius = 10.0
	shape.shape = circle
	p.add_child(shape)

	p.picked.connect(_on_powerup_picked)
	return p

func _start_round(level: int, keep_endless: bool) -> void:
	current_level = clampi(level, 1, LEVEL_MAX)
	endless_mode = keep_endless
	round_running = true
	round_time = 0.0
	_player_hit_cd = 0.0

	player.shield_stack = 0
	player.set_ghost_mode(false)
	layer_manager.set_active_layer(0, false)
	player.set_layer(0)
	player.global_position = LAYER_LAYOUTS[0]["player_spawn"]

	# 아이템 상태 리셋.
	for p: Powerup in powerup_nodes.values():
		p.set_collected(false)
		p.set_active_for_layer(layer_manager.active_layer)

	_spawn_aliens_for_level()
	_configure_weapon_for_round()
	rewind_manager.clear_buffer()

	ui.show_message("레벨 %d 시작" % current_level, 1.2)
	_sync_ui()

func _spawn_aliens_for_level() -> void:
	for c in aliens_root.get_children():
		c.queue_free()

	var base_count := 1 + int(floor(float(current_level - 1) / 2.0))
	var alien_count := clampi(base_count + (1 if endless_mode else 0), 1, 6)

	for i in range(alien_count):
		var alien := ALIEN_SCENE.instantiate() as HyperfoldAlien
		var layer_id := (i + 1) % 4
		var spawns: Array = LAYER_LAYOUTS[layer_id]["alien_spawns"]
		alien.layer_id = layer_id
		alien.global_position = spawns[i % spawns.size()]
		alien.setup(self, layer_manager, i)
		alien.touched_player.connect(_on_player_hit)
		aliens_root.add_child(alien)

func _configure_weapon_for_round() -> void:
	weapon_spawn_time = 7.0 + float(min(current_level - 1, 9)) * 0.35
	weapon_target_layer = (current_level + 1) % 4
	if endless_mode:
		weapon_target_layer = randi() % 4

	var weapon_pos: Vector2 = LAYER_LAYOUTS[weapon_target_layer]["weapon_spawn"]
	golden_weapon.reset_claim()
	golden_weapon.configure(weapon_target_layer, weapon_pos)
	golden_weapon.set_active(false, layer_manager.active_layer)

func _on_layer_switch_fx(_layer: int) -> void:
	# 테서랙트 투영 느낌의 간단 왜곡 파티클.
	fx_particles.global_position = player.global_position
	fx_particles.emitting = false
	fx_particles.emitting = true

func _on_layer_changed(new_layer: int, _old_layer: int) -> void:
	player.set_layer(new_layer)
	golden_weapon.refresh_by_layer(new_layer)
	for p: Powerup in powerup_nodes.values():
		p.set_active_for_layer(new_layer)
	ui.set_layer(new_layer)

func _on_player_layer_switch_requested() -> void:
	if not round_running or rewind_manager.is_rewinding():
		return
	layer_manager.cycle_layer()

func _on_ui_layer_slider_changed(layer_id: int) -> void:
	if not round_running or rewind_manager.is_rewinding():
		return
	layer_manager.set_active_layer(layer_id, true)

func _on_rewind_requested() -> void:
	if not round_running:
		return
	if rewind_manager.request_rewind():
		ui.show_message("시간 되감기 시작", 0.9)
	else:
		ui.show_message("리와인드 데이터가 아직 부족합니다", 0.8)

func _on_rewind_started(_snapshot: Dictionary, player_path: PackedVector2Array, alien_path: PackedVector2Array) -> void:
	player.set_ghost_mode(true)
	for a: HyperfoldAlien in aliens_root.get_children():
		a.set_ghost_mode(true)

	ghost_player_path.points = player_path
	ghost_alien_path.points = alien_path

func _on_rewind_apply(snapshot: Dictionary) -> void:
	_apply_snapshot(snapshot)

func _on_rewind_finished() -> void:
	player.set_ghost_mode(false)
	for a: HyperfoldAlien in aliens_root.get_children():
		a.set_ghost_mode(false)
		a.force_repath()

	ghost_player_path.clear_points()
	ghost_alien_path.clear_points()
	ui.show_message("리와인드 완료", 0.8)

func _on_powerup_picked(powerup: Powerup) -> void:
	if powerup.powerup_type == "chrono_shield":
		player.add_shield(1)
		ui.show_message("크로노 실드 +1", 0.9)
	else:
		# 디멘션 점프: 즉시 다음 레이어로 이동.
		layer_manager.cycle_layer()
		ui.show_message("디멘션 점프!", 0.9)

	powerup.set_collected(true)
	powerup.set_active_for_layer(layer_manager.active_layer)

func _on_weapon_claimed(winner: String) -> void:
	if not round_running:
		return
	if winner == "player":
		_end_round(true, "골든 웨폰 확보 성공")
	else:
		_end_round(false, "외계인이 골든 웨폰 선점")

func _on_player_hit() -> void:
	if _player_hit_cd > 0.0 or rewind_manager.is_rewinding() or player.is_ghost_mode():
		return

	_player_hit_cd = 0.8
	if player.consume_hit():
		ui.show_message("실드로 피해 흡수", 0.7)
		return

	# 실드가 없으면 즉시 패배 처리.
	_end_round(false, "플레이어 격추")

func _check_player_vs_aliens_contact() -> void:
	if rewind_manager.is_rewinding() or player.is_ghost_mode():
		return

	for a: HyperfoldAlien in aliens_root.get_children():
		if a.layer_id != layer_manager.active_layer:
			continue
		if a.global_position.distance_to(player.global_position) < 22.0:
			_on_player_hit()
			return

func _end_round(player_won: bool, reason: String) -> void:
	round_running = false
	golden_weapon.set_active(false, layer_manager.active_layer)

	if player_won:
		save_data.total_wins += 1
		save_data.best_finish_time = min(save_data.best_finish_time, round_time)

		if current_level < LEVEL_MAX:
			current_level += 1
			save_data.unlocked_level = max(save_data.unlocked_level, current_level)
		elif save_data.endless_unlocked:
			endless_mode = true
		else:
			save_data.endless_unlocked = true

		ui.set_status("승리 - %s" % reason)
		ui.show_message("승리! [Space/Enter] 다음 라운드", 2.2)
	else:
		ui.set_status("실패 - %s" % reason)
		ui.show_message("실패! [Space/Enter] 재도전", 2.0)

	_save_save_data()
	_sync_ui()

func _capture_state() -> Dictionary:
	var alien_states: Array[Dictionary] = []
	for a: HyperfoldAlien in aliens_root.get_children():
		alien_states.append(a.get_snapshot())

	var powerup_state := {}
	for key in powerup_nodes.keys():
		var p: Powerup = powerup_nodes[key]
		powerup_state[key] = p.get_snapshot()

	return {
		"round_time": round_time,
		"level": current_level,
		"endless": endless_mode,
		"active_layer": layer_manager.active_layer,
		"player": player.get_snapshot(),
		"aliens": alien_states,
		"weapon": golden_weapon.get_snapshot(),
		"powerups": powerup_state,
	}

func _apply_snapshot(snapshot: Dictionary) -> void:
	if snapshot.has("round_time"):
		round_time = snapshot["round_time"]
	if snapshot.has("active_layer"):
		layer_manager.set_active_layer(int(snapshot["active_layer"]), false)
	if snapshot.has("player"):
		player.apply_snapshot(snapshot["player"])

	if snapshot.has("weapon"):
		golden_weapon.apply_snapshot(snapshot["weapon"], layer_manager.active_layer)

	if snapshot.has("aliens"):
		var states: Array = snapshot["aliens"]
		# 수를 맞춰서 안전하게 복원.
		while aliens_root.get_child_count() < states.size():
			var extra := ALIEN_SCENE.instantiate() as HyperfoldAlien
			extra.setup(self, layer_manager, aliens_root.get_child_count())
			extra.touched_player.connect(_on_player_hit)
			aliens_root.add_child(extra)
		while aliens_root.get_child_count() > states.size():
			aliens_root.get_child(aliens_root.get_child_count() - 1).queue_free()

		for i in range(states.size()):
			var a := aliens_root.get_child(i) as HyperfoldAlien
			a.apply_snapshot(states[i])

	if snapshot.has("powerups"):
		var ps: Dictionary = snapshot["powerups"]
		for key in ps.keys():
			if not powerup_nodes.has(key):
				continue
			var p: Powerup = powerup_nodes[key]
			p.apply_snapshot(ps[key])
			p.set_active_for_layer(layer_manager.active_layer)

	# 리와인드 복원 뒤에는 다시 진행 상태로 유지.
	round_running = true
	_sync_ui()

func _sync_ui() -> void:
	ui.set_level(current_level, endless_mode)
	ui.set_layer(layer_manager.active_layer)
	ui.set_timer(round_time, weapon_spawn_time)
	ui.set_rewind_status(rewind_manager.can_rewind(), rewind_manager.is_rewinding())
	ui.set_status("Shield:%d  Alien:%d  Goal:W%d" % [player.shield_stack, aliens_root.get_child_count(), weapon_target_layer])

func _load_save_data() -> void:
	if ResourceLoader.exists(SAVE_PATH):
		save_data = ResourceLoader.load(SAVE_PATH) as HyperfoldSaveData
	else:
		save_data = SAVE_DATA_SCRIPT.new()

	if save_data == null:
		save_data = SAVE_DATA_SCRIPT.new()

	# 저장 데이터 반영.
	current_level = clampi(save_data.unlocked_level, 1, LEVEL_MAX)
	endless_mode = false

func _save_save_data() -> void:
	ResourceSaver.save(save_data, SAVE_PATH)

# ===== Alien이 호출하는 공개 API =====
func get_player_position() -> Vector2:
	return player.global_position

func get_player_layer() -> int:
	return layer_manager.active_layer

func get_alien_speed_multiplier() -> float:
	# 레벨 진행에 따라 약간씩 난이도를 올린다.
	var base := 1.0 + float(current_level - 1) * 0.04
	if endless_mode:
		base += 0.2
	return base

func is_weapon_claimable() -> bool:
	return golden_weapon.active and (not golden_weapon.claimed_once)

func get_weapon_layer() -> int:
	return golden_weapon.weapon_layer

func get_weapon_position() -> Vector2:
	return golden_weapon.global_position
