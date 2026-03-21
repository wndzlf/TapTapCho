extends CanvasLayer

signal layer_slider_changed(layer_id: int)
signal rewind_pressed

@onready var level_value: Label = $TopBar/Stats/LevelValue
@onready var layer_value: Label = $TopBar/Stats/LayerValue
@onready var timer_value: Label = $TopBar/Stats/TimerValue
@onready var rewind_value: Label = $TopBar/Stats/RewindValue
@onready var status_label: Label = $TopBar/StatusLabel
@onready var layer_slider: HSlider = $BottomControls/LayerSlider
@onready var rewind_button: Button = $BottomControls/RewindButton
@onready var center_message: Label = $CenterMessage

@onready var btn_left: Button = $TouchPad/BtnLeft
@onready var btn_right: Button = $TouchPad/BtnRight
@onready var btn_up: Button = $TouchPad/BtnUp
@onready var btn_down: Button = $TouchPad/BtnDown

var _message_left: float = 0.0

func _ready() -> void:
	layer_slider.value_changed.connect(_on_layer_slider_changed)
	rewind_button.pressed.connect(func() -> void:
		rewind_pressed.emit()
	)

	_bind_touch_button(btn_left, "move_left")
	_bind_touch_button(btn_right, "move_right")
	_bind_touch_button(btn_up, "move_up")
	_bind_touch_button(btn_down, "move_down")

func _process(delta: float) -> void:
	if _message_left <= 0.0:
		return
	_message_left -= delta
	if _message_left <= 0.0:
		center_message.text = ""

func _bind_touch_button(button: Button, action: StringName) -> void:
	# 모바일 터치 입력을 키보드 액션으로 강제 매핑한다.
	button.button_down.connect(func() -> void:
		Input.action_press(action)
	)
	button.button_up.connect(func() -> void:
		Input.action_release(action)
	)
	button.mouse_exited.connect(func() -> void:
		if button.button_pressed:
			Input.action_release(action)
	)

func _on_layer_slider_changed(v: float) -> void:
	layer_slider_changed.emit(int(v))

func set_level(level: int, endless: bool) -> void:
	level_value.text = "Lv.%d%s" % [level, " ∞" if endless else ""]

func set_layer(layer_id: int, silent: bool = true) -> void:
	layer_value.text = "W%d" % layer_id
	if silent:
		layer_slider.set_value_no_signal(layer_id)
	else:
		layer_slider.value = layer_id

func set_timer(seconds: float, weapon_spawn_time: float) -> void:
	var marker := ""
	if seconds < weapon_spawn_time:
		marker = " (무기 %0.1fs)" % max(0.0, weapon_spawn_time - seconds)
	timer_value.text = "%0.1fs%s" % [seconds, marker]

func set_rewind_status(ready: bool, rewinding: bool) -> void:
	if rewinding:
		rewind_value.text = "REWINDING"
		rewind_button.text = "Rewinding..."
		rewind_button.disabled = true
		return

	rewind_value.text = "READY" if ready else "CHARGING"
	rewind_button.text = "Rewind (R)"
	rewind_button.disabled = not ready

func set_status(text: String) -> void:
	status_label.text = text

func show_message(text: String, duration: float = 1.6) -> void:
	center_message.text = text
	_message_left = duration
