extends Resource
class_name HyperfoldSaveData

# 하이퍼폴드 진행도를 저장하는 Resource.
# ResourceSaver/Loader로 user:// 경로에 .tres 형태로 저장한다.
@export var unlocked_level: int = 1
@export var endless_unlocked: bool = false
@export var total_wins: int = 0
@export var best_finish_time: float = 999.0
