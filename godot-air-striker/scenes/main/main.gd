extends Node2D

const BULLET_SCENE: PackedScene = preload("res://scenes/player/bullet.tscn")
const ENEMY_SCENE: PackedScene = preload("res://scenes/enemy/enemy.tscn")

@onready var player: Area2D = $Player
@onready var bullets: Node2D = $PlayerBullets
@onready var enemies: Node2D = $Enemies
@onready var spawn_timer: Timer = $EnemySpawnTimer
@onready var hud = $HUD

var score := 0
var lives := 3
var running := false

func _ready() -> void:
	randomize()
	player.shoot.connect(_on_player_shoot)
	player.player_hit.connect(_on_player_hit)
	spawn_timer.timeout.connect(_on_enemy_spawn_timeout)
	reset_game()

func _process(_delta: float) -> void:
	if not running and Input.is_action_just_pressed("ui_accept"):
		reset_game()

	var c: Color = hud.flash.color
	if c.a > 0.0:
		c.a = max(0.0, c.a - 0.03)
		hud.flash.color = c

func _on_player_shoot(spawn_pos: Vector2) -> void:
	if not running:
		return
	var bullet: Area2D = BULLET_SCENE.instantiate()
	bullet.global_position = spawn_pos
	bullets.add_child(bullet)

func _on_enemy_spawn_timeout() -> void:
	if not running:
		return

	var enemy: Area2D = ENEMY_SCENE.instantiate()
	enemy.global_position = Vector2(randf_range(26.0, 334.0), -24.0)
	enemy.defeated.connect(_on_enemy_defeated)
	enemy.hit_player.connect(_on_enemy_hit_player)
	enemy.escaped.connect(_on_enemy_escaped)
	enemies.add_child(enemy)

	spawn_timer.wait_time = clamp(0.95 - float(score) * 0.008, 0.24, 0.95)
	spawn_timer.start()

func _on_enemy_defeated(points: int, _at_pos: Vector2) -> void:
	score += points
	hud.set_score(score)
	hud.flash_hit(Color(1.0, 0.95, 0.4), 0.24)
	hud.set_best(score)

func _on_enemy_hit_player() -> void:
	damage_player()

func _on_enemy_escaped() -> void:
	damage_player()

func _on_player_hit() -> void:
	damage_player()

func damage_player() -> void:
	if not running:
		return

	lives -= 1
	hud.set_lives(max(0, lives))
	hud.flash_hit(Color(1.0, 0.3, 0.3), 0.42)

	if lives <= 0:
		game_over()

func game_over() -> void:
	running = false
	spawn_timer.stop()
	player.set_alive(false)
	hud.show_message("GAME OVER\\nPress Enter / Space")

func reset_game() -> void:
	score = 0
	lives = 3
	running = true

	for node in enemies.get_children():
		node.queue_free()
	for node in bullets.get_children():
		node.queue_free()

	player.global_position = Vector2(180.0, 560.0)
	player.set_alive(true)

	hud.load_best()
	hud.set_score(score)
	hud.set_lives(lives)
	hud.clear_message()
	hud.flash.color = Color(0, 0, 0, 0)

	spawn_timer.wait_time = 0.92
	spawn_timer.start()
