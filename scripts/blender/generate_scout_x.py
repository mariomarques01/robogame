"""Generate ROBO ARENA SCOUT-X in Blender and export a web-ready GLB.
Run: blender --background --python scripts/blender/generate_scout_x.py
"""
import bpy
from pathlib import Path

out = Path.cwd() / "public" / "models"
out.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

def mat(name, color, metal=0.3, emissive=False):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value = (*color, 1)
    bs.inputs["Metallic"].default_value = metal
    bs.inputs["Roughness"].default_value = 0.3
    if emissive:
        color_input = bs.inputs.get("Emission Color") or bs.inputs.get("Emission")
        strength_input = bs.inputs.get("Emission Strength")
        if color_input: color_input.default_value = (*color, 1)
        if strength_input: strength_input.default_value = 4
    return m

white = mat("SCOUT Ceramic White", (0.82, 0.89, 0.96))
blue = mat("SCOUT Electric Blue", (0.025, 0.24, 0.80), 0.6)
dark = mat("SCOUT Graphite", (0.02, 0.035, 0.065), 0.6)
visor = mat("SCOUT Black Visor", (0.005, 0.013, 0.027), 0.2)
glow = mat("SCOUT Cyan Eyes", (0.01, 0.7, 1.0), 0, True)
metal = mat("SCOUT Steel", (0.28, 0.36, 0.42), 0.8)

def box(name, pos, size, material, bevel=0.02):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    if bevel:
        modifier = obj.modifiers.new("Rounded edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 3
        obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return obj

def ball(name, pos, scale, material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, location=pos)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(material)
    return obj

# Face points toward negative Y; floor is Z=0; height about 1.4m.
box("Torso", (0,0,.77), (.39,.28,.36), white, .07)
box("Chest armor", (0,-.16,.81), (.26,.045,.18), blue)
box("Chest light", (0,-.19,.83), (.06,.025,.07), glow)
box("Hips", (0,0,.54), (.29,.23,.15), dark)
box("Head shell", (0,-.015,1.15), (.65,.41,.47), white, .10)
box("Blue face trim", (0,-.23,1.17), (.56,.05,.34), blue, .07)
box("Black face screen", (0,-.265,1.17), (.48,.038,.26), visor, .06)
for label, sign in (("L",-1),("R",1)):
    ball("Eye "+label, (sign*.118,-.296,1.19), (.052,.015,.047), glow)
    box("Ear "+label, (sign*.33,0,1.15), (.07,.20,.18), blue)
    ball("Shoulder joint "+label, (sign*.295,0,.87), (.11,.11,.11), dark)
    box("Shoulder "+label, (sign*.34,0,.90), (.18,.26,.18), blue, .05)
    box("Upper arm "+label, (sign*.37,0,.72), (.14,.16,.19), white)
    ball("Elbow "+label, (sign*.38,0,.61), (.075,.075,.075), metal)
    box("Forearm "+label, (sign*.40,0,.51), (.18,.20,.19), white, .04)
    box("Forearm trim "+label, (sign*.40,-.115,.52), (.13,.03,.10), blue)
    ball("Fist "+label, (sign*.40,-.01,.38), (.09,.09,.08), dark)
    for i in range(3):
        box("Finger "+label+str(i), (sign*.40+(i-1)*.05,-.09,.35),
            (.035,.07,.07), white, .01)
    ball("Hip "+label, (sign*.15,0,.47), (.09,.08,.08), dark)
    box("Thigh "+label, (sign*.15,0,.36), (.17,.20,.23), white)
    box("Thigh armor "+label, (sign*.15,-.115,.365), (.12,.027,.14), blue)
    ball("Knee "+label, (sign*.15,0,.24), (.075,.075,.07), dark)
    box("Shin "+label, (sign*.15,0,.15), (.16,.19,.18), white)
    box("Foot "+label, (sign*.15,-.085,.055), (.21,.30,.11), blue, .035)

# Hierarchical articulated parts, ready for GLB animations.
root = bpy.data.objects.new("SCOUT_X_ROOT", None)
bpy.context.collection.objects.link(root)
for obj in bpy.context.scene.objects:
    if obj.type == "MESH":
        world = obj.matrix_world.copy()
        obj.parent = root
        obj.matrix_world = world
# Articulated limbs: pivot empties with NLA actions exported as GLB clips.
import math
from mathutils import Matrix
limb_groups = []
for side, sign in (("L", -1), ("R", 1)):
    for kind, pivot_z, prefixes in (
        ("Arm", .79, ("Upper arm", "Elbow", "Forearm", "Fist", "Finger")),
        ("Leg", .47, ("Thigh", "Knee", "Shin", "Foot")),
    ):
        pivot = bpy.data.objects.new(kind + "_" + side, None)
        bpy.context.collection.objects.link(pivot)
        pivot.parent = root
        pivot.location = (sign * (.37 if kind == "Arm" else .15), 0, pivot_z)
        bpy.context.view_layer.update()
        for mesh in list(bpy.context.scene.objects):
            if mesh.type != "MESH" or not mesh.name.endswith(side) and not (kind == "Arm" and mesh.name.startswith("Finger " + side)):
                continue
            if not any(mesh.name.startswith(prefix) for prefix in prefixes):
                continue
            world = mesh.matrix_world.copy()
            mesh.parent = pivot
            mesh.matrix_world = world
        limb_groups.append((pivot, kind, sign))

# Two looping animation tracks, keyed on actual articulated pivot objects.
for pivot, kind, sign in limb_groups:
    for clip_name, amplitude in (("Walk", .36), ("Attack", .65)):
        pivot.rotation_mode = "XYZ"
        for frame in (1, 7, 13, 19, 25):
            phase = (frame - 1) / 24 * 2 * math.pi
            angle = math.sin(phase + (math.pi if sign > 0 else 0)) * amplitude
            pivot.rotation_euler.x = angle * (1 if kind == "Arm" else -1)
            pivot.keyframe_insert(data_path="rotation_euler", frame=frame)
        action = pivot.animation_data.action
        action.name = clip_name + "_" + pivot.name
        track = pivot.animation_data.nla_tracks.new()
        track.name = clip_name
        strip = track.strips.new(clip_name, 1, action)
        strip.action_frame_start = 1
        strip.action_frame_end = 25
        pivot.animation_data.action = None
    pivot.rotation_euler = (0, 0, 0)

# Optimize viewport meshes before export: apply bevels and weighted normals.
for obj in bpy.context.scene.objects:
    if obj.type == "MESH":
        bpy.context.view_layer.objects.active = obj
        for modifier in list(obj.modifiers):
            try:
                bpy.ops.object.modifier_apply(modifier=modifier.name)
            except RuntimeError:
                pass
bpy.context.scene.frame_set(1)

bpy.ops.wm.save_as_mainfile(filepath=str(out / "scout_x.blend"))
bpy.ops.export_scene.gltf(filepath=str(out / "scout_x.glb"), export_format="GLB", export_animations=True, export_nla_strips=True)
print("SCOUT-X exported to", out / "scout_x.glb")
