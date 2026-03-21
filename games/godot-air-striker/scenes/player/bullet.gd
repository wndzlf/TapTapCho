extends Area2D

@export var speed := 560.0

func _ready() -> void:
	add_to_group("bullet")
	area_entered.connect(_on_area_entered)

func _physics_process(delta: float) -> void:
	position.y -= speed * delta
	if position.y < -40.0:
		queue_free()

func _on_area_entered(area: Area2D) -> void:
	if area.is_in_group("enemy") and area.has_method("take_hit"):
		area.take_hit()
		queue_free()
