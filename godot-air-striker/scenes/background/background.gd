extends Node2D

const VIEW_SIZE := Vector2(360, 640)

var stars: Array = []

func _ready() -> void:
	randomize()
	for i in range(90):
		stars.append({
			"x": randf_range(0, VIEW_SIZE.x),
			"y": randf_range(0, VIEW_SIZE.y),
			"r": randf_range(0.8, 2.2),
			"v": randf_range(14, 58),
			"a": randf_range(0.2, 0.8),
		})

func _process(delta: float) -> void:
	for s in stars:
		s.y += s.v * delta
		if s.y > VIEW_SIZE.y + 4:
			s.y = -4
			s.x = randf_range(0, VIEW_SIZE.x)
	queue_redraw()

func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, VIEW_SIZE), Color(0.05, 0.1, 0.2))
	draw_rect(Rect2(Vector2.ZERO, VIEW_SIZE), Color(0.09, 0.12, 0.3, 0.6))

	for s in stars:
		draw_circle(Vector2(s.x, s.y), s.r, Color(0.85, 0.95, 1.0, s.a))
