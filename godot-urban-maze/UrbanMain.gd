extends Node3D

@export var cell_size := 4.0
@export var wall_height := 3.0
@export var wall_thickness := 0.5
@export var seed := 0

# fixed maze layout based on image (simple hand-crafted)
var grid_w := 12
var grid_h := 8

var rng := RandomNumberGenerator.new()
var exit_area: Area3D
var ui_label: Label
var help_label: Label
var player: CharacterBody3D
var maze_root: Node3D

var floor_mat := StandardMaterial3D.new()
var wall_mat := StandardMaterial3D.new()

func _ready() -> void:
	if seed == 0:
		rng.randomize()
	else:
		rng.seed = seed

	_setup_materials()
	_setup_environment()
	_spawn_player()
	_setup_ui()
	_build_maze()
	_spawn_exit()

func _setup_materials() -> void:
	floor_mat.albedo_texture = load("res://assets/textures/asphalt.png")
	floor_mat.roughness = 0.8
	wall_mat.albedo_texture = load("res://assets/textures/metal_wall.png")
	wall_mat.albedo_color = Color(0.9, 0.9, 0.95)
	wall_mat.roughness = 0.6

func _setup_environment() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.2, 0.22, 0.25)
	env.ambient_light_color = Color(0.6, 0.6, 0.65)
	env.ambient_light_energy = 2.0
	env.fog_enabled = false

	var world_env := WorldEnvironment.new()
	world_env.environment = env
	add_child(world_env)

	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-35, 25, 0)
	sun.light_energy = 1.6
	sun.light_color = Color(0.9, 0.95, 1.0)
	add_child(sun)

	var fill := OmniLight3D.new()
	fill.light_color = Color(0.9, 0.9, 1.0)
	fill.light_energy = 0.8
	fill.position = Vector3((grid_w-1) * cell_size * 0.5, 4.0, (grid_h-1) * cell_size * 0.5)
	add_child(fill)

func _setup_ui() -> void:
	var layer := CanvasLayer.new()
	ui_label = Label.new()
	ui_label.text = "CITY MAZE | Find the EXIT"
	ui_label.add_theme_color_override("font_color", Color(0.95, 0.95, 1.0))
	ui_label.position = Vector2(16, 16)
	layer.add_child(ui_label)

	help_label = Label.new()
	help_label.text = "CLICK TO START\nWASD: Move  |  Mouse: Look  |  ESC: Release Mouse"
	help_label.add_theme_color_override("font_color", Color(0.9, 0.95, 1.0))
	help_label.add_theme_font_size_override("font_size", 18)
	help_label.position = Vector2(16, 44)
	layer.add_child(help_label)

	# Mobile controls
	if DisplayServer.is_touchscreen_available():
		help_label.text = "TOUCH CONTROLS\nUse buttons to move"
		var btn_size = Vector2(70, 70)
		var base = Vector2(30, 360)
		var up = Button.new()
		up.text = "▲"
		up.size = btn_size
		up.position = base + Vector2(70, -70)
		up.pressed.connect(func(): Input.action_press("move_up"))
		up.button_up.connect(func(): Input.action_release("move_up"))
		layer.add_child(up)

		var down = Button.new()
		down.text = "▼"
		down.size = btn_size
		down.position = base + Vector2(70, 70)
		down.pressed.connect(func(): Input.action_press("move_down"))
		down.button_up.connect(func(): Input.action_release("move_down"))
		layer.add_child(down)

		var left = Button.new()
		left.text = "◀"
		left.size = btn_size
		left.position = base + Vector2(0, 0)
		left.pressed.connect(func(): Input.action_press("move_left"))
		left.button_up.connect(func(): Input.action_release("move_left"))
		layer.add_child(left)

		var right = Button.new()
		right.text = "▶"
		right.size = btn_size
		right.position = base + Vector2(140, 0)
		right.pressed.connect(func(): Input.action_press("move_right"))
		right.button_up.connect(func(): Input.action_release("move_right"))
		layer.add_child(right)

	add_child(layer)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and not DisplayServer.is_touchscreen_available():
		Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
		if help_label:
			help_label.text = "WASD: Move  |  Mouse: Look  |  ESC: Release Mouse"

func _build_maze() -> void:
	if maze_root:
		maze_root.queue_free()
	maze_root = Node3D.new()
	maze_root.name = "Maze"
	add_child(maze_root)

	# Floor
	var floor_body := StaticBody3D.new()
	var floor_mesh := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = Vector2(grid_w * cell_size + 4.0, grid_h * cell_size + 4.0)
	floor_mesh.mesh = plane
	floor_mesh.material_override = floor_mat
	floor_mesh.position = Vector3((grid_w-1) * cell_size * 0.5, 0, (grid_h-1) * cell_size * 0.5)
	floor_body.add_child(floor_mesh)

	var floor_shape := CollisionShape3D.new()
	var floor_box := BoxShape3D.new()
	floor_box.size = Vector3(grid_w * cell_size, 0.2, grid_h * cell_size)
	floor_shape.shape = floor_box
	floor_shape.position = floor_mesh.position - Vector3(0, 0.1, 0)
	floor_body.add_child(floor_shape)
	maze_root.add_child(floor_body)

	# Maze walls (hand-drawn like reference)
	# 1 = wall segment, 0 = empty. We'll draw walls as thick lines.
	var lines = [
		# Outer border
		[Vector2(0,0), Vector2(11,0)],
		[Vector2(0,7), Vector2(11,7)],
		[Vector2(0,0), Vector2(0,7)],
		[Vector2(11,0), Vector2(11,7)],

		# Inner walls (approx layout)
		[Vector2(2,1), Vector2(5,1)],
		[Vector2(5,1), Vector2(5,3)],
		[Vector2(1,2), Vector2(1,5)],
		[Vector2(3,2), Vector2(3,4)],
		[Vector2(2,4), Vector2(6,4)],
		[Vector2(7,1), Vector2(10,1)],
		[Vector2(7,1), Vector2(7,3)],
		[Vector2(9,2), Vector2(9,5)],
		[Vector2(6,3), Vector2(8,3)],
		[Vector2(6,5), Vector2(10,5)],
		[Vector2(4,6), Vector2(8,6)],
		[Vector2(8,4), Vector2(8,6)],
	]

	for seg in lines:
		_create_wall_segment(seg[0], seg[1])

	# debug landmark to ensure 3D visibility
	var marker := MeshInstance3D.new()
	var mbox := BoxMesh.new()
	mbox.size = Vector3(0.8, 0.8, 0.8)
	marker.mesh = mbox
	marker.position = Vector3(1 * cell_size, 0.4, 1 * cell_size)
	maze_root.add_child(marker)

func _create_wall_segment(a: Vector2, b: Vector2) -> void:
	var dx = b.x - a.x
	var dy = b.y - a.y
	var length = abs(dx) + abs(dy)
	if length <= 0:
		return

	for i in range(int(length)):
		var px = a.x
		var py = a.y
		if dx != 0:
			px += sign(dx) * i
		if dy != 0:
			py += sign(dy) * i
		_create_wall(Vector3(px * cell_size, wall_height * 0.5, py * cell_size),
			Vector3(cell_size, wall_height, wall_thickness))

func _create_wall(pos: Vector3, size: Vector3) -> void:
	var body := StaticBody3D.new()
	var mesh := MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = size
	mesh.mesh = box
	mesh.material_override = wall_mat
	mesh.position = pos
	body.add_child(mesh)

	var shape := CollisionShape3D.new()
	var col := BoxShape3D.new()
	col.size = size
	shape.shape = col
	shape.position = pos
	body.add_child(shape)

	maze_root.add_child(body)

func _spawn_player() -> void:
	player = CharacterBody3D.new()
	player.name = "Player"
	player.position = Vector3(1 * cell_size, 1.2, 1 * cell_size)

	var cam := Camera3D.new()
	cam.position = Vector3(0, 0.6, 0)
	player.add_child(cam)

	var flashlight := SpotLight3D.new()
	flashlight.light_color = Color(0.95, 0.98, 1.0)
	flashlight.light_energy = 2.0
	flashlight.range = 18.0
	flashlight.spot_angle = 35.0
	flashlight.position = Vector3(0, 0.6, 0)
	flashlight.rotation_degrees = Vector3(-2, 0, 0)
	player.add_child(flashlight)

	player.set_script(load("res://Player3D.gd"))
	add_child(player)

func _spawn_exit() -> void:
	var ex := Vector3((grid_w-1) * cell_size, 0.5, (grid_h-1) * cell_size)

	exit_area = Area3D.new()
	exit_area.position = ex
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(2.0, 2.0, 2.0)
	shape.shape = box
	exit_area.add_child(shape)
	exit_area.body_entered.connect(_on_exit)
	add_child(exit_area)

	var glow := OmniLight3D.new()
	glow.light_color = Color(0.2, 0.9, 0.5)
	glow.light_energy = 1.2
	glow.position = ex + Vector3(0, 1.2, 0)
	add_child(glow)

func _on_exit(body: Node) -> void:
	if body.name != "Player":
		return
	ui_label.text = "ESCAPED!"
	help_label.text = "ESCAPED!"
