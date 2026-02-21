extends CharacterBody2D

@export var speed := 220.0
@onready var step_audio: AudioStreamPlayer = $StepAudio

func _physics_process(delta: float) -> void:
	var dir := Vector2.ZERO
	if Input.is_action_pressed("move_left"):
		dir.x -= 1
	if Input.is_action_pressed("move_right"):
		dir.x += 1
	if Input.is_action_pressed("move_up"):
		dir.y -= 1
	if Input.is_action_pressed("move_down"):
		dir.y += 1
	velocity = dir.normalized() * speed
	move_and_slide()

	if velocity.length() > 1.0:
		if not step_audio.playing:
			step_audio.play()
	else:
		if step_audio.playing:
			step_audio.stop()
