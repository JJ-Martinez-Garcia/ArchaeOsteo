"""Generate the adult-female GLB package from the adult-male package in Blender.

Run this file from Blender's Scripting workspace or Python Console. The male
package is read-only; generated files replace only public/models/adult_female.
"""
import json
import os
import shutil
import struct
import bpy

PROJECT = r"C:\Users\USER\Documents\ChatGPT\Arqueoosteologia 3d"
MODELS = os.path.join(PROJECT, "public", "models")
SOURCE = os.path.join(MODELS, "adult_male")
MANIFEST_PATH = os.path.join(MODELS, "manifest.json")
GENERATOR_VERSION = "blender-adaptation-1.0.0"

SCALE_BY_ID = {
    "skull": (1.0, 0.98, 1.0),
    "mandible": (1.02, 0.98, 1.0),
}

def scale_for(bone_id, profile):
    if bone_id in SCALE_BY_ID:
        base = SCALE_BY_ID[bone_id]
    elif "coxal" in bone_id:
        base = (1.18, 0.96, 1.08)
    elif "clavicle" in bone_id or "scapula" in bone_id:
        base = (0.92, 1.0, 0.96)
    elif "femur" in bone_id:
        base = (0.96, 1.02, 0.96)
    elif "tibia" in bone_id or "fibula" in bone_id:
        base = (0.95, 1.01, 0.95)
    elif any(part in bone_id for part in ("humerus", "radius", "ulna")):
        base = (0.95, 1.0, 0.95)
    elif any(part in bone_id for part in ("metacarp", "digit", "carpal")):
        base = (0.94, 1.0, 0.94)
    elif any(part in bone_id for part in ("metatars", "toe", "tarsal")):
        base = (0.96, 1.0, 0.96)
    elif bone_id.startswith("rib_") or "_rib_" in bone_id:
        base = (0.96, 1.0, 0.94)
    else:
        base = (1.0, 1.0, 1.0)
    age = {"adult_female": (1.0, 1.0, 1.0), "infant": (0.78, 0.78, 0.78), "neonate": (0.62, 0.62, 0.62)}[profile]
    if profile == "infant" and bone_id == "skull": age = (1.0, 1.16, 1.0)
    if profile == "neonate" and bone_id == "skull": age = (1.0, 1.34, 1.0)
    if profile == "infant" and bone_id == "mandible": age = (1.0, 1.08, 1.0)
    if profile == "neonate" and bone_id == "mandible": age = (1.0, 1.22, 1.0)
    return tuple(base[i] * age[i] for i in range(3))

def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

def add_metadata(glb_path, bone_id, profile):
    """Add app metadata to Blender's exported root node without changing geometry."""
    with open(glb_path, "rb") as handle:
        blob = handle.read()
    if blob[:4] != b"glTF":
        raise RuntimeError(f"Not a GLB file: {glb_path}")
    json_length = struct.unpack_from("<I", blob, 12)[0]
    json_start = 20
    json_end = json_start + json_length
    document = json.loads(blob[json_start:json_end].decode("utf-8"))
    root = next((node for node in document.get("nodes", []) if node.get("name") == bone_id), None)
    if root is None:
        raise RuntimeError(f"Missing root node {bone_id} in {glb_path}")
    root["extras"] = {
        "generated": True,
        "profileId": profile,
        "version": GENERATOR_VERSION,
        "license": "CC BY-SA 4.0",
        "adapted_from": "adult_male",
        "adaptation": "Visual proportional adaptation exported from the adult-male GLB in Blender; not a validated specimen or morphometric model.",
    }
    encoded = json.dumps(document, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    encoded += b" " * ((4 - len(encoded) % 4) % 4)
    json_chunk = struct.pack("<I4s", len(encoded), b"JSON") + encoded
    rest = blob[json_end:]
    new_blob = blob[:8] + struct.pack("<I", 12 + len(json_chunk) + len(rest)) + json_chunk + rest
    with open(glb_path, "wb") as handle:
        handle.write(new_blob)

def export_one(bone_id, profile):
    source_path = os.path.join(SOURCE, bone_id + ".glb")
    target_path = os.path.join(MODELS, profile, bone_id + ".glb")
    temporary_path = target_path + ".tmp.glb"
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=source_path)
    roots = [obj for obj in bpy.context.scene.objects if obj.parent is None]
    scale = scale_for(bone_id, profile)
    for root in roots:
        root.scale = tuple(root.scale[i] * scale[i] for i in range(3))
    # Export the complete imported hierarchy. Selecting only an Empty root can
    # omit the child mesh for small bones in Blender's glTF exporter.
    bpy.ops.object.select_all(action="SELECT")
    if roots:
        bpy.context.view_layer.objects.active = roots[0]
    bpy.ops.export_scene.gltf(
        filepath=temporary_path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_animations=False,
    )
    add_metadata(temporary_path, bone_id, profile)
    if os.path.exists(target_path):
        os.remove(target_path)
    os.rename(temporary_path, target_path)

with open(MANIFEST_PATH, "r", encoding="utf-8") as handle:
    manifest = json.load(handle)
bone_ids = manifest["profiles"]["adult_male"]["asset_ids"]
profiles = ("adult_female", "infant", "neonate")
for profile in profiles:
    os.makedirs(os.path.join(MODELS, profile), exist_ok=True)
    for index, bone_id in enumerate(bone_ids, start=1):
        export_one(bone_id, profile)
        print(f"Blender {profile} GLB {index}/{len(bone_ids)}: {bone_id}")

clear_scene()
print(f"Blender profile packages complete: {len(profiles)} x {len(bone_ids)} GLB files")
