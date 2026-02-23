extends CharacterBody3D

@export var walk_speed := 5.2
@export var sprint_multiplier := 1.45
@export var acceleration := 14.0
@export var air_control := 0.35
@export var jump_velocity := 5.1
@export var mouse_sens := 0.0028
@export var touch_look_sens := 0.004

@onready var camera: Camera3D = $Camera3D

var yaw := 0.0
var pitch := 0.0
var bob_t := 0.0
var gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")
var footstep_player: AudioStreamPlayer3D

func _ready() -> void:
	camera.fov = 78
	camera.current = true
	if DisplayServer.is_touchscreen_available():
		Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	else:
		Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
	_setup_footsteps()

func _setup_footsteps() -> void:
	footstep_player = AudioStreamPlayer3D.new()
	footstep_player.stream = load("res://audio/footsteps.wav")
	footstep_player.unit_size = 8.0
	footstep_player.max_distance = 30.0
	footstep_player.volume_db = -14.0
	add_child(footstep_player)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and Input.get_mouse_mode() == Input.MOUSE_MODE_CAPTURED:
		_apply_look(event.relative * mouse_sens)
	elif event is InputEventScreenDrag:
		_apply_look(event.relative * touch_look_sens)
	elif event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	elif event is InputEventMouseButton and event.pressed and not DisplayServer.is_touchscreen_available():
		Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)

func add_touch_look(delta: Vector2) -> void:
	_apply_look(delta * mouse_sens)

func _apply_look(delta: Vector2) -> void:
	yaw -= delta.x
	pitch = clamp(pitch - delta.y, -1.25, 1.15)
	rotation.y = yaw
	camera.rotation.x = pitch

func _physics_process(delta: float) -> void:
	var input_vec := Input.get_vector("move_left", "move_right", "move_up", "move_down")
	var move_dir := (global_transform.basis * Vector3(input_vec.x, 0.0, input_vec.y)).normalized()

	var sprinting := Input.is_key_pressed(KEY_SHIFT)
	var target_speed := walk_speed
	if sprinting and move_dir.length() > 0.0:
		target_speed = walk_speed * sprint_multiplier

	var target_vel := move_dir * target_speed
	var accel := acceleration
	if not is_on_floor():
		accel *= air_control

	velocity.x = move_toward(velocity.x, target_vel.x, accel * delta)
	velocity.z = move_toward(velocity.z, target_vel.z, accel * delta)

	if not is_on_floor():
		velocity.y -= gravity * delta
	else:
		if velocity.y < 0.0:
			velocity.y = 0.0
		var wants_jump := InputMap.has_action("jump") and Input.is_action_just_pressed("jump")
		wants_jump = wants_jump or Input.is_action_just_pressed("ui_accept")
		if wants_jump:
			velocity.y = jump_velocity
			if footstep_player.playing:
				footstep_player.stop()

	move_and_slide()
	_update_head_bob(delta, move_dir.length(), sprinting)
	_update_footsteps(move_dir.length(), sprinting)

func _update_head_bob(delta: float, move_amount: float, sprinting: bool) -> void:
	if is_on_floor() and move_amount > 0.05:
		bob_t += delta * (12.0 if sprinting else 8.0)
		camera.position.y = lerp(camera.position.y, 0.6 + sin(bob_t) * 0.035, 0.35)
	else:
		camera.position.y = lerp(camera.position.y, 0.6, 0.2)

func _update_footsteps(move_amount: float, sprinting: bool) -> void:
	if not footstep_player:
		return
	if not is_on_floor() or move_amount < 0.05:
		if footstep_player.playing:
			footstep_player.stop()
		return
	footstep_player.pitch_scale = 1.2 if sprinting else 1.0
	if not footstep_player.playing:
		footstep_player.play()
