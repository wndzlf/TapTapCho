extends Node2D

@onready var key := $Key
@onready var door := $Door
@onready var state_label := $UI/State
@onready var door_visual := $Door/DoorVisual
@onready var flicker := $UI/Flicker
@onready var player := $Player
@onready var flashlight := $UI/Flashlight
@onready var door_audio := $DoorAudio

var has_key := false
var t := 0.0

func _ready() -> void:
	key.body_entered.connect(_on_key)
	door.body_entered.connect(_on_door)
	_update_ui()

func _process(delta: float) -> void:
	t += delta
	var a = 0.18 + 0.06 * sin(t * 3.3) + 0.04 * sin(t * 7.1)
	flicker.modulate.a = clamp(a, 0.1, 0.35)

	# update flashlight center (UV space)
	var vp = get_viewport().get_visible_rect().size
	if vp.x > 0 and vp.y > 0:
		var uv = player.global_position / vp
		flashlight.material.set_shader_parameter("center", uv)

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
		door_audio.play()
	else:
		state_label.text = "Door locked. Find the KEY."

func _update_ui():
	state_label.text = "Key: YES" if has_key else "Key: NO"
