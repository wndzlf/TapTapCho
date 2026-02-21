extends Node2D

func _draw() -> void:
	# head
	draw_circle(Vector2(0, -10), 7, Color(0.9, 0.85, 0.78))
	# body
	draw_rect(Rect2(Vector2(-4, -2), Vector2(8, 14)), Color(0.35, 0.55, 0.9))
	# legs
	draw_rect(Rect2(Vector2(-5, 12), Vector2(4, 8)), Color(0.2, 0.2, 0.2))
	draw_rect(Rect2(Vector2(1, 12), Vector2(4, 8)), Color(0.2, 0.2, 0.2))
	# arms
	draw_rect(Rect2(Vector2(-10, 0), Vector2(6, 3)), Color(0.4, 0.4, 0.4))
	draw_rect(Rect2(Vector2(4, 0), Vector2(6, 3)), Color(0.4, 0.4, 0.4))
