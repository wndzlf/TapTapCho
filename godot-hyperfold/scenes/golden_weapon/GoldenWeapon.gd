extends Area2D
class_name HyperfoldGoldenWeapon

# winner: "player" | "alien"
signal claimed(winner: String)

var active: bool = false
var claimed_once: bool = false
var weapon_layer: int = 2

@onready var collision_shape: CollisionShape2D = $CollisionShape2D

func _ready() -> void:
	body_entered.connect(_on_body_entered)
	set_process(true)

func configure(layer_id: int, pos: Vector2) -> void:
	weapon_layer = clampi(layer_id, 0, 3)
	global_position = pos

func set_active(value: bool, current_layer: int) -> void:
	active = value
	_update_visibility(current_layer)

func mark_claimed() -> void:
	claimed_once = true
	active = false
	visible = false
	monitoring = false
	monitorable = false
	collision_shape.disabled = true

func reset_claim() -> void:
	claimed_once = false

func _update_visibility(current_layer: int) -> void:
	# 2D 화면에서는 현재 활성 레이어와 무기 레이어가 같을 때만 보이도록 처리.
	var show := active and not claimed_once and current_layer == weapon_layer
	visible = show
	monitoring = show
	monitorable = show
	collision_shape.disabled = not show

func refresh_by_layer(current_layer: int) -> void:
	_update_visibility(current_layer)

func _on_body_entered(body: Node) -> void:
	if not active or claimed_once:
		return

	if body.is_in_group("player"):
		claimed_once = true
		claimed.emit("player")
		return

	if body.is_in_group("alien"):
		claimed_once = true
		claimed.emit("alien")

func get_snapshot() -> Dictionary:
	return {
		"active": active,
		"claimed_once": claimed_once,
		"weapon_layer": weapon_layer,
		"position": global_position,
	}

func apply_snapshot(data: Dictionary, current_layer: int) -> void:
	if data.has("position"):
		global_position = data["position"]
	if data.has("weapon_layer"):
		weapon_layer = int(data["weapon_layer"])
	if data.has("claimed_once"):
		claimed_once = bool(data["claimed_once"])
	if data.has("active"):
		active = bool(data["active"])
	_update_visibility(current_layer)
