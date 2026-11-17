"""Bake Blender Bullet spring constraints as a motion reference, not portrait geometry."""
import bpy, math, json
from pathlib import Path
HERE=Path(__file__).resolve().parent
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.frame_start=1;scene.frame_end=300;scene.render.fps=60;scene.gravity=(0,0,0)
objects=[]
for side in range(2):
    x=side*1.5-.75
    bpy.ops.mesh.primitive_cube_add(size=.1,location=(x,0,1));anchor=bpy.context.object;anchor.name='Fixed support '+str(side)
    bpy.ops.rigidbody.object_add();anchor.rigid_body.type='PASSIVE'
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,radius=.45,location=(x,0,0))
    obj=bpy.context.object;obj.name='Spring response '+str(side)
    bpy.ops.rigidbody.object_add();rb=obj.rigid_body;rb.mass=.82 if side==0 else .74;rb.collision_shape='SPHERE';rb.use_deactivation=False;rb.linear_damping=.04;rb.angular_damping=.2
    bpy.ops.object.empty_add(type='ARROWS',location=(x,0,0));joint=bpy.context.object;joint.name='Supported spring '+str(side)
    bpy.ops.rigidbody.constraint_add();c=joint.rigid_body_constraint;c.type='GENERIC_SPRING';c.object1=anchor;c.object2=obj;c.disable_collisions=True
    c.use_limit_lin_x=c.use_limit_lin_y=True;c.limit_lin_x_lower=c.limit_lin_x_upper=c.limit_lin_y_lower=c.limit_lin_y_upper=0
    c.use_limit_lin_z=True;c.limit_lin_z_lower=-.4;c.limit_lin_z_upper=.4
    c.use_spring_z=True;c.spring_stiffness_z=145 if side==0 else 155;c.spring_damping_z=.28
    for axis in ['x','y','z']:
        setattr(c,'use_limit_ang_'+axis,True);setattr(c,'limit_ang_'+axis+'_lower',0);setattr(c,'limit_ang_'+axis+'_upper',0)
    for frame,z in [(1,0),(40,0),(45,-.18),(46,-.18),(300,-.18)]:obj.location.z=z;obj.keyframe_insert(data_path='location',frame=frame)
    for frame,value in [(1,True),(45,True),(46,False)]:rb.kinematic=value;obj.keyframe_insert(data_path='rigid_body.kinematic',frame=frame)
    for curve in obj.animation_data.action.fcurves:
        for point in curve.keyframe_points:point.interpolation='CONSTANT' if 'kinematic' in curve.data_path else 'LINEAR'
    obj['purpose']='Supported spring response reference only; not a reconstruction of the portrait.';objects.append(obj)
scene.rigidbody_world.substeps_per_frame=8;scene.rigidbody_world.solver_iterations=30;scene.rigidbody_world.point_cache.frame_end=300
samples=[[],[]]
for frame in range(1,301):
    scene.frame_set(frame);dg=bpy.context.evaluated_depsgraph_get()
    if frame>=40:
        for side,obj in enumerate(objects):samples[side].append(obj.evaluated_get(dg).matrix_world.translation.z)
curves=[]
for values in samples:
    maximum=max(abs(v) for v in values)
    if maximum<.01:raise RuntimeError('Spring simulation did not move')
    normalized=[-v/maximum for v in values]
    for i in range(len(normalized)-18,len(normalized)):
        t=(i-(len(normalized)-18))/17;normalized[i]*=.5+.5*math.cos(math.pi*t)
    curves.append([round(v,7) for v in normalized])
(HERE/'blender-response.json').write_text(json.dumps({'tool':'Blender '+bpy.app.version_string,'method':'Bullet rigid-body spring constraints with fixed support; kinematic displacement released into simulation; evaluated proxy centers','fps':60,'startFrame':40,'rawDisplacements':samples,'curves':curves,'tailFadeSeconds':.3},indent=2))
scene.frame_set(40);bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'Aurelia-motion-reference.blend'))
print('BAKE_OK',[(min(v),max(v)) for v in samples])
