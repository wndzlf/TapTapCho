extends Node3D

@export var block_count_x := 4
@export var block_count_z := 4
@export var block_size := 13.0
@export var road_width := 6.0
@export var building_margin := 1.0
@export var seed := 0

const LANDMARKS := ["Neon Plaza", "Arcade Alley", "Moon Park"]

var rng := RandomNumberGenerator.new()
var town_root: Node3D
var player: CharacterBody3D

var ui_label: Label
var help_label: Label
var quest_label: Label

var ambient_audio: AudioStreamPlayer
var goal_audio: AudioStreamPlayer

var city_size_x := 0.0
var city_size_z := 0.0

var discovered_landmarks := {}

var mobile_look_left := false
var mobile_look_right := false

var grass_mat := StandardMaterial3D.new()
var road_mat := StandardMaterial3D.new()
var pavement_mat := StandardMaterial3D.new()
var wall_mat := StandardMaterial3D.new()
var roof_mat := StandardMaterial3D.new()
var window_mat := StandardMaterial3D.new()
var trunk_mat := StandardMaterial3D.new()
var leaves_mat := StandardMaterial3D.new()

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
	_rebuild_town()

func _process(delta: float) -> void:
	if not DisplayServer.is_touchscreen_available():
		return
	if not player:
		return
	if not player.has_method("add_touch_look"):
		return

	var axis := 0.0
	if mobile_look_left:
		axis -= 1.0
	if mobile_look_right:
		axis += 1.0
	if absf(axis) > 0.01:
		player.add_touch_look(Vector2(axis * 220.0 * delta, 0.0))

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and not DisplayServer.is_touchscreen_available():
		Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
		if help_label:
			help_label.text = "WASD: Move  |  Shift: Run  |  Space: Jump  |  R: New Town"
	elif event is InputEventKey and event.pressed and event.keycode == KEY_R:
		rng.randomize()
		_rebuild_town()

func _setup_materials() -> void:
	grass_mat.albedo_color = Color(0.06, 0.16, 0.12)
	grass_mat.roughness = 0.95

	road_mat.albedo_color = Color(0.09, 0.1, 0.16)
	road_mat.roughness = 0.82

	pavement_mat.albedo_color = Color(0.17, 0.18, 0.22)
	pavement_mat.roughness = 0.88

	wall_mat.albedo_color = Color(0.45, 0.52, 0.66)
	wall_mat.roughness = 0.72

	roof_mat.albedo_color = Color(0.18, 0.23, 0.34)
	roof_mat.roughness = 0.68

	window_mat.albedo_color = Color(0.4, 0.7, 1.0)
	window_mat.emission_enabled = true
	window_mat.emission = Color(0.32, 0.62, 1.0)
	window_mat.emission_energy_multiplier = 1.2
	window_mat.roughness = 0.22

	trunk_mat.albedo_color = Color(0.28, 0.2, 0.14)
	trunk_mat.roughness = 0.95

	leaves_mat.albedo_color = Color(0.17, 0.43, 0.33)
	leaves_mat.roughness = 0.86

func _setup_environment() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.03, 0.05, 0.12)
	env.ambient_light_color = Color(0.26, 0.34, 0.48)
	env.ambient_light_energy = 1.15
	env.fog_enabled = true
	env.fog_light_color = Color(0.09, 0.14, 0.2)
	env.fog_light_energy = 0.7
	env.fog_density = 0.018

	var world_env := WorldEnvironment.new()
	world_env.environment = env
	add_child(world_env)

	var moon := DirectionalLight3D.new()
	moon.rotation_degrees = Vector3(-35.0, 35.0, 0.0)
	moon.light_energy = 0.95
	moon.light_color = Color(0.58, 0.7, 0.95)
	add_child(moon)

	var fill := OmniLight3D.new()
	fill.light_color = Color(0.45, 0.65, 1.0)
	fill.light_energy = 0.58
	fill.position = Vector3(35.0, 9.0, 35.0)
	add_child(fill)

func _setup_ui() -> void:
	var layer := CanvasLayer.new()

	ui_label = Label.new()
	ui_label.text = "Neon Village Explorer"
	ui_label.position = Vector2(16, 12)
	ui_label.add_theme_font_size_override("font_size", 24)
	ui_label.add_theme_color_override("font_color", Color(0.86, 0.94, 1.0))
	layer.add_child(ui_label)

	help_label = Label.new()
	help_label.text = "CLICK TO START\nWASD: Move  |  Shift: Run  |  Space: Jump  |  R: New Town"
	help_label.position = Vector2(16, 48)
	help_label.add_theme_font_size_override("font_size", 18)
	help_label.add_theme_color_override("font_color", Color(0.76, 0.92, 1.0))
	layer.add_child(help_label)

	quest_label = Label.new()
	quest_label.position = Vector2(16, 106)
	quest_label.add_theme_font_size_override("font_size", 17)
	quest_label.add_theme_color_override("font_color", Color(0.86, 0.96, 1.0))
	layer.add_child(quest_label)

	if DisplayServer.is_touchscreen_available():
		help_label.text = "TOUCH MODE\nMove + Look buttons to explore"
		var btn_size := Vector2(68.0, 68.0)
		var move_base := Vector2(30.0, 350.0)
		var look_base := Vector2(770.0, 390.0)

		var up := _create_touch_button(layer, "▲", move_base + Vector2(68.0, -70.0), btn_size)
		up.pressed.connect(func(): Input.action_press("move_up"))
		up.button_up.connect(func(): Input.action_release("move_up"))

		var down := _create_touch_button(layer, "▼", move_base + Vector2(68.0, 70.0), btn_size)
		down.pressed.connect(func(): Input.action_press("move_down"))
		down.button_up.connect(func(): Input.action_release("move_down"))

		var left := _create_touch_button(layer, "◀", move_base + Vector2(0.0, 0.0), btn_size)
		left.pressed.connect(func(): Input.action_press("move_left"))
		left.button_up.connect(func(): Input.action_release("move_left"))

		var right := _create_touch_button(layer, "▶", move_base + Vector2(136.0, 0.0), btn_size)
		right.pressed.connect(func(): Input.action_press("move_right"))
		right.button_up.connect(func(): Input.action_release("move_right"))

		var jump := _create_touch_button(layer, "JUMP", look_base + Vector2(80.0, -80.0), Vector2(110.0, 56.0))
		jump.pressed.connect(func():
			if InputMap.has_action("jump"):
				Input.action_press("jump")
			Input.action_press("ui_accept")
		)
		jump.button_up.connect(func():
			if InputMap.has_action("jump"):
				Input.action_release("jump")
			Input.action_release("ui_accept")
		)

		var look_left := _create_touch_button(layer, "⟲", look_base + Vector2(0.0, 0.0), btn_size)
		look_left.pressed.connect(func(): mobile_look_left = true)
		look_left.button_up.connect(func(): mobile_look_left = false)

		var look_right := _create_touch_button(layer, "⟳", look_base + Vector2(136.0, 0.0), btn_size)
		look_right.pressed.connect(func(): mobile_look_right = true)
		look_right.button_up.connect(func(): mobile_look_right = false)

	add_child(layer)

func _create_touch_button(layer: CanvasLayer, text_value: String, pos: Vector2, size: Vector2) -> Button:
	var button := Button.new()
	button.text = text_value
	button.position = pos
	button.size = size
	button.add_theme_font_size_override("font_size", 24)
	button.modulate = Color(1.0, 1.0, 1.0, 0.9)
	layer.add_child(button)
	return button

func _setup_audio() -> void:
	ambient_audio = AudioStreamPlayer.new()
	ambient_audio.stream = load("res://audio/ambient.wav")
	ambient_audio.volume_db = -8.0
	ambient_audio.autoplay = true
	add_child(ambient_audio)

	goal_audio = AudioStreamPlayer.new()
	goal_audio.stream = load("res://audio/door_creak.wav")
	goal_audio.volume_db = -9.0
	add_child(goal_audio)

func _spawn_player() -> void:
	player = CharacterBody3D.new()
	player.name = "Player"
	player.position = Vector3(2.0, 1.2, 2.0)

	var cam := Camera3D.new()
	cam.position = Vector3(0.0, 0.6, 0.0)
	player.add_child(cam)

	var flashlight := SpotLight3D.new()
	flashlight.light_color = Color(0.65, 0.8, 1.0)
	flashlight.light_energy = 2.0
	flashlight.range = 22.0
	flashlight.spot_angle = 38.0
	flashlight.position = Vector3(0.0, 0.6, 0.0)
	flashlight.rotation_degrees = Vector3(-4.0, 0.0, 0.0)
	player.add_child(flashlight)

	player.set_script(load("res://Player3D.gd"))
	add_child(player)

func _rebuild_town() -> void:
	discovered_landmarks.clear()
	if town_root:
		town_root.queue_free()

	city_size_x = block_count_x * block_size + (block_count_x + 1) * road_width
	city_size_z = block_count_z * block_size + (block_count_z + 1) * road_width

	town_root = Node3D.new()
	town_root.name = "NeonTown"
	add_child(town_root)

	_build_ground()
	_build_roads()
	_build_blocks()
	_build_boundaries()
	_spawn_landmarks()
	_reset_player_position()
	_update_quest_text()

func _build_ground() -> void:
	var body := StaticBody3D.new()
	var mesh := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = Vector2(city_size_x + road_width * 2.0, city_size_z + road_width * 2.0)
	mesh.mesh = plane
	mesh.material_override = grass_mat
	mesh.position = Vector3(city_size_x * 0.5, 0.0, city_size_z * 0.5)
	body.add_child(mesh)

	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(city_size_x + road_width * 2.0, 0.2, city_size_z + road_width * 2.0)
	shape.shape = box
	shape.position = mesh.position - Vector3(0.0, 0.1, 0.0)
	body.add_child(shape)

	town_root.add_child(body)

func _build_roads() -> void:
	for ix in range(block_count_x + 1):
		var x_center := ix * (block_size + road_width) + road_width * 0.5
		_create_road_strip(Vector3(x_center, 0.02, city_size_z * 0.5), Vector2(road_width, city_size_z))

	for iz in range(block_count_z + 1):
		var z_center := iz * (block_size + road_width) + road_width * 0.5
		_create_road_strip(Vector3(city_size_x * 0.5, 0.02, z_center), Vector2(city_size_x, road_width))

func _create_road_strip(center: Vector3, size: Vector2) -> void:
	var road := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = size
	road.mesh = plane
	road.material_override = road_mat
	road.position = center
	town_root.add_child(road)

	if size.x > size.y:
		for i in range(6):
			var mark := MeshInstance3D.new()
			var box := BoxMesh.new()
			box.size = Vector3(2.2, 0.02, 0.24)
			mark.mesh = box
			mark.material_override = _make_mark_material()
			mark.position = center + Vector3(-size.x * 0.42 + i * size.x * 0.17, 0.03, 0.0)
			town_root.add_child(mark)
	else:
		for i in range(6):
			var mark := MeshInstance3D.new()
			var box := BoxMesh.new()
			box.size = Vector3(0.24, 0.02, 2.2)
			mark.mesh = box
			mark.material_override = _make_mark_material()
			mark.position = center + Vector3(0.0, 0.03, -size.y * 0.42 + i * size.y * 0.17)
			town_root.add_child(mark)

func _make_mark_material() -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.78, 0.88, 1.0)
	mat.emission_enabled = true
	mat.emission = Color(0.45, 0.68, 1.0)
	mat.emission_energy_multiplier = 0.8
	mat.roughness = 0.7
	return mat

func _build_blocks() -> void:
	for bx in range(block_count_x):
		for bz in range(block_count_z):
			var block_min_x := road_width + bx * (block_size + road_width)
			var block_min_z := road_width + bz * (block_size + road_width)
			var lot := Rect2(block_min_x, block_min_z, block_size, block_size)

			_create_sidewalk(lot)
			if rng.randf() < 0.23:
				_create_park(lot)
			else:
				_populate_lot(lot)
			_create_corner_lamps(lot)

func _create_sidewalk(lot: Rect2) -> void:
	var t := 0.8
	_create_static_box(Vector3(lot.position.x + lot.size.x * 0.5, 0.08, lot.position.y + t * 0.5), Vector3(lot.size.x, 0.16, t), pavement_mat)
	_create_static_box(Vector3(lot.position.x + lot.size.x * 0.5, 0.08, lot.end.y - t * 0.5), Vector3(lot.size.x, 0.16, t), pavement_mat)
	_create_static_box(Vector3(lot.position.x + t * 0.5, 0.08, lot.position.y + lot.size.y * 0.5), Vector3(t, 0.16, lot.size.y), pavement_mat)
	_create_static_box(Vector3(lot.end.x - t * 0.5, 0.08, lot.position.y + lot.size.y * 0.5), Vector3(t, 0.16, lot.size.y), pavement_mat)

func _populate_lot(lot: Rect2) -> void:
	var footprints: Array[Rect2] = []
	var building_count := rng.randi_range(2, 4)

	for _i in range(building_count):
		var w := rng.randf_range(2.8, 5.4)
		var d := rng.randf_range(2.8, 5.4)
		var h := rng.randf_range(3.2, 9.4)
		for _try in range(14):
			var x := rng.randf_range(lot.position.x + building_margin + w * 0.5, lot.end.x - building_margin - w * 0.5)
			var z := rng.randf_range(lot.position.y + building_margin + d * 0.5, lot.end.y - building_margin - d * 0.5)
			var rect := Rect2(x - w * 0.5 - 0.45, z - d * 0.5 - 0.45, w + 0.9, d + 0.9)

			var overlaps := false
			for used in footprints:
				if used.intersects(rect):
					overlaps = true
					break

			if not overlaps:
				footprints.append(rect)
				_create_building(Vector3(x, 0.0, z), Vector3(w, h, d))
				break

	var tree_count := rng.randi_range(2, 4)
	for _t in range(tree_count):
		var tx := rng.randf_range(lot.position.x + 1.4, lot.end.x - 1.4)
		var tz := rng.randf_range(lot.position.y + 1.4, lot.end.y - 1.4)
		var blocked := false
		for used in footprints:
			if used.has_point(Vector2(tx, tz)):
				blocked = true
				break
		if not blocked:
			_create_tree(Vector3(tx, 0.0, tz), rng.randf_range(1.0, 1.35))

func _create_park(lot: Rect2) -> void:
	var center := Vector3(lot.position.x + lot.size.x * 0.5, 0.03, lot.position.y + lot.size.y * 0.5)
	var patch := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = Vector2(lot.size.x - 2.0, lot.size.y - 2.0)
	patch.mesh = plane
	patch.material_override = grass_mat
	patch.position = center
	town_root.add_child(patch)

	var stage_size := Vector3(2.4, 0.6, 2.4)
	_create_static_box(Vector3(center.x, 0.3, center.z), stage_size, pavement_mat)

	var glow := OmniLight3D.new()
	glow.light_color = Color(0.62, 0.92, 1.0)
	glow.light_energy = 1.1
	glow.omni_range = 12.0
	glow.position = center + Vector3(0.0, 1.8, 0.0)
	town_root.add_child(glow)

	for i in range(4):
		var angle := i * PI * 0.5
		var offset := Vector3(cos(angle), 0.0, sin(angle)) * (lot.size.x * 0.26)
		_create_tree(center + offset, rng.randf_range(1.05, 1.45))

func _create_corner_lamps(lot: Rect2) -> void:
	var corners = [
		Vector3(lot.position.x + 0.8, 0.0, lot.position.y + 0.8),
		Vector3(lot.end.x - 0.8, 0.0, lot.position.y + 0.8),
		Vector3(lot.position.x + 0.8, 0.0, lot.end.y - 0.8),
		Vector3(lot.end.x - 0.8, 0.0, lot.end.y - 0.8),
	]
	for pos in corners:
		_create_lamp(pos)

func _create_building(center: Vector3, size: Vector3) -> void:
	var body := StaticBody3D.new()

	var base_mesh := MeshInstance3D.new()
	var base_box := BoxMesh.new()
	base_box.size = size
	base_mesh.mesh = base_box
	var wall_variant := wall_mat.duplicate()
	var tint := rng.randf_range(0.85, 1.12)
	wall_variant.albedo_color = Color(tint * 0.45, tint * 0.52, tint * 0.66)
	base_mesh.material_override = wall_variant
	base_mesh.position = Vector3(center.x, size.y * 0.5, center.z)
	body.add_child(base_mesh)

	var roof_mesh := MeshInstance3D.new()
	var roof_box := BoxMesh.new()
	roof_box.size = Vector3(size.x * 1.06, 0.45, size.z * 1.06)
	roof_mesh.mesh = roof_box
	roof_mesh.material_override = roof_mat
	roof_mesh.position = Vector3(center.x, size.y + 0.23, center.z)
	body.add_child(roof_mesh)

	var front_window := MeshInstance3D.new()
	var win_box := BoxMesh.new()
	win_box.size = Vector3(size.x * 0.55, max(1.0, size.y * 0.45), 0.1)
	front_window.mesh = win_box
	front_window.material_override = window_mat
	front_window.position = Vector3(center.x, size.y * 0.58, center.z + size.z * 0.5 + 0.06)
	body.add_child(front_window)

	var side_window := MeshInstance3D.new()
	var side_box := BoxMesh.new()
	side_box.size = Vector3(0.1, max(1.0, size.y * 0.42), size.z * 0.5)
	side_window.mesh = side_box
	side_window.material_override = window_mat
	side_window.position = Vector3(center.x + size.x * 0.5 + 0.06, size.y * 0.56, center.z)
	body.add_child(side_window)

	var shape := CollisionShape3D.new()
	var col := BoxShape3D.new()
	col.size = size
	shape.shape = col
	shape.position = base_mesh.position
	body.add_child(shape)

	town_root.add_child(body)

func _create_tree(pos: Vector3, scale_value: float) -> void:
	var body := StaticBody3D.new()

	var trunk := MeshInstance3D.new()
	var trunk_mesh := CylinderMesh.new()
	trunk_mesh.top_radius = 0.14 * scale_value
	trunk_mesh.bottom_radius = 0.19 * scale_value
	trunk_mesh.height = 1.6 * scale_value
	trunk.mesh = trunk_mesh
	trunk.material_override = trunk_mat
	trunk.position = pos + Vector3(0.0, 0.8 * scale_value, 0.0)
	body.add_child(trunk)

	var leaves := MeshInstance3D.new()
	var leaves_mesh := SphereMesh.new()
	leaves_mesh.radius = 0.85 * scale_value
	leaves_mesh.height = 1.7 * scale_value
	leaves.mesh = leaves_mesh
	leaves.material_override = leaves_mat
	leaves.position = pos + Vector3(0.0, 2.0 * scale_value, 0.0)
	body.add_child(leaves)

	var shape := CollisionShape3D.new()
	var col := CapsuleShape3D.new()
	col.radius = 0.28 * scale_value
	col.height = 1.6 * scale_value
	shape.shape = col
	shape.position = pos + Vector3(0.0, 0.8 * scale_value, 0.0)
	body.add_child(shape)

	town_root.add_child(body)

func _create_lamp(pos: Vector3) -> void:
	var pole := MeshInstance3D.new()
	var pole_mesh := CylinderMesh.new()
	pole_mesh.top_radius = 0.08
	pole_mesh.bottom_radius = 0.1
	pole_mesh.height = 2.6
	pole.mesh = pole_mesh
	var pole_mat := StandardMaterial3D.new()
	pole_mat.albedo_color = Color(0.28, 0.32, 0.4)
	pole.material_override = pole_mat
	pole.position = pos + Vector3(0.0, 1.3, 0.0)
	town_root.add_child(pole)

	var bulb := OmniLight3D.new()
	bulb.light_color = Color(0.62, 0.85, 1.0)
	bulb.light_energy = 1.1
	bulb.omni_range = 10.0
	bulb.position = pos + Vector3(0.0, 2.5, 0.0)
	town_root.add_child(bulb)

func _build_boundaries() -> void:
	_create_static_box(Vector3(city_size_x * 0.5, 1.1, -0.4), Vector3(city_size_x + 1.2, 2.2, 0.8), pavement_mat)
	_create_static_box(Vector3(city_size_x * 0.5, 1.1, city_size_z + 0.4), Vector3(city_size_x + 1.2, 2.2, 0.8), pavement_mat)
	_create_static_box(Vector3(-0.4, 1.1, city_size_z * 0.5), Vector3(0.8, 2.2, city_size_z + 1.2), pavement_mat)
	_create_static_box(Vector3(city_size_x + 0.4, 1.1, city_size_z * 0.5), Vector3(0.8, 2.2, city_size_z + 1.2), pavement_mat)

func _create_static_box(pos: Vector3, size: Vector3, mat: Material) -> void:
	var body := StaticBody3D.new()

	var mesh := MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = size
	mesh.mesh = box
	mesh.material_override = mat
	mesh.position = pos
	body.add_child(mesh)

	var shape := CollisionShape3D.new()
	var col := BoxShape3D.new()
	col.size = size
	shape.shape = col
	shape.position = pos
	body.add_child(shape)

	town_root.add_child(body)

func _spawn_landmarks() -> void:
	var points = [
		{"name": LANDMARKS[0], "pos": Vector3(city_size_x * 0.5, 0.4, city_size_z * 0.5), "color": Color(0.45, 0.9, 1.0)},
		{"name": LANDMARKS[1], "pos": Vector3(city_size_x - road_width * 0.75, 0.4, road_width * 0.75), "color": Color(1.0, 0.58, 0.92)},
		{"name": LANDMARKS[2], "pos": Vector3(road_width * 0.75, 0.4, city_size_z - road_width * 0.75), "color": Color(0.62, 1.0, 0.55)},
	]

	for data in points:
		_create_landmark(data["name"], data["pos"], data["color"])

func _create_landmark(label_text: String, pos: Vector3, color: Color) -> void:
	var area := Area3D.new()
	area.position = pos
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(3.2, 2.0, 3.2)
	shape.shape = box
	area.add_child(shape)
	area.body_entered.connect(_on_landmark_entered.bind(label_text))
	town_root.add_child(area)

	var marker := MeshInstance3D.new()
	var marker_mesh := CylinderMesh.new()
	marker_mesh.top_radius = 0.7
	marker_mesh.bottom_radius = 0.9
	marker_mesh.height = 0.35
	marker.mesh = marker_mesh
	var marker_mat := StandardMaterial3D.new()
	marker_mat.albedo_color = color
	marker_mat.emission_enabled = true
	marker_mat.emission = color
	marker_mat.emission_energy_multiplier = 1.4
	marker.material_override = marker_mat
	marker.position = pos + Vector3(0.0, 0.18, 0.0)
	town_root.add_child(marker)

	var beacon := OmniLight3D.new()
	beacon.light_color = color
	beacon.light_energy = 1.8
	beacon.omni_range = 12.0
	beacon.position = pos + Vector3(0.0, 1.8, 0.0)
	town_root.add_child(beacon)

	var label := Label3D.new()
	label.text = label_text
	label.position = pos + Vector3(0.0, 2.5, 0.0)
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.modulate = color.lightened(0.35)
	label.pixel_size = 0.01
	town_root.add_child(label)

func _on_landmark_entered(body: Node, landmark_name: String) -> void:
	if body.name != "Player":
		return
	if discovered_landmarks.has(landmark_name):
		return

	discovered_landmarks[landmark_name] = true
	if goal_audio:
		goal_audio.play()

	ui_label.text = "Discovered: %s" % landmark_name
	_update_quest_text()

	if discovered_landmarks.size() >= LANDMARKS.size():
		help_label.text = "Night tour complete!\nYou can keep exploring freely."
		ui_label.text = "Neon Village Explorer - Complete"

func _update_quest_text() -> void:
	var found := discovered_landmarks.size()
	if found >= LANDMARKS.size():
		quest_label.text = "Landmarks: %d/%d  |  COMPLETE" % [found, LANDMARKS.size()]
		return

	var remaining := PackedStringArray()
	for landmark in LANDMARKS:
		if not discovered_landmarks.has(landmark):
			remaining.append(landmark)
	quest_label.text = "Landmarks: %d/%d  |  Next: %s" % [found, LANDMARKS.size(), ", ".join(remaining)]

func _reset_player_position() -> void:
	if not player:
		return
	player.position = Vector3(road_width * 0.7, 1.2, road_width * 0.7)
	player.velocity = Vector3.ZERO
