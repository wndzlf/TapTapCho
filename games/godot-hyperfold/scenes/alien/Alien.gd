extends CharacterBody2D
class_name HyperfoldAlien

# 플레이어와 접촉했을 때 Main으로 알리는 신호.
signal touched_player

@export var base_speed: float = 150.0
@export var seek_repath_interval: float = 0.25

var layer_id: int = 0
var alien_index: int = 0

var _main_controller: Node = null
var _layer_manager: LayerManager = null
var _repath_cd: float = 0.0
var _target_point: Vector2 = Vector2.ZERO
var _ghost_mode: bool = false

@onready var collision_shape: CollisionShape2D = $CollisionShape2D

func _ready() -> void:
	add_to_group("alien")

func setup(main_controller: Node, layer_manager: LayerManager, index: int) -> void:
	_main_controller = main_controller
	_layer_manager = layer_manager
	alien_index = index

func _physics_process(delta: float) -> void:
	if _main_controller == null or _layer_manager == null:
		return

	# 현재 활성 레이어와 맞지 않으면 숨김 처리(4D 투영 느낌).
	_layer_manager.apply_entity_visibility(self, layer_id, _ghost_mode)
	collision_shape.disabled = layer_id != _layer_manager.active_layer

	if _ghost_mode:
		velocity = Vector2.ZERO
		move_and_slide()
		return

	_repath_cd -= delta
	if _repath_cd <= 0.0:
		_repath_cd = seek_repath_interval
		_update_target_point()

	var dir := (_target_point - global_position)
	if dir.length() > 1.0:
		dir = dir.normalized()

	# 레벨이 오를수록 외계인 속도가 조금씩 증가하도록 메인에서 보정치를 받는다.
	var level_speed_mul := 1.0
	if _main_controller.has_method("get_alien_speed_multiplier"):
		level_speed_mul = _main_controller.get_alien_speed_multiplier()

	velocity = dir * base_speed * level_speed_mul
	move_and_slide()

	# 플레이어 접촉 판정(같은 레이어에서만 의미 있음).
	if layer_id == _layer_manager.active_layer and _main_controller.has_method("get_player_position"):
		var player_pos: Vector2 = _main_controller.get_player_position()
		if global_position.distance_to(player_pos) < 22.0:
			touched_player.emit()

func _update_target_point() -> void:
	if _main_controller == null:
		return

	# 목표 우선순위:
	# 1) 골든 웨폰이 활성화되어 있으면 웨폰 추적
	# 2) 아니면 플레이어 추적
	var wants_weapon := false
	var weapon_layer := 0
	var weapon_pos := Vector2.ZERO

	if _main_controller.has_method("is_weapon_claimable") and _main_controller.is_weapon_claimable():
		wants_weapon = true
		weapon_layer = _main_controller.get_weapon_layer()
		weapon_pos = _main_controller.get_weapon_position()

	var desired_layer := layer_id
	var final_goal := global_position

	if wants_weapon:
		desired_layer = weapon_layer
		final_goal = weapon_pos
	else:
		desired_layer = _main_controller.get_player_layer()
		final_goal = _main_controller.get_player_position()

	# 다른 레이어면 먼저 게이트 포인트로 접근 후 레이어 변경.
	if desired_layer != layer_id:
		var gate := _layer_manager.get_nearest_gate_position(layer_id, desired_layer, global_position)
		_target_point = gate
		if global_position.distance_to(gate) < 14.0:
			layer_id = desired_layer
		return

	# 같은 레이어면 최종 목표로 바로 이동.
	_target_point = final_goal

func set_ghost_mode(enabled: bool) -> void:
	_ghost_mode = enabled
	if enabled:
		modulate = Color(0.6, 1.0, 0.8, 0.4)
	else:
		modulate = Color(1, 1, 1, 1)

func force_repath() -> void:
	# 리와인드 직후 미래 경로를 즉시 다시 계산.
	_repath_cd = 0.0

func get_snapshot() -> Dictionary:
	return {
		"position": global_position,
		"velocity": velocity,
		"layer_id": layer_id,
	}

func apply_snapshot(data: Dictionary) -> void:
	if data.has("position"):
		global_position = data["position"]
	if data.has("velocity"):
		velocity = data["velocity"]
	if data.has("layer_id"):
		layer_id = int(data["layer_id"])
	set_ghost_mode(false)
	force_repath()
