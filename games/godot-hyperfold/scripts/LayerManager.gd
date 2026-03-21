extends Node
class_name LayerManager

# 레이어 변경 신호.
# old_layer -> new_layer로 바뀔 때 메인/AI/UI가 이 신호를 구독한다.
signal layer_changed(new_layer: int, old_layer: int)

# 레이어 스위치 시각 효과 요청 신호.
# 실제 파티클 재생은 Main에서 처리한다.
signal layer_switch_fx(layer: int)

const LAYER_COUNT := 4

# 레이어 루트가 들어있는 부모 노드 경로.
# 기본적으로 Main/World/Layers 구조를 사용한다.
@export var layers_root_path: NodePath = NodePath("../World/Layers")

# 2D에서 4D(w축) 게이트를 표현하기 위한 포인트 테이블.
# 각 레이어마다 4개 포인트를 두고, from->to 매핑 시 같은 인덱스 포인트를 활용한다.
const GATE_POINTS := {
	0: [Vector2(40, 96), Vector2(320, 96), Vector2(40, 540), Vector2(320, 540)],
	1: [Vector2(70, 124), Vector2(300, 124), Vector2(70, 514), Vector2(300, 514)],
	2: [Vector2(50, 168), Vector2(310, 168), Vector2(50, 486), Vector2(310, 486)],
	3: [Vector2(92, 144), Vector2(270, 144), Vector2(92, 520), Vector2(270, 520)],
}

var active_layer: int = 0
var _layers_root: Node
var _layer_nodes: Array[Node2D] = []

func _ready() -> void:
	_layers_root = get_node_or_null(layers_root_path)
	_collect_layer_nodes()
	# 시작 시 레이어 0만 보이게 적용.
	set_active_layer(0, false)

func _collect_layer_nodes() -> void:
	_layer_nodes.clear()
	if _layers_root == null:
		return

	for i in range(LAYER_COUNT):
		var n := _layers_root.get_node_or_null("Layer%d" % i)
		if n is Node2D:
			_layer_nodes.append(n)

func cycle_layer() -> void:
	# W 입력 시 0->1->2->3->0 순환.
	set_active_layer((active_layer + 1) % LAYER_COUNT, true)

func set_active_layer(new_layer: int, emit_fx: bool = true) -> void:
	var clamped := clampi(new_layer, 0, LAYER_COUNT - 1)
	if clamped == active_layer and _layer_nodes.size() > 0:
		return

	var old_layer := active_layer
	active_layer = clamped
	_update_layer_visibility_and_collision()
	layer_changed.emit(active_layer, old_layer)
	if emit_fx:
		layer_switch_fx.emit(active_layer)

func _update_layer_visibility_and_collision() -> void:
	for i in range(_layer_nodes.size()):
		var layer_node := _layer_nodes[i]
		var enabled := i == active_layer
		layer_node.visible = enabled
		_set_collision_enabled_recursive(layer_node, enabled)

func _set_collision_enabled_recursive(node: Node, enabled: bool) -> void:
	# CollisionShape2D를 직접 disable하고,
	# CollisionObject2D(Area2D/Body2D)는 monitor/monitorable도 같이 맞춘다.
	if node is CollisionShape2D:
		(node as CollisionShape2D).disabled = not enabled

	if node is Area2D:
		var area := node as Area2D
		area.monitorable = enabled
		area.monitoring = enabled

	for child in node.get_children():
		_set_collision_enabled_recursive(child, enabled)

func get_nearest_gate_position(from_layer: int, to_layer: int, from_position: Vector2) -> Vector2:
	# 4D 전환 경로 계산용 간단 게이트 선택.
	# from_layer의 게이트 중 현재 위치에서 가장 가까운 점을 반환한다.
	var from_points: Array = GATE_POINTS.get(from_layer, [])
	if from_points.is_empty():
		return from_position

	var best := from_points[0]
	var best_dist := from_position.distance_squared_to(best)

	for p in from_points:
		var d := from_position.distance_squared_to(p)
		if d < best_dist:
			best_dist = d
			best = p

	# to_layer 인덱스도 일부 반영해서 레이어별 경로가 살짝 다르게 보이게 오프셋을 준다.
	var drift := float(to_layer - from_layer) * 6.0
	return best + Vector2(drift, -drift * 0.5)

func apply_entity_visibility(entity: Node2D, entity_layer: int, ghost_mode: bool = false) -> void:
	# 현재 활성 레이어와 엔티티 레이어가 다르면 숨긴다.
	# 단, rewind 고스트 모드면 반투명으로 항상 보여준다.
	if ghost_mode:
		entity.visible = true
		entity.modulate.a = 0.45
		return

	entity.visible = entity_layer == active_layer
	entity.modulate.a = 1.0

func get_layer_node(layer: int) -> Node2D:
	if layer < 0 or layer >= _layer_nodes.size():
		return null
	return _layer_nodes[layer]

func get_layer_obstacles_node(layer: int) -> Node2D:
	var n := get_layer_node(layer)
	if n == null:
		return null
	return n.get_node_or_null("Obstacles")

func get_layer_items_node(layer: int) -> Node2D:
	var n := get_layer_node(layer)
	if n == null:
		return null
	return n.get_node_or_null("Items")
