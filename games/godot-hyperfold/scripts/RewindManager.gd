extends Node
class_name RewindManager

# rewind 시작 시: 목표 스냅샷 + 과거 경로(플레이어/외계인) 전달.
signal rewind_started(target_snapshot: Dictionary, player_path: PackedVector2Array, alien_path: PackedVector2Array)
# rewind 미리보기가 끝나고 실제 상태 복원 시점.
signal rewind_apply(target_snapshot: Dictionary)
# rewind 완전 종료 시점.
signal rewind_finished

# 프레임 상태 버퍼.
# 요구사항: 0.1초 간격 저장 + 최대 300프레임(약 30초)을 지원.
class StateBuffer:
	var max_frames: int
	var frames: Array[Dictionary] = []

	func _init(max_count: int) -> void:
		max_frames = max_count

	func push(state: Dictionary) -> void:
		frames.append(state.duplicate(true))
		if frames.size() > max_frames:
			frames.pop_front()

	func is_empty() -> bool:
		return frames.is_empty()

	func get_snapshot_seconds_back(seconds: float, sample_interval: float) -> Dictionary:
		if frames.is_empty():
			return {}

		var steps_back := int(round(seconds / max(sample_interval, 0.01)))
		var idx := max(0, frames.size() - 1 - steps_back)
		return frames[idx].duplicate(true)

	func extract_player_path() -> PackedVector2Array:
		var out := PackedVector2Array()
		for f in frames:
			if not f.has("player"):
				continue
			var p: Dictionary = f["player"]
			if p.has("position"):
				out.append(p["position"])
		return out

	func extract_first_alien_path() -> PackedVector2Array:
		var out := PackedVector2Array()
		for f in frames:
			if not f.has("aliens"):
				continue
			var aliens: Array = f["aliens"]
			if aliens.is_empty():
				continue
			var a: Dictionary = aliens[0]
			if a.has("position"):
				out.append(a["position"])
		return out

@export var sample_interval: float = 0.1
@export var max_frames: int = 300
@export var rewind_seconds: float = 10.0
@export var preview_duration: float = 1.0

var _buffer: StateBuffer
var _sample_accum: float = 0.0
var _rewinding: bool = false
var _preview_left: float = 0.0
var _target_snapshot: Dictionary = {}

func _ready() -> void:
	_buffer = StateBuffer.new(max_frames)

func is_rewinding() -> bool:
	return _rewinding

func can_rewind() -> bool:
	return (not _rewinding) and (not _buffer.is_empty())

func clear_buffer() -> void:
	_buffer.frames.clear()
	_sample_accum = 0.0

func record_state(delta: float, state: Dictionary) -> void:
	# rewind 중에는 과거 버퍼를 고정한다.
	if _rewinding:
		return

	_sample_accum += delta
	if _sample_accum < sample_interval:
		return

	_sample_accum = 0.0
	_buffer.push(state)

func request_rewind() -> bool:
	# 이미 rewind 중이거나 저장 데이터가 부족하면 실패.
	if _rewinding or _buffer.is_empty():
		return false

	_target_snapshot = _buffer.get_snapshot_seconds_back(rewind_seconds, sample_interval)
	if _target_snapshot.is_empty():
		return false

	_rewinding = true
	_preview_left = preview_duration

	# 미리보기용 경로를 함께 전달.
	var player_path := _buffer.extract_player_path()
	var alien_path := _buffer.extract_first_alien_path()
	rewind_started.emit(_target_snapshot, player_path, alien_path)
	return true

func _process(delta: float) -> void:
	if not _rewinding:
		return

	_preview_left -= delta
	if _preview_left > 0.0:
		return

	# 미리보기 종료 -> 실제 복원 적용.
	rewind_apply.emit(_target_snapshot)
	_rewinding = false
	_preview_left = 0.0
	rewind_finished.emit()
