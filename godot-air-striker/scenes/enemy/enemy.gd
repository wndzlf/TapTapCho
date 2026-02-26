extends Area2D

signal defeated(points: int, at_pos: Vector2)
signal hit_player
signal escaped

@export var speed_min := 90.0
@export var speed_max := 150.0

var _vx := 0.0
var _vy := 0.0
var _hp := 1
var _alive := true

func _ready() -> void:
	add_to_group("enemy")
	_vx = randf_range(-36.0, 36.0)
	_vy = randf_range(speed_min, speed_max)
	area_entered.connect(_on_area_entered)

func _physics_process(delta: float) -> void:
	if not _alive:
		return

	position.x += _vx * delta
	position.y += _vy * delta
	rotation += _vx * 0.0009

	if position.x < 20.0 or position.x > 340.0:
		_vx *= -1.0

	if position.y > 690.0:
		escaped.emit()
		queue_free()

func take_hit() -> void:
	if not _alive:
		return

	_hp -= 1
	if _hp <= 0:
		_alive = false
		defeated.emit(10, global_position)
		queue_free()

func _on_area_entered(area: Area2D) -> void:
	if not _alive:
		return
	if area.is_in_group("player"):
		hit_player.emit()
