extends Area2D
class_name Powerup

signal picked(powerup: Powerup)

# "chrono_shield" | "dimension_jump"
@export var powerup_type: String = "chrono_shield"
@export var layer_id: int = 0

var collected: bool = false

@onready var collision_shape: CollisionShape2D = $CollisionShape2D

func _ready() -> void:
	body_entered.connect(_on_body_entered)

func set_active_for_layer(active_layer: int) -> void:
	var enabled := (layer_id == active_layer) and (not collected)
	visible = enabled
	monitoring = enabled
	monitorable = enabled
	collision_shape.disabled = not enabled

func set_collected(value: bool) -> void:
	collected = value
	# 레이어 갱신 전에는 일단 숨겨둔다.
	visible = false
	monitoring = false
	monitorable = false
	collision_shape.disabled = true

func _on_body_entered(body: Node) -> void:
	if collected:
		return
	if body.is_in_group("player"):
		collected = true
		picked.emit(self)

func get_snapshot() -> Dictionary:
	return {
		"collected": collected,
	}

func apply_snapshot(data: Dictionary) -> void:
	if data.has("collected"):
		set_collected(bool(data["collected"]))
