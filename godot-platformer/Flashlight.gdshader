shader_type canvas_item;

uniform vec2 center = vec2(0.5, 0.5);
uniform float radius = 0.18;
uniform float softness = 0.08;

void fragment() {
    vec2 uv = UV;
    float d = distance(uv, center);
    float alpha = smoothstep(radius, radius + softness, d);
    COLOR = vec4(0.0, 0.0, 0.0, alpha * 0.85);
}
