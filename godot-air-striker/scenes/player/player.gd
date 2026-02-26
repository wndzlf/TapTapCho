extends Area2D

signal shoot(spawn_pos: Vector2)
signal player_hit

@export var speed := 240.0
@export var fire_interval := 0.16

var _cooldown := 0.0
var _alive := true

func _ready() -> void:
	add_to_group("player")
	area_entered.connect(_on_area_entered)

func _physics_process(delta: float) -> void:
	if not _alive:
		return

	var move := Vector2.ZERO
	move.x = Input.get_axis("move_left", "move_right")
	move.y = Input.get_axis("move_up", "move_down")
	position += move.normalized() * speed * delta

	position.x = clamp(position.x, 24.0, 336.0)
	position.y = clamp(position.y, 70.0, 610.0)

	_cooldown = max(0.0, _cooldown - delta)
	if Input.is_action_pressed("shoot") and _cooldown <= 0.0:
		_cooldown = fire_interval
		shoot.emit(global_position + Vector2(0, -20))

func set_alive(value: bool) -> void:
	_alive = value
	visible = value
	monitoring = value

func _on_area_entered(area: Area2D) -> void:
	if not _alive:
		return
	if area.is_in_group("enemy"):
		player_hit.emit()
