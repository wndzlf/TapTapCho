extends Node2D

@onready var key := $Key
@onready var door := $Door
@onready var state_label := $UI/State
@onready var door_visual := $Door/DoorVisual

var has_key := false

func _ready() -> void:
	key.body_entered.connect(_on_key)
	door.body_entered.connect(_on_door)
	_update_ui()

func _on_key(body):
	if body.name == "Player" and not has_key:
		has_key = true
		key.queue_free()
		door_visual.color = Color(0.4, 1, 0.6, 1)
		_update_ui()

func _on_door(body):
	if body.name != "Player":
		return
	if has_key:
		state_label.text = "ESCAPED!"
	else:
		state_label.text = "Door locked. Find the KEY."

func _update_ui():
	state_label.text = "Key: YES" if has_key else "Key: NO"
