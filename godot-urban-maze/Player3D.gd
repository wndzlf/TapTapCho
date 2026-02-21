extends CharacterBody3D

@export var speed := 5.5
@export var mouse_sens := 0.003

@onready var camera: Camera3D = $Camera3D

var yaw := 0.0
var pitch := 0.0
var t := 0.0

func _ready() -> void:
	camera.fov = 75
	Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion:
		yaw -= event.relative.x * mouse_sens
		pitch -= event.relative.y * mouse_sens
		pitch = clamp(pitch, -1.2, 1.2)
		rotation.y = yaw
		camera.rotation.x = pitch
	elif event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	elif event is InputEventMouseButton and event.pressed:
		Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)

func _physics_process(delta: float) -> void:
	var input := Input.get_vector("move_left", "move_right", "move_up", "move_down")
	var dir := (transform.basis * Vector3(input.x, 0, input.y)).normalized()
	velocity.x = dir.x * speed
	velocity.z = dir.z * speed
	velocity.y += -9.8 * delta
	move_and_slide()

	# subtle head bob for 3D feel
	if input.length() > 0.01:
		t += delta * 8.0
		camera.position.y = 0.6 + sin(t) * 0.03
	else:
		camera.position.y = lerp(camera.position.y, 0.6, 0.1)
