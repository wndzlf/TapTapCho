extends Node3D

@export var cell_size := 4.0
@export var wall_height := 3.0
@export var wall_thickness := 0.5
@export var seed := 0

# Water-maze series (start -> exit, then bigger)
var levels := [
	{"w": 12, "h": 12},
	{"w": 15, "h": 15},
	{"w": 18, "h": 18},
	{"w": 20, "h": 20},
]
var level_idx := 0

var rng := RandomNumberGenerator.new()
var exit_area: Area3D
var ui_label: Label
var exit_audio: AudioStreamPlayer
var maze_root: Node3D
var player: CharacterBody3D
var flicker_timer: Timer
var flicker_lights: Array = []

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
	_setup_audio()
	_build_level()

func _setup_materials() -> void:
	floor_mat.albedo_color = Color(0.05, 0.15, 0.25)
	floor_mat.metallic = 0.15
	floor_mat.roughness = 0.1
	floor_mat.clearcoat_enabled = true
	floor_mat.clearcoat = 0.6

	wall_mat.albedo_color = Color(0.08, 0.08, 0.1)
	wall_mat.roughness = 0.8

func _setup_environment() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.01, 0.02, 0.03)
	env.fog_enabled = true
	env.fog_color = Color(0.03, 0.04, 0.06)
	env.fog_density = 0.05
	env.ambient_light_color = Color(0.05, 0.06, 0.08)
	env.ambient_light_energy = 0.7

	var world_env := WorldEnvironment.new()
	world_env.environment = env
	add_child(world_env)

	var moon := DirectionalLight3D.new()
	moon.rotation_degrees = Vector3(-35, 25, 0)
	moon.light_energy = 0.5
	moon.light_color = Color(0.35, 0.45, 0.65)
	add_child(moon)

	# Light flicker timer (scary vibe)
	flicker_timer = Timer.new()
	flicker_timer.wait_time = 0.5
	flicker_timer.timeout.connect(_flicker_lights)
	flicker_timer.autostart = true
	add_child(flicker_timer)

func _setup_ui() -> void:
	var layer := CanvasLayer.new()
	ui_label = Label.new()
	ui_label.text = "Find the EXIT"
	ui_label.add_theme_color_override("font_color", Color(0.8, 0.9, 1.0))
	ui_label.position = Vector2(16, 16)
	layer.add_child(ui_label)
	add_child(layer)

func _update_ui() -> void:
	ui_label.text = "Maze %d / %d  |  Find the EXIT" % [level_idx + 1, levels.size()]

func _setup_audio() -> void:
	var bgm := AudioStreamPlayer.new()
	bgm.stream = load("res://audio/ambient.wav")
	bgm.volume_db = -6
	bgm.play()
	add_child(bgm)

	exit_audio = AudioStreamPlayer.new()
	exit_audio.stream = load("res://audio/door_creak.wav")
	exit_audio.volume_db = -6
	add_child(exit_audio)

func _generate_maze(w: int, h: int) -> Array:
	var walls := []
	var visited := []
	for y in range(h):
		walls.append([])
		visited.append([])
		for x in range(w):
			walls[y].append([true, true, true, true]) # N,E,S,W
			visited[y].append(false)

	var stack := []
	var cx := 0
	var cy := 0
	visited[cy][cx] = true

	while true:
		var neighbors := []
		if cy > 0 and not visited[cy-1][cx]: neighbors.append([cx, cy-1, 0])
		if cx < w-1 and not visited[cy][cx+1]: neighbors.append([cx+1, cy, 1])
		if cy < h-1 and not visited[cy+1][cx]: neighbors.append([cx, cy+1, 2])
		if cx > 0 and not visited[cy][cx-1]: neighbors.append([cx-1, cy, 3])

		if neighbors.size() > 0:
			var n = neighbors[rng.randi_range(0, neighbors.size()-1)]
			stack.append([cx, cy])
			var nx = n[0]; var ny = n[1]; var dir = n[2]
			# remove wall between
			walls[cy][cx][dir] = false
			walls[ny][nx][(dir + 2) % 4] = false
			cx = nx; cy = ny
			visited[cy][cx] = true
		else:
			if stack.size() == 0:
				break
			var prev = stack.pop_back()
			cx = prev[0]; cy = prev[1]

	return walls

func _flicker_lights() -> void:
	for l in flicker_lights:
		if l is OmniLight3D:
			l.light_energy = rng.randf_range(0.35, 0.9)

func _build_level() -> void:
	# clear old
	if maze_root:
		maze_root.queue_free()
	if exit_area:
		exit_area.queue_free()

	var level = levels[min(level_idx, levels.size()-1)]
	var maze_w = level["w"]
	var maze_h = level["h"]

	flicker_lights.clear()
	_update_ui()

	var maze = _generate_maze(maze_w, maze_h)
	_build_maze(maze, maze_w, maze_h)
	_reset_player()
	_spawn_exit(maze_w, maze_h)

func _build_maze(walls: Array, maze_w: int, maze_h: int) -> void:
	maze_root = Node3D.new()
	maze_root.name = "Maze"
	add_child(maze_root)

	# Floor (water)
	var floor_body := StaticBody3D.new()
	var floor_mesh := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = Vector2(maze_w * cell_size, maze_h * cell_size)
	floor_mesh.mesh = plane
	floor_mesh.material_override = floor_mat
	floor_mesh.position = Vector3((maze_w-1) * cell_size * 0.5, 0, (maze_h-1) * cell_size * 0.5)
	floor_body.add_child(floor_mesh)

	var floor_shape := CollisionShape3D.new()
	var floor_box := BoxShape3D.new()
	floor_box.size = Vector3(maze_w * cell_size, 0.2, maze_h * cell_size)
	floor_shape.shape = floor_box
	floor_shape.position = floor_mesh.position - Vector3(0, 0.1, 0)
	floor_body.add_child(floor_shape)
	maze_root.add_child(floor_body)

	# Walls
	for y in range(maze_h):
		for x in range(maze_w):
			var cell = walls[y][x]
			var cx := x * cell_size
			var cz := y * cell_size

			# North wall
			if cell[0]:
				_create_wall(maze_root,
					Vector3(cx, wall_height * 0.5, cz - cell_size * 0.5),
					Vector3(cell_size, wall_height, wall_thickness))
			# West wall
			if cell[3]:
				_create_wall(maze_root,
					Vector3(cx - cell_size * 0.5, wall_height * 0.5, cz),
					Vector3(wall_thickness, wall_height, cell_size))

			# South boundary
			if y == maze_h - 1 and cell[2]:
				_create_wall(maze_root,
					Vector3(cx, wall_height * 0.5, cz + cell_size * 0.5),
					Vector3(cell_size, wall_height, wall_thickness))
			# East boundary
			if x == maze_w - 1 and cell[1]:
				_create_wall(maze_root,
					Vector3(cx + cell_size * 0.5, wall_height * 0.5, cz),
					Vector3(wall_thickness, wall_height, cell_size))

	# Flicker lights
	for i in range(8):
		var light := OmniLight3D.new()
		light.light_color = Color(0.7, 0.6, 0.4)
		light.light_energy = 0.6
		light.position = Vector3(rng.randi_range(0, maze_w-1) * cell_size,
			rng.randf_range(1.5, 2.5), rng.randi_range(0, maze_h-1) * cell_size)
		maze_root.add_child(light)
		flicker_lights.append(light)

func _create_wall(parent: Node3D, pos: Vector3, size: Vector3) -> void:
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

	parent.add_child(body)

func _spawn_player() -> void:
	player = CharacterBody3D.new()
	player.name = "Player"
	player.position = Vector3(0, 1.2, 0)

	var cam := Camera3D.new()
	cam.position = Vector3(0, 0.6, 0)
	player.add_child(cam)

	player.set_script(load("res://Player3D.gd"))
	add_child(player)

func _reset_player() -> void:
	if player:
		player.position = Vector3(0, 1.2, 0)
		player.velocity = Vector3.ZERO

func _spawn_exit(maze_w: int, maze_h: int) -> void:
	var ex := Vector3((maze_w-1) * cell_size, 0.5, (maze_h-1) * cell_size)

	exit_area = Area3D.new()
	exit_area.position = ex
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(2.0, 2.0, 2.0)
	shape.shape = box
	exit_area.add_child(shape)
	exit_area.body_entered.connect(_on_exit)
	add_child(exit_area)

	# Exit marker light
	var glow := OmniLight3D.new()
	glow.light_color = Color(0.8, 0.2, 0.2)
	glow.light_energy = 1.1
	glow.position = ex + Vector3(0, 1.2, 0)
	add_child(glow)

func _on_exit(body: Node) -> void:
	if body.name != "Player":
		return
	if exit_audio:
		exit_audio.play()
	level_idx += 1
	if level_idx >= levels.size():
		ui_label.text = "ESCAPED!"
		return
	_build_level()
