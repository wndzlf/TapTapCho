extends CanvasLayer

const BEST_PATH := "user://air_striker_best.save"

var best := 0

@onready var score_value: Label = $TopBar/ScoreValue
@onready var lives_value: Label = $TopBar/LivesValue
@onready var best_value: Label = $TopBar/BestValue
@onready var message_label: Label = $Message
@onready var flash: ColorRect = $Flash

func _ready() -> void:
	load_best()

func set_score(v: int) -> void:
	score_value.text = str(v)

func set_lives(v: int) -> void:
	lives_value.text = str(v)

func set_best(v: int) -> void:
	if v <= best:
		return
	best = v
	best_value.text = str(best)
	var file := FileAccess.open(BEST_PATH, FileAccess.WRITE)
	if file:
		file.store_32(best)

func load_best() -> void:
	if FileAccess.file_exists(BEST_PATH):
		var file := FileAccess.open(BEST_PATH, FileAccess.READ)
		if file:
			best = file.get_32()
	best_value.text = str(best)

func clear_message() -> void:
	message_label.text = ""

func show_message(v: String) -> void:
	message_label.text = v

func flash_hit(color: Color, alpha: float) -> void:
	flash.color = Color(color.r, color.g, color.b, alpha)
