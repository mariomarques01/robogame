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
        bs.inputs["Emission Color"].default_value = (*color, 1)
        bs.inputs["Emission Strength"].default_value = 4
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

# All parts are separate, ready for later bone parenting and animations.
root = bpy.data.objects.new("SCOUT_X_ROOT", None)
bpy.context.collection.objects.link(root)
for obj in bpy.context.scene.objects:
    if obj.type == "MESH":
        world = obj.matrix_world.copy()
        obj.parent = root
        obj.matrix_world = world
# GLB is exported now as a static first prototype; rigging comes after approval.
bpy.ops.wm.save_as_mainfile(filepath=str(out / "scout_x.blend"))
bpy.ops.export_scene.gltf(filepath=str(out / "scout_x.glb"), export_format="GLB")
print("SCOUT-X exported to", out / "scout_x.glb")
