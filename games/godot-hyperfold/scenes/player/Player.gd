extends CharacterBody2D
class_name HyperfoldPlayer

# 플레이어 입력 이벤트를 Main으로 전달하는 신호.
signal rewind_requested
signal layer_switch_requested

@export var move_speed: float = 210.0

# 플레이어가 이동 가능한 영역(화면 안쪽) 경계.
var _move_bounds: Rect2 = Rect2(16, 72, 328, 552)

# 현재 w-레이어(0~3).
var layer_id: int = 0

# 고스트 상태(리와인드 미리보기 중) 여부.
var _ghost_mode: bool = false

# 피격 방어용 크로노 실드 스택.
var shield_stack: int = 0

@onready var collision_shape: CollisionShape2D = $CollisionShape2D

func _ready() -> void:
	add_to_group("player")

func _physics_process(_delta: float) -> void:
	# 고스트 상태에서도 이동은 허용한다(요구사항 반영).
	var input_dir := Vector2(
		Input.get_axis("move_left", "move_right"),
		Input.get_axis("move_up", "move_down")
	)

	if input_dir.length() > 1.0:
		input_dir = input_dir.normalized()

	var speed_mul := 1.15 if _ghost_mode else 1.0
	velocity = input_dir * move_speed * speed_mul
	move_and_slide()

	# 경계 밖으로 나가지 않게 고정.
	global_position.x = clampf(global_position.x, _move_bounds.position.x, _move_bounds.position.x + _move_bounds.size.x)
	global_position.y = clampf(global_position.y, _move_bounds.position.y, _move_bounds.position.y + _move_bounds.size.y)

	# W 키로 레이어 순환 요청.
	if Input.is_action_just_pressed("switch_layer"):
		layer_switch_requested.emit()

	# R 키로 리와인드 요청.
	if Input.is_action_just_pressed("rewind"):
		rewind_requested.emit()

func set_move_bounds(bounds: Rect2) -> void:
	_move_bounds = bounds

func set_layer(new_layer: int) -> void:
	layer_id = clampi(new_layer, 0, 3)

func set_ghost_mode(enabled: bool) -> void:
	_ghost_mode = enabled
	modulate.a = 0.45 if enabled else 1.0
	# 고스트 상태에서는 충돌을 꺼서 과거 경로 관찰에 집중하도록 한다.
	collision_shape.set_deferred("disabled", enabled)

func is_ghost_mode() -> bool:
	return _ghost_mode

func add_shield(amount: int) -> void:
	shield_stack = max(0, shield_stack + amount)

func consume_hit() -> bool:
	# true 반환: 데미지 흡수 성공
	if shield_stack > 0:
		shield_stack -= 1
		return true
	return false

func get_snapshot() -> Dictionary:
	# 리와인드용 상태 저장.
	return {
		"position": global_position,
		"velocity": velocity,
		"layer_id": layer_id,
		"ghost": _ghost_mode,
		"shield": shield_stack,
	}

func apply_snapshot(data: Dictionary) -> void:
	if data.has("position"):
		global_position = data["position"]
	if data.has("velocity"):
		velocity = data["velocity"]
	if data.has("layer_id"):
		layer_id = int(data["layer_id"])
	if data.has("shield"):
		shield_stack = int(data["shield"])
	# 복원 시에는 고스트를 강제로 끄고 현실 상태로 전환한다.
	set_ghost_mode(false)
